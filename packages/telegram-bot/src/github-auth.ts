import crypto from 'crypto';
import type { BotConfig } from './config.ts';

function createGitHubAppJwt(appId: string, privateKeyPem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 600, // 10 minutes maximum for JWT
      iss: appId,
    })
  ).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKeyPem, 'base64url');

  return `${header}.${payload}.${signature}`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getGitHubDispatchToken(config: BotConfig): Promise<string> {
  // If GitHub App credentials are provided, mint an ephemeral installation token
  if (config.githubAppId && config.githubInstallationId && config.githubPrivateKey) {
    const now = Math.floor(Date.now() / 1000);
    // Reuse cached installation token if valid for more than 5 minutes
    if (cachedToken && cachedToken.expiresAt > now + 300) {
      return cachedToken.token;
    }

    const jwt = createGitHubAppJwt(config.githubAppId, config.githubPrivateKey);
    const response = await fetch(
      `https://api.github.com/app/installations/${encodeURIComponent(config.githubInstallationId)}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to mint GitHub App installation token (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as { token: string; expires_at: string };
    const expiresAt = Math.floor(new Date(data.expires_at).getTime() / 1000);
    cachedToken = { token: data.token, expiresAt };
    return data.token;
  }

  // Fallback to static PAT if configured
  if (config.githubToken) {
    return config.githubToken;
  }

  throw new Error('No GitHub authentication configured. Provide GitHub App credentials or GITHUB_TOKEN.');
}
