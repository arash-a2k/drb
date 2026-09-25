import { Bot, InlineKeyboard, type Context } from 'grammy';
import type { BotConfig } from './config.ts';
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

export type UserSession = {
  title?: string;
  text?: string;
  photoFileIds: string[];
  activeSlug?: string;
  activeBranch?: string;
};

const userSessions = new Map<number, UserSession>();

function getOrCreateSession(userId: number): UserSession {
  let session = userSessions.get(userId);
  if (!session) {
    session = { photoFileIds: [] };
    userSessions.set(userId, session);
  }
  return session;
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

function buildIntakeCard(session: UserSession): { text: string; keyboard: InlineKeyboard } {
  const titleText = session.title ? `📝 *Title:* ${session.title}` : '📝 *Title:* _(Send text to set)_';
  const photoText = `📸 *Photos:* ${session.photoFileIds.length} uploaded`;

  const text = [
    '📄 *Page Draft Session*',
    '',
    titleText,
    photoText,
    '',
    session.title
      ? 'Tap *Generate Preview* when ready, or send more text / photos.'
      : 'Send your page description or treatment details to begin.',
  ].join('\n');

  const keyboard = new InlineKeyboard();
  if (session.title || session.text) {
    keyboard.text('🚀 Generate Preview', 'action:generate').row();
  }
  keyboard.text('❌ Clear Draft', 'action:cancel');

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
      userSessions.set(userId, { photoFileIds: [] });
    }
    await ctx.reply('New page draft started. Send your treatment notes, title, and photos.');
  });

  bot.command('cancel', async (ctx) => {
    const userId = getUserId(ctx);
    if (userId) {
      userSessions.delete(userId);
    }
    await ctx.reply('Current draft session cleared. Send text or photos anytime to start anew.');
  });

  bot.command('status', async (ctx) => {
    const userId = getUserId(ctx);
    const chatId = ctx.chat ? String(ctx.chat.id) : undefined;
    const session = userId ? userSessions.get(userId) : undefined;

    // 1. If in-memory session has a draft being actively composed, show draft card
    if (session && (session.title || session.photoFileIds.length)) {
      const card = buildIntakeCard(session);
      await ctx.reply(card.text, { reply_markup: card.keyboard, parse_mode: 'Markdown' });
      return;
    }

    // 2. Otherwise query GitHub API for active PR (survives Cloud Run restarts)
    const activePr = await findActiveBotPR(config, {
      slug: session?.activeSlug,
      chatId,
    });

    if (activePr) {
      const slug = extractSlugFromPR(activePr);
      if (session) {
        session.activeSlug = slug;
        session.activeBranch = activePr.head?.ref;
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
    const session = userId ? getOrCreateSession(userId) : undefined;
    const feedback = ctx.match?.trim();

    if (!feedback) {
      await ctx.reply('Usage: `/revise <your revision notes>`\nExample: `/revise make the introduction shorter and emphasize ceramic quality`', {
        parse_mode: 'Markdown',
      });
      return;
    }

    const chatId = String(ctx.chat?.id);

    // If activeSlug or activeBranch missing (e.g. Cloud Run cold start), rehydrate from GitHub PRs
    if (!session?.activeSlug || !session?.activeBranch) {
      const activePr = await findActiveBotPR(config, {
        slug: session?.activeSlug,
        chatId,
      });

      if (activePr) {
        const slug = extractSlugFromPR(activePr);
        if (session) {
          session.activeSlug = slug;
          session.activeBranch = activePr.head?.ref;
        }
      }
    }

    if (!session?.activeSlug || !session?.activeBranch) {
      await ctx.reply('No active preview found to revise. Generate a page first or check /status.');
      return;
    }

    const slug = session.activeSlug;
    const branch = session.activeBranch;

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
    const session = userId ? userSessions.get(userId) : undefined;

    const activePr = await findActiveBotPR(config, {
      slug: session?.activeSlug,
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

  bot.callbackQuery('action:generate', async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = getUserId(ctx);
    const session = userId ? userSessions.get(userId) : undefined;

    if (!session || (!session.title && !session.text)) {
      await ctx.reply('Please send page text or title before generating.');
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

    const chatId = String(ctx.chat?.id);
    const title = session.title || 'Dental Service';
    const text = session.text || session.title || '';
    const photoFileIds = session.photoFileIds.join(',');

    const computedSlug = session.activeSlug || title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || `page-${Date.now()}`;
    session.activeSlug = computedSlug;

    try {
      await dispatchWorkflow(config, 'bot-create-page.yml', {
        chat_id: chatId,
        title,
        text,
        photo_file_ids: photoFileIds,
        slug: computedSlug,
      });

      await ctx.reply(
        `⏳ *Job started!* Building your page for *${title}* and deploying the preview...\nTakes ~90 seconds. You will receive the preview link here once ready.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error('Failed to dispatch create-page workflow', { error: err });
      await ctx.reply('❌ Failed to start page generation. Please try again later or contact an administrator.');
    }
  });

  bot.callbackQuery('action:cancel', async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = getUserId(ctx);
    if (userId) {
      userSessions.delete(userId);
    }
    await ctx.reply('Draft session cleared.');
  });

  // Handle photos
  bot.on('message:photo', async (ctx) => {
    const userId = getUserId(ctx);
    if (!userId) return;

    const session = getOrCreateSession(userId);
    const photos = ctx.message.photo;
    const highestResPhoto = photos[photos.length - 1];

    if (highestResPhoto) {
      if (session.photoFileIds.length >= 10) {
        await ctx.reply('Maximum 10 photos per page reached.');
        return;
      }
      session.photoFileIds.push(highestResPhoto.file_id);
    }

    if (ctx.message.caption && !session.text) {
      const caption = ctx.message.caption.trim();
      const lines = caption.split('\n').filter(Boolean);
      session.title = lines[0];
      session.text = caption;
    }

    const card = buildIntakeCard(session);
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

    const session = getOrCreateSession(userId);
    const lines = text.split('\n').filter(Boolean);
    session.title = lines[0];
    session.text = text;

    const card = buildIntakeCard(session);
    await ctx.reply(card.text, { reply_markup: card.keyboard, parse_mode: 'Markdown' });
  });

  bot.catch((error) => {
    logger.error('Telegram bot error', {
      error: error.error instanceof Error ? error.error.message : String(error.error),
    });
  });

  return bot;
}
