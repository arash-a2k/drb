#!/usr/bin/env node

import http from 'http';
import { webhookCallback } from 'grammy';
import { createTelegramBot } from './bot.ts';
import { loadConfig } from './config.ts';
import { logger } from './logger.ts';

async function main(): Promise<void> {
  const config = loadConfig();
  const bot = createTelegramBot(config);

  const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined;

  if (port) {
    let handler: ((req: http.IncomingMessage, res: http.ServerResponse) => void) | undefined;

    if (config.webhookUrl) {
      const secretToken = config.telegramWebhookSecret;
      if (!secretToken || secretToken.length < 32) {
        throw new Error('FATAL: Webhook mode cannot start without TELEGRAM_WEBHOOK_SECRET (minimum 32 characters)');
      }

      logger.info(`Starting Telegram bot in webhook mode on port ${port}`);

      // Register webhook with Telegram and verify success
      const webhookRegistered = await bot.api.setWebhook(config.webhookUrl, {
        secret_token: secretToken,
      });
      if (!webhookRegistered) {
        throw new Error(`FATAL: Telegram setWebhook returned false for URL: ${config.webhookUrl}`);
      }

      handler = webhookCallback(bot, 'http', {
        secretToken,
      });
    } else {
      logger.info(`Starting Telegram bot in bootstrap mode on port ${port} (waiting for WEBHOOK_URL)`);
    }

    const server = http.createServer(async (req, res) => {
      // Health check endpoint
      if (req.method === 'GET' && (req.url === '/' || req.url === '/healthz')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          service: 'drb-telegram-bot',
          webhookConfigured: Boolean(config.webhookUrl),
        }));
        return;
      }

      if (handler) {
        return handler(req, res);
      }

      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Webhook URL not configured' }));
    });

    server.listen(port, () => {
      logger.info(`Telegram service active on port ${port}`);
    });
  } else {
    logger.info('Starting Telegram bot in long-polling mode');
    await bot.start({
      onStart: (botInfo) => {
        logger.info('Telegram bot started (long-polling)', {
          username: botInfo.username,
        });
      },
    });
  }
}

main().catch((error: unknown) => {
  logger.error('Failed to start Telegram bot', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
