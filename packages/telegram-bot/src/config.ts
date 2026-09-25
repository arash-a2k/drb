export type BotConfig = {
  telegramBotToken: string;
  allowedTelegramIds: Set<number>;
  adminTelegramIds: Set<number>;
  allowedChatIds?: Set<number>;
  webhookUrl?: string;
  telegramWebhookSecret?: string;
  githubToken?: string;
  githubAppId?: string;
  githubInstallationId?: string;
  githubPrivateKey?: string;
  githubRepo: string;
};

function parseTelegramIds(raw: string | undefined, envName: string): Set<number> {
  return new Set(
    (raw || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const parsed = Number.parseInt(item, 10);
        if (!Number.isFinite(parsed)) {
          throw new Error(`Invalid Telegram user id in ${envName}: ${item}`);
        }
        return parsed;
      }),
  );
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  const telegramBotToken = env.TELEGRAM_BOT_TOKEN;
  if (!telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  const allowedTelegramIds = parseTelegramIds(env.ALLOWED_TELEGRAM_IDS, 'ALLOWED_TELEGRAM_IDS');
  if (!allowedTelegramIds.size) {
    throw new Error('ALLOWED_TELEGRAM_IDS must include at least one Telegram user id');
  }

  const adminTelegramIds = env.ADMIN_TELEGRAM_IDS
    ? parseTelegramIds(env.ADMIN_TELEGRAM_IDS, 'ADMIN_TELEGRAM_IDS')
    : new Set<number>();
  for (const adminId of adminTelegramIds) {
    if (!allowedTelegramIds.has(adminId)) {
      throw new Error(`ADMIN_TELEGRAM_IDS must be a subset of ALLOWED_TELEGRAM_IDS; missing ${adminId}`);
    }
  }

  const allowedChatIds = env.ALLOWED_CHAT_IDS
    ? parseTelegramIds(env.ALLOWED_CHAT_IDS, 'ALLOWED_CHAT_IDS')
    : undefined;

  const webhookUrl = env.WEBHOOK_URL;
  const telegramWebhookSecret = env.TELEGRAM_WEBHOOK_SECRET;

  // C2: Strict fail-closed verification for webhook mode
  if (webhookUrl) {
    if (!telegramWebhookSecret) {
      throw new Error('TELEGRAM_WEBHOOK_SECRET is mandatory when WEBHOOK_URL is set (prevents unauthenticated webhook forgery)');
    }
    if (telegramWebhookSecret.length < 32) {
      throw new Error(`TELEGRAM_WEBHOOK_SECRET must be at least 32 characters long; received ${telegramWebhookSecret.length}`);
    }
  }

  return {
    telegramBotToken,
    allowedTelegramIds,
    adminTelegramIds,
    allowedChatIds,
    webhookUrl,
    telegramWebhookSecret,
    githubToken: env.GITHUB_TOKEN || env.GH_TOKEN,
    githubAppId: env.GITHUB_APP_ID,
    githubInstallationId: env.GITHUB_INSTALLATION_ID,
    githubPrivateKey: env.GITHUB_APP_PRIVATE_KEY,
    githubRepo: env.GITHUB_REPO || 'arash-a2k/drb',
  };
}
