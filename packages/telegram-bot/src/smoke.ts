#!/usr/bin/env node

import { createTelegramBot, checkAndRecordRateLimit } from './bot.ts';
import { loadConfig } from './config.ts';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const config = loadConfig({
    TELEGRAM_BOT_TOKEN: '123456:test-token',
    ALLOWED_TELEGRAM_IDS: '1001,9001',
    ADMIN_TELEGRAM_IDS: '9001',
    ALLOWED_CHAT_IDS: '-100998877,1001',
  });
  const bot = createTelegramBot(config);

  assert(bot !== undefined, 'bot should be created');
  assert(config.allowedTelegramIds.has(1001), 'allowed Telegram id should be parsed');
  assert(!config.allowedTelegramIds.has(2002), 'unknown Telegram id should be unauthorized');
  assert(config.adminTelegramIds.has(9001), 'admin Telegram id should be parsed');
  assert(config.allowedChatIds?.has(-100998877), 'negative group chat ID should be parsed in allowedChatIds');
  assert(config.allowedChatIds?.has(1001), 'user chat ID should be parsed in allowedChatIds');
  assert(!config.allowedChatIds?.has(12345), 'unknown chat ID should not be in allowedChatIds');

  // Verify extractSlugFromPR
  const { extractSlugFromPR } = await import('./github-pr.ts');
  const mockPr = {
    number: 1,
    title: 'Add page: dental-implants',
    body: 'Automated page creation\n\n- **Slug:** `dental-implants`',
    html_url: 'https://github.com/arash-a2k/drb/pull/1',
    node_id: 'PR_kwDO...',
    draft: true,
    head: { ref: 'bot/page-dental-implants' },
    updated_at: '2026-09-25T12:00:00Z',
  };
  assert(extractSlugFromPR(mockPr) === 'dental-implants', 'slug should be extracted from PR branch');

  // Verify approval comment regex logic
  const mockComment = [
    '### 🩺 Clinical Approval via Telegram',
    '',
    '- **Supervising Clinician:** Dr. Babak Khatayee (Telegram ID: `1001`)',
    '- **Approved Commit SHA:** `abc1234def5678`',
    '- **Timestamp:** `2026-09-25T12:00:00.000Z`',
    '- **Verification:** Clinical content accuracy and patient privacy requirements confirmed.',
  ].join('\n');
  const shaMatch = mockComment.match(/- \*\*Approved Commit SHA:\*\* `([a-f0-9]+)`/);
  assert(shaMatch?.[1] === 'abc1234def5678', 'Approved commit SHA should be extracted from comment');

  // Verify rate limiting allows 5 and blocks 6th
  const testUserId = 99999;
  for (let i = 0; i < 5; i++) {
    const res = checkAndRecordRateLimit(testUserId);
    assert(res.allowed, `dispatch #${i + 1} should be allowed`);
  }
  const blocked = checkAndRecordRateLimit(testUserId);
  assert(!blocked.allowed, '6th dispatch within 24h should be blocked by rate limit');

  console.log('Telegram bot scaffold smoke check passed.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
