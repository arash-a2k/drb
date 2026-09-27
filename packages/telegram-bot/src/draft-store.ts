import { logger } from './logger.ts';

export type UserDraft = {
  draftId: string;
  userId: number;
  chatId?: string;
  title?: string;
  text?: string;
  photoFileIds: string[];
  activeSlug?: string;
  activeBranch?: string;
  pageType?: string;
  status: 'draft' | 'dispatching' | 'dispatched' | 'failed';
  lastDispatchedAt?: string;
  updatedAt: string;
};

const DEFAULT_BUCKET = process.env.STORAGE_BUCKET || 'dr-bob-website.appspot.com';

// In-memory fallback and local read cache
const memoryDrafts = new Map<string, UserDraft>();
const userActiveDrafts = new Map<number, string>();

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getGcpAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      {
        headers: { 'Metadata-Flavor': 'Google' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in * 1000),
    };
    return cachedToken.token;
  } catch {
    // Expected when running outside GCP (e.g. local dev, unit tests)
    return null;
  }
}

export async function getDraft(bucket: string | undefined, draftId: string): Promise<UserDraft | undefined> {
  // Check memory cache first
  const cached = memoryDrafts.get(draftId);
  if (cached) {
    return cached;
  }

  const targetBucket = bucket || DEFAULT_BUCKET;
  const token = await getGcpAccessToken();
  if (!token) {
    return undefined;
  }

  try {
    const path = `drafts/${draftId}.json`;
    const url = `https://storage.googleapis.com/storage/v1/b/${targetBucket}/o/${encodeURIComponent(path)}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) {
      return undefined;
    }

    if (!res.ok) {
      logger.warn(`Failed to fetch draft from GCS: ${res.statusText}`);
      return undefined;
    }

    const draft = (await res.json()) as UserDraft;
    memoryDrafts.set(draftId, draft);
    return draft;
  } catch (err) {
    logger.warn('Error reading draft from GCS', { error: String(err) });
    return undefined;
  }
}

export async function saveDraft(bucket: string | undefined, draft: UserDraft): Promise<void> {
  draft.updatedAt = new Date().toISOString();
  memoryDrafts.set(draft.draftId, draft);
  userActiveDrafts.set(draft.userId, draft.draftId);

  const targetBucket = bucket || DEFAULT_BUCKET;
  const token = await getGcpAccessToken();
  if (!token) {
    return;
  }

  try {
    const path = `drafts/${draft.draftId}.json`;
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(path)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(draft),
    });

    if (!res.ok) {
      logger.warn(`Failed to persist draft to GCS: ${res.statusText}`);
    }
  } catch (err) {
    logger.warn('Error saving draft to GCS', { error: String(err) });
  }
}

export async function deleteDraft(bucket: string | undefined, draftId: string): Promise<void> {
  const draft = memoryDrafts.get(draftId);
  if (draft) {
    userActiveDrafts.delete(draft.userId);
  }
  memoryDrafts.delete(draftId);

  const targetBucket = bucket || DEFAULT_BUCKET;
  const token = await getGcpAccessToken();
  if (!token) {
    return;
  }

  try {
    const path = `drafts/${draftId}.json`;
    const url = `https://storage.googleapis.com/storage/v1/b/${targetBucket}/o/${encodeURIComponent(path)}`;
    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    logger.warn('Error deleting draft from GCS', { error: String(err) });
  }
}

export async function getUserActiveDraftId(bucket: string | undefined, userId: number): Promise<string | undefined> {
  const cachedId = userActiveDrafts.get(userId);
  if (cachedId) {
    return cachedId;
  }

  const targetBucket = bucket || DEFAULT_BUCKET;
  const token = await getGcpAccessToken();
  if (!token) {
    return undefined;
  }

  try {
    const path = `users/${userId}.json`;
    const url = `https://storage.googleapis.com/storage/v1/b/${targetBucket}/o/${encodeURIComponent(path)}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) {
      return undefined;
    }

    if (!res.ok) {
      return undefined;
    }

    const data = (await res.json()) as { activeDraftId?: string };
    if (data.activeDraftId) {
      userActiveDrafts.set(userId, data.activeDraftId);
      return data.activeDraftId;
    }
  } catch {
    // Non-fatal
  }
  return undefined;
}

export async function setUserActiveDraftId(bucket: string | undefined, userId: number, draftId: string | undefined): Promise<void> {
  if (draftId) {
    userActiveDrafts.set(userId, draftId);
  } else {
    userActiveDrafts.delete(userId);
  }

  const targetBucket = bucket || DEFAULT_BUCKET;
  const token = await getGcpAccessToken();
  if (!token) {
    return;
  }

  try {
    const path = `users/${userId}.json`;
    if (draftId) {
      const url = `https://storage.googleapis.com/upload/storage/v1/b/${targetBucket}/o?uploadType=media&name=${encodeURIComponent(path)}`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activeDraftId: draftId, updatedAt: new Date().toISOString() }),
      });
    } else {
      const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(path)}`;
      await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Non-fatal
  }
}
