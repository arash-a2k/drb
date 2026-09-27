import { Bot, InlineKeyboard, type Context } from 'grammy';
import type { BotConfig } from './config.ts';
import {
  type UserDraft,
  getDraft,
  saveDraft,
  deleteDraft,
  getUserActiveDraftId,
  setUserActiveDraftId,
} from './draft-store.ts';
import { getGitHubDispatchToken } from './github-auth.ts';
import {
  findActiveBotPR,
  extractSlugFromPR,
  addPRComment,
  markPRReadyForReview,
  getLatestClinicalApproval,
} from './github-pr.ts';
import { logger } from './logger.ts';

const dentistCommands = [
  ['/start', 'Onboarding and authorization check'],
  ['/help', 'List available commands'],
  ['/newpage', 'Start a new page draft session'],
  ['/cancel', 'Clear current draft session'],
  ['/status', 'Show the active draft or job stage'],
  ['/revise', 'Request changes to the preview: /revise <notes>'],
  ['/approve', 'Approve the current preview'],
] as const;

export type UserSession = UserDraft;

async function getOrCreateDraft(config: BotConfig, userId: number, chatId?: string): Promise<UserDraft> {
  const activeId = await getUserActiveDraftId(config.storageBucket, userId);
  if (activeId) {
    const existing = await getDraft(config.storageBucket, activeId);
    if (existing) {
      if (chatId) existing.chatId = chatId;
      return existing;
    }
  }

  const newDraft: UserDraft = {
    draftId: `d-${Date.now().toString(36)}-${userId}`,
    userId,
    chatId,
    photoFileIds: [],
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };
  await saveDraft(config.storageBucket, newDraft);
  await setUserActiveDraftId(config.storageBucket, userId, newDraft.draftId);
  return newDraft;
}

function getUserId(ctx: Context): number | undefined {
  return ctx.from?.id;
}

function getUserLabel(ctx: Context): string {
  const user = ctx.from;
  if (!user) return 'unknown';
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || String(user.id);
}

function isAdmin(ctx: Context, config: BotConfig): boolean {
  const userId = getUserId(ctx);
  return Boolean(userId && config.adminTelegramIds.has(userId));
}

function buildHelpText(): string {
  const lines = [
    'Available commands:',
    ...dentistCommands.map(([command, description]) => `${command} - ${description}`),
  ];
  return lines.join('\n');
}

const MAX_DISPATCHES_PER_DAY = 5;
const userDispatchTimestamps = new Map<number, number[]>();

export function checkAndRecordRateLimit(userId: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const timestamps = (userDispatchTimestamps.get(userId) || []).filter((t) => t > oneDayAgo);

  if (timestamps.length >= MAX_DISPATCHES_PER_DAY) {
    userDispatchTimestamps.set(userId, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  userDispatchTimestamps.set(userId, timestamps);
  return { allowed: true, remaining: MAX_DISPATCHES_PER_DAY - timestamps.length };
}

export async function dispatchWorkflow(
  config: BotConfig,
  workflowFile: string,
  inputs: Record<string, string>,
): Promise<void> {
  const token = await getGitHubDispatchToken(config);
  const repo = config.githubRepo || 'arash-a2k/drb';
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: 'master',
      inputs,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub workflow dispatch failed (${response.status}): ${errorText}`);
  }
}

const formatLabels: Record<string, string> = {
  'content-with-image-grid': '🖼️ Treatment (Grid)',
  'solo-image-content-lines': '🌟 Hero with Sections',
  'single-column': '📝 Single Column',
  'two-column': '👥 Two Column',
  'gallery-only': '📸 Gallery Only',
};

function buildIntakeCard(session: UserSession): { text: string; keyboard: InlineKeyboard } {
  const titleText = session.title ? `📝 *Title:* ${session.title}` : '📝 *Title:* _(Send text to set)_';
  const photoText = `📸 *Photos:* ${session.photoFileIds.length} uploaded`;
  const formatText = `🎨 *Layout:* ${session.pageType ? (formatLabels[session.pageType] || session.pageType) : '⚡ Auto (AI Recommended)'}`;

  const text = [
    '📄 *Page Draft Session*',
    '',
    titleText,
    photoText,
    formatText,
    '',
    session.title
      ? 'Tap *Generate Preview* when ready, or customize layout below.'
      : 'Send your page description or treatment details to begin.',
  ].join('\n');

  const keyboard = new InlineKeyboard();
  if (session.title || session.text) {
    keyboard.text('🚀 Generate Preview', `action:generate:${session.draftId}`).row();
  }
  keyboard
    .text(`🎨 Layout: ${session.pageType ? (formatLabels[session.pageType] || session.pageType) : 'Auto ▾'}`, `action:choose_format:${session.draftId}`)
    .row()
    .text('❌ Clear Draft', `action:cancel:${session.draftId}`);

  return { text, keyboard };
}

export function createTelegramBot(config: BotConfig): Bot {
  const bot = new Bot(config.telegramBotToken);

  bot.use(async (ctx, next) => {
    const userId = getUserId(ctx);
    const chatId = ctx.chat?.id;

    // Check user allowlist
    if (!userId || !config.allowedTelegramIds.has(userId)) {
      logger.warn('Blocked unauthorized Telegram user (silent drop)', {
        telegramUserId: userId,
        chatId,
        username: ctx.from?.username,
      });
      // SILENT DROP: Do NOT reply. Replying consumes compute, leaks bot presence, and allows spam enumeration.
      return;
    }

    // Check chat allowlist if configured
    if (config.allowedChatIds && config.allowedChatIds.size > 0) {
      if (!chatId || !config.allowedChatIds.has(chatId)) {
        logger.warn('Blocked message from unauthorized chat (silent drop)', {
          chatId,
          telegramUserId: userId,
        });
        return;
      }
    }

    logger.info('Accepted Telegram update', {
      telegramUserId: userId,
      chatId,
      username: ctx.from?.username,
      updateId: ctx.update.update_id,
    });
    await next();
  });

  bot.command('start', async (ctx) => {
    await ctx.reply(
      `Welcome ${getUserLabel(ctx)}. Authorization confirmed.\nSend text and photos to start creating a new website page, or use /help to see commands.`
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(buildHelpText());
  });

  bot.command('newpage', async (ctx) => {
    const userId = getUserId(ctx);
    if (userId) {
      const draftId = `d-${Date.now().toString(36)}-${userId}`;
      const newDraft: UserDraft = {
        draftId,
        userId,
        chatId: ctx.chat ? String(ctx.chat.id) : undefined,
        photoFileIds: [],
        status: 'draft',
        updatedAt: new Date().toISOString(),
      };
      await saveDraft(config.storageBucket, newDraft);
      await setUserActiveDraftId(config.storageBucket, userId, draftId);
    }
    await ctx.reply('New page draft started. Send your treatment notes, title, and photos.');
  });

  bot.command('cancel', async (ctx) => {
    const userId = getUserId(ctx);
    if (userId) {
      const activeId = await getUserActiveDraftId(config.storageBucket, userId);
      if (activeId) {
        await deleteDraft(config.storageBucket, activeId);
      }
      await setUserActiveDraftId(config.storageBucket, userId, undefined);
    }
    await ctx.reply('Current draft session cleared. Send text or photos anytime to start anew.');
  });

  bot.command('status', async (ctx) => {
    const userId = getUserId(ctx);
    const chatId = ctx.chat ? String(ctx.chat.id) : undefined;
    const activeId = userId ? await getUserActiveDraftId(config.storageBucket, userId) : undefined;
    const draft = activeId ? await getDraft(config.storageBucket, activeId) : undefined;

    // 1. If persistent draft has content being actively composed, show draft card
    if (draft && (draft.title || draft.photoFileIds.length)) {
      const card = buildIntakeCard(draft);
      await ctx.reply(card.text, { reply_markup: card.keyboard, parse_mode: 'Markdown' });
      return;
    }

    // 2. Otherwise query GitHub API for active PR (survives Cloud Run restarts)
    const activePr = await findActiveBotPR(config, {
      slug: draft?.activeSlug,
      chatId,
    });

    if (activePr) {
      const slug = extractSlugFromPR(activePr);
      if (draft) {
        draft.activeSlug = slug;
        draft.activeBranch = activePr.head?.ref;
        await saveDraft(config.storageBucket, draft);
      }
      const draftStatus = activePr.draft ? '🩺 Clinical Draft (Pending Approval)' : '✅ Ready for Merge';
      const statusText = [
        `📄 *Active Page PR:* #${activePr.number}`,
        `📝 *Slug:* \`${slug}\``,
        `🌿 *Branch:* \`${activePr.head?.ref}\``,
        `📊 *Status:* ${draftStatus}`,
        `🔗 *PR Link:* ${activePr.html_url}`,
        '',
        '_To request changes:_ `/revise <notes>`',
        '_To approve preview:_ `/approve`',
      ].join('\n');
      await ctx.reply(statusText, { parse_mode: 'Markdown' });
      return;
    }

    await ctx.reply('No active draft session or open PR found. Send text or photos to start creating a page.');
  });

  bot.command('revise', async (ctx) => {
    const userId = getUserId(ctx);
    const draft = userId ? await getOrCreateDraft(config, userId, ctx.chat ? String(ctx.chat.id) : undefined) : undefined;
    const feedback = ctx.match?.trim();

    if (!feedback) {
      await ctx.reply('Usage: `/revise <your revision notes>`\nExample: `/revise make the introduction shorter and emphasize ceramic quality`', {
        parse_mode: 'Markdown',
      });
      return;
    }

    const chatId = String(ctx.chat?.id);

    // If activeSlug or activeBranch missing (e.g. Cloud Run cold start), rehydrate from GitHub PRs
    if (!draft?.activeSlug || !draft?.activeBranch) {
      const activePr = await findActiveBotPR(config, {
        slug: draft?.activeSlug,
        chatId,
      });

      if (activePr) {
        const slug = extractSlugFromPR(activePr);
        if (draft) {
          draft.activeSlug = slug;
          draft.activeBranch = activePr.head?.ref;
          await saveDraft(config.storageBucket, draft);
        }
      }
    }

    if (!draft?.activeSlug || !draft?.activeBranch) {
      await ctx.reply('No active preview found to revise. Generate a page first or check /status.');
      return;
    }

    const slug = draft.activeSlug;
    const branch = draft.activeBranch;

    // Finding 1 safeguard: Never allow revision to target master or main
    if (branch === 'master' || branch === 'main') {
      await ctx.reply('⚠️ Cannot revise master/main directly. Revisions must target a bot feature branch.');
      return;
    }

    if (userId) {
      const rateCheck = checkAndRecordRateLimit(userId);
      if (!rateCheck.allowed) {
        await ctx.reply(
          '⚠️ *Daily limit reached:* You have reached the maximum limit of 5 page generations/revisions per 24 hours. Please wait before submitting more requests.',
          { parse_mode: 'Markdown' }
        );
        return;
      }
    }

    try {
      await dispatchWorkflow(
        config,
        'bot-revise-page.yml',
        {
          chat_id: chatId,
          slug,
          branch,
          revision_text: feedback,
        },
      );

      await ctx.reply(`⏳ *Revision submitted!* GitHub Actions is updating preview for \`${slug}\`...`, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      logger.error('Failed to dispatch revision workflow', { error: err });
      await ctx.reply('❌ Failed to submit revision. Please try again later or contact an administrator.');
    }
  });

  bot.command('approve', async (ctx) => {
    const userId = getUserId(ctx);
    const chatId = ctx.chat ? String(ctx.chat.id) : undefined;
    const session = userId ? userSessions.get(userId) : undefined;

    // Rehydrate PR from GitHub if needed
    const activePr = await findActiveBotPR(config, {
      slug: session?.activeSlug,
      chatId,
    });

    if (!activePr) {
      await ctx.reply('No active page PR found to approve. Generate a page first or check /status.');
      return;
    }

    const slug = extractSlugFromPR(activePr);
    const userLabel = getUserLabel(ctx);
    const currentSha = activePr.head?.sha;

    if (!currentSha) {
      await ctx.reply('❌ Unable to determine PR commit SHA. Please try again or approve directly on GitHub.');
      return;
    }

    try {
      // 1. Post clinical approval comment to GitHub PR including the commit SHA
      const comment = [
        `### 🩺 Clinical Approval via Telegram`,
        ``,
        `- **Supervising Clinician:** ${userLabel} (Telegram ID: \`${userId}\`)`,
        `- **Approved Commit SHA:** \`${currentSha}\``,
        `- **Timestamp:** \`${new Date().toISOString()}\``,
        `- **Verification:** Clinical content accuracy and patient privacy requirements confirmed. Ready for merge to production.`,
      ].join('\n');

      await addPRComment(config, activePr.number, comment);

      // 2. Mark PR ready for review if in draft mode
      let markReadySuccess = true;
      if (activePr.draft && activePr.node_id) {
        markReadySuccess = await markPRReadyForReview(config, activePr.node_id);
      }

      logger.info('Clinical approval recorded on GitHub PR', {
        prNumber: activePr.number,
        slug,
        sha: currentSha,
        telegramUserId: userId,
        markReadySuccess,
      });

      if (!markReadySuccess) {
        await ctx.reply(
          `⚠️ *Clinical Approval Recorded on PR #${activePr.number}*, but converting the PR from Draft mode failed on GitHub.\n\nApproved Commit: \`${currentSha.slice(0, 7)}\`\nClinician: ${userLabel}\n\nPlease mark the PR ready for review directly on GitHub: ${activePr.html_url}`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await ctx.reply(
        `✅ *Clinical Approval Recorded!*\n\nPR #${activePr.number} for \`${slug}\` (commit \`${currentSha.slice(0, 7)}\`) has been marked ready for review and approved by ${userLabel}.\n\nA maintainer can now review and merge the PR directly on GitHub: ${activePr.html_url}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error('Failed to record approval on GitHub PR', { error: err });
      await ctx.reply('❌ Failed to record approval on GitHub PR. Please try again later or approve directly on GitHub.');
    }
  });

  bot.command('merge', async (ctx) => {
    const userId = getUserId(ctx);
    const chatId = ctx.chat ? String(ctx.chat.id) : undefined;
    const activeId = userId ? await getUserActiveDraftId(config.storageBucket, userId) : undefined;
    const draft = activeId ? await getDraft(config.storageBucket, activeId) : undefined;

    const activePr = await findActiveBotPR(config, {
      slug: draft?.activeSlug,
      chatId,
    });

    if (activePr) {
      await ctx.reply(
        `ℹ️ *Bot Merge Disabled:* For security, this bot cannot merge pull requests.\n\nA repository maintainer must review and merge PR #${activePr.number} directly on GitHub:\n${activePr.html_url}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        'ℹ️ *Bot Merge Disabled:* The bot is restricted to creating draft pages, pushing revisions, and deploying previews. Production merges must be reviewed and performed directly on GitHub by a maintainer.',
        { parse_mode: 'Markdown' }
      );
    }
  });

  bot.callbackQuery(/^action:generate(?::(.+))?$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = getUserId(ctx);
    const callbackDraftId = ctx.match?.[1];

    let draft: UserDraft | undefined;
    if (callbackDraftId) {
      draft = await getDraft(config.storageBucket, callbackDraftId);
    }
    if (!draft && userId) {
      const activeId = await getUserActiveDraftId(config.storageBucket, userId);
      if (activeId) {
        draft = await getDraft(config.storageBucket, activeId);
      }
    }

    if (!draft || (!draft.title && !draft.text)) {
      await ctx.reply('No active draft found to generate. Send /newpage to start a new draft.');
      return;
    }

    if (userId) {
      const rateCheck = checkAndRecordRateLimit(userId);
      if (!rateCheck.allowed) {
        await ctx.reply(
          '⚠️ *Daily limit reached:* You have reached the maximum limit of 5 page generations/revisions per 24 hours. Please wait before submitting more requests.',
          { parse_mode: 'Markdown' }
        );
        return;
      }
    }

    const chatId = draft.chatId || String(ctx.chat?.id);
    const title = draft.title || 'Dental Service';
    const text = draft.text || draft.title || '';
    const photoFileIds = draft.photoFileIds.join(',');

    const computedSlug = draft.activeSlug || title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || `page-${Date.now()}`;
    draft.activeSlug = computedSlug;
    draft.status = 'dispatching';
    await saveDraft(config.storageBucket, draft);

    try {
      await dispatchWorkflow(config, 'bot-create-page.yml', {
        chat_id: chatId,
        title,
        text,
        photo_file_ids: photoFileIds,
        slug: computedSlug,
        page_type: draft.pageType || '',
      });

      draft.status = 'dispatched';
      draft.lastDispatchedAt = new Date().toISOString();
      await saveDraft(config.storageBucket, draft);

      const rerunKeyboard = new InlineKeyboard()
        .text('🔄 Re-run Preview', `action:generate:${draft.draftId}`);

      await ctx.reply(
        `⏳ *Job started!* Building your page for *${title}* and deploying the preview...\nTakes ~90 seconds. You will receive the preview link here once ready.`,
        { reply_markup: rerunKeyboard, parse_mode: 'Markdown' }
      );
    } catch (err) {
      draft.status = 'failed';
      await saveDraft(config.storageBucket, draft);
      logger.error('Failed to dispatch create-page workflow', { error: err });
      const retryKeyboard = new InlineKeyboard()
        .text('🔄 Retry Generate Preview', `action:generate:${draft.draftId}`);
      await ctx.reply('❌ Failed to start page generation. You can tap Retry below or try again later.', {
        reply_markup: retryKeyboard,
      });
    }
  });

  bot.callbackQuery(/^action:choose_format:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const draftId = ctx.match[1];
    const draft = await getDraft(config.storageBucket, draftId);
    if (!draft) {
      await ctx.reply('Draft not found. Send /newpage to start.');
      return;
    }

    const keyboard = new InlineKeyboard()
      .text('⚡ Auto (AI Chooses)', `action:set_format:${draftId}:auto`).row()
      .text('🖼️ Treatment with Gallery', `action:set_format:${draftId}:content-with-image-grid`).row()
      .text('🌟 Hero with Sections', `action:set_format:${draftId}:solo-image-content-lines`).row()
      .text('📝 Single Column Article', `action:set_format:${draftId}:single-column`).row()
      .text('👥 Two Column Spotlight', `action:set_format:${draftId}:two-column`).row()
      .text('📸 Gallery Only', `action:set_format:${draftId}:gallery-only`).row()
      .text('« Back to Summary', `action:back_to_card:${draftId}`);

    await ctx.editMessageText(
      '🎨 *Select Page Layout Format*\n\n' +
      '• *Auto*: AI selects layout automatically based on content\n' +
      '• *Treatment with Gallery*: Full clinical treatment + image grid\n' +
      '• *Hero with Sections*: Top hero banner + sections\n' +
      '• *Single Column*: Clean text & FAQ article\n' +
      '• *Two Column*: Doctor / clinic intro spotlight\n' +
      '• *Gallery Only*: Before/after portfolio showcase',
      { reply_markup: keyboard, parse_mode: 'Markdown' }
    );
  });

  bot.callbackQuery(/^action:set_format:(.+?):(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const draftId = ctx.match[1];
    const format = ctx.match[2];
    const draft = await getDraft(config.storageBucket, draftId);
    if (!draft) {
      await ctx.reply('Draft not found. Send /newpage to start.');
      return;
    }

    draft.pageType = format === 'auto' ? undefined : format;
    await saveDraft(config.storageBucket, draft);

    const card = buildIntakeCard(draft);
    await ctx.editMessageText(card.text, { reply_markup: card.keyboard, parse_mode: 'Markdown' });
  });

  bot.callbackQuery(/^action:back_to_card:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const draftId = ctx.match[1];
    const draft = await getDraft(config.storageBucket, draftId);
    if (!draft) {
      await ctx.reply('Draft not found. Send /newpage to start.');
      return;
    }
    const card = buildIntakeCard(draft);
    await ctx.editMessageText(card.text, { reply_markup: card.keyboard, parse_mode: 'Markdown' });
  });

  bot.callbackQuery(/^action:cancel(?::(.+))?$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = getUserId(ctx);
    const callbackDraftId = ctx.match?.[1];
    if (callbackDraftId) {
      await deleteDraft(config.storageBucket, callbackDraftId);
    }
    if (userId) {
      const activeId = await getUserActiveDraftId(config.storageBucket, userId);
      if (activeId) {
        await deleteDraft(config.storageBucket, activeId);
      }
      await setUserActiveDraftId(config.storageBucket, userId, undefined);
    }
    await ctx.reply('Draft session cleared.');
  });

  // Handle photos
  bot.on('message:photo', async (ctx) => {
    const userId = getUserId(ctx);
    if (!userId) return;

    const draft = await getOrCreateDraft(config, userId, ctx.chat ? String(ctx.chat.id) : undefined);
    const photos = ctx.message.photo;
    const highestResPhoto = photos[photos.length - 1];

    if (highestResPhoto) {
      if (draft.photoFileIds.length >= 10) {
        await ctx.reply('Maximum 10 photos per page reached.');
        return;
      }
      draft.photoFileIds.push(highestResPhoto.file_id);
    }

    if (ctx.message.caption && !draft.text) {
      const caption = ctx.message.caption.trim();
      const lines = caption.split('\n').filter(Boolean);
      draft.title = lines[0];
      draft.text = caption;
    }

    await saveDraft(config.storageBucket, draft);
    const card = buildIntakeCard(draft);
    await ctx.reply(card.text, { reply_markup: card.keyboard, parse_mode: 'Markdown' });
  });

  // Handle plain text
  bot.on('message:text', async (ctx) => {
    const userId = getUserId(ctx);
    if (!userId) return;

    const text = ctx.message.text.trim();
    if (text.startsWith('/')) {
      // Unrecognized command
      await ctx.reply('Unrecognized command. Use /help to see available commands.');
      return;
    }

    const draft = await getOrCreateDraft(config, userId, ctx.chat ? String(ctx.chat.id) : undefined);
    const lines = text.split('\n').filter(Boolean);
    draft.title = lines[0];
    draft.text = text;

    await saveDraft(config.storageBucket, draft);
    const card = buildIntakeCard(draft);
    await ctx.reply(card.text, { reply_markup: card.keyboard, parse_mode: 'Markdown' });
  });

  bot.catch((error) => {
    logger.error('Telegram bot error', {
      error: error.error instanceof Error ? error.error.message : String(error.error),
    });
  });

  return bot;
}
