import type { BotConfig } from './config.ts';
import { getGitHubDispatchToken } from './github-auth.ts';
import { logger } from './logger.ts';

export type GitHubPR = {
  number: number;
  title: string;
  body: string;
  html_url: string;
  node_id: string;
  draft: boolean;
  head: {
    ref: string;
    sha?: string;
  };
  updated_at: string;
};

export function extractSlugFromPR(pr: GitHubPR): string {
  if (pr.head?.ref?.startsWith('bot/page-')) {
    return pr.head.ref.slice('bot/page-'.length);
  }
  const match = pr.body?.match(/- \*\*Slug:\*\* `([^`]+)`/);
  if (match?.[1]) {
    return match[1];
  }
  return '';
}

export async function getOpenBotPRs(config: BotConfig): Promise<GitHubPR[]> {
  try {
    const token = await getGitHubDispatchToken(config);
    const repo = config.githubRepo || 'arash-a2k/drb';
    const url = `https://api.github.com/repos/${repo}/pulls?state=open&sort=updated&direction=desc&per_page=30`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      logger.warn('Failed to fetch open PRs from GitHub', { status: res.status, error: err });
      return [];
    }

    const prs = (await res.json()) as GitHubPR[];
    return prs.filter((pr) => pr.head?.ref?.startsWith('bot/page-'));
  } catch (error) {
    logger.warn('Error fetching open bot PRs', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function findActiveBotPR(
  config: BotConfig,
  options: { slug?: string; chatId?: string } = {},
): Promise<GitHubPR | null> {
  const prs = await getOpenBotPRs(config);
  if (!prs.length) {
    return null;
  }

  // 1. If slug is given, look for exact slug match
  if (options.slug) {
    const slugMatch = prs.find(
      (pr) => pr.head?.ref === `bot/page-${options.slug}` || extractSlugFromPR(pr) === options.slug,
    );
    if (slugMatch) return slugMatch;
  }

  // 2. If chatId is given, check for PR body matching Telegram chat ID
  if (options.chatId) {
    const chatMatch = prs.find((pr) => pr.body?.includes(`Telegram Chat ID: ${options.chatId}`));
    if (chatMatch) return chatMatch;
  }

  // 3. Fallback to the most recently updated bot PR
  return prs[0] || null;
}

export async function addPRComment(
  config: BotConfig,
  prNumber: number,
  comment: string,
): Promise<void> {
  const token = await getGitHubDispatchToken(config);
  const repo = config.githubRepo || 'arash-a2k/drb';
  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: comment }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to post comment on PR #${prNumber} (${res.status}): ${err}`);
  }
}

export async function markPRReadyForReview(
  config: BotConfig,
  prNodeId: string,
): Promise<boolean> {
  try {
    const token = await getGitHubDispatchToken(config);
    const url = 'https://api.github.com/graphql';

    const mutation = `
      mutation MarkReady($id: ID!) {
        markPullRequestReadyForReview(input: { pullRequestId: $id }) {
          pullRequest {
            isDraft
          }
        }
      }
    `;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'drb-telegram-bot',
      },
      body: JSON.stringify({
        query: mutation,
        variables: { id: prNodeId },
      }),
    });

    if (!res.ok) {
      logger.warn('Failed to mark PR ready for review via GraphQL', { status: res.status });
      return false;
    }

    const result = (await res.json()) as { data?: unknown; errors?: unknown[] };
    if (result.errors && result.errors.length) {
      logger.warn('GraphQL error while marking PR ready for review', { errors: result.errors });
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('Error marking PR ready for review', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function getLatestClinicalApproval(
  config: BotConfig,
  prNumber: number,
): Promise<{ approvedSha: string; clinician: string; timestamp: string } | null> {
  try {
    const token = await getGitHubDispatchToken(config);
    const repo = config.githubRepo || 'arash-a2k/drb';
    const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments?per_page=100`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      return null;
    }

    const comments = (await res.json()) as Array<{ body: string; created_at: string }>;
    const approvalComments = comments.filter((c) =>
      c.body?.includes('### 🩺 Clinical Approval via Telegram'),
    );

    if (!approvalComments.length) {
      return null;
    }

    const latest = approvalComments[approvalComments.length - 1];
    const shaMatch = latest.body.match(/- \*\*Approved Commit SHA:\*\* `([a-f0-9]+)`/);
    const clinicianMatch = latest.body.match(/- \*\*Supervising Clinician:\*\* ([^(]+)/);

    if (!shaMatch?.[1]) {
      return null;
    }

    return {
      approvedSha: shaMatch[1].trim(),
      clinician: clinicianMatch ? clinicianMatch[1].trim() : 'Unknown',
      timestamp: latest.created_at,
    };
  } catch (error) {
    logger.warn('Error fetching clinical approval comments', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
