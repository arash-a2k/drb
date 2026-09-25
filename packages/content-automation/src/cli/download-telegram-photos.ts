#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export type DownloadPhotosOptions = {
  token?: string;
  fileIds: string[];
  outDir: string;
};

export type DownloadedPhoto = {
  fileId: string;
  localPath: string;
  fileName: string;
  sizeBytes: number;
};

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function isValidImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  // AVIF: ftypavif or ftypavis at byte 4
  const ftyp = buffer.toString('latin1', 4, 12);
  if (ftyp === 'ftypavif' || ftyp === 'ftypavis') {
    return true;
  }

  return false;
}

export async function downloadTelegramPhotos(options: DownloadPhotosOptions): Promise<DownloadedPhoto[]> {
  const token = options.token || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required to download photos');
  }

  const outDir = path.resolve(options.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const results: DownloadedPhoto[] = [];

  for (let i = 0; i < options.fileIds.length; i += 1) {
    const fileId = options.fileIds[i];
    if (!fileId) continue;

    // 1. Get file path from Telegram API
    const metaRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
    if (!metaRes.ok) {
      throw new Error(`Telegram getFile failed for ${fileId}: ${metaRes.statusText}`);
    }

    const metaData = (await metaRes.json()) as {
      ok: boolean;
      result?: { file_id: string; file_path: string; file_size?: number };
      description?: string;
    };

    if (!metaData.ok || !metaData.result?.file_path) {
      throw new Error(`Telegram getFile returned error for ${fileId}: ${metaData.description || 'unknown error'}`);
    }

    if (metaData.result.file_size && metaData.result.file_size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Telegram photo ${fileId} exceeds maximum allowed size of 10MB (${metaData.result.file_size} bytes)`);
    }

    const remoteFilePath = metaData.result.file_path;
    const ext = path.extname(remoteFilePath) || '.jpg';
    const localFileName = `photo_${String(i + 1).padStart(2, '0')}${ext}`;
    const localFilePath = path.join(outDir, localFileName);

    // 2. Download file content
    const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${remoteFilePath}`);
    if (!fileRes.ok) {
      throw new Error(`Failed to download Telegram file at ${remoteFilePath}: ${fileRes.statusText}`);
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Downloaded file ${fileId} exceeds maximum allowed size of 10MB (${buffer.length} bytes)`);
    }

    if (!isValidImageMagicBytes(buffer)) {
      throw new Error(`Downloaded file ${fileId} failed magic bytes verification (unsupported or malformed image)`);
    }

    fs.writeFileSync(localFilePath, buffer);

    results.push({
      fileId,
      localPath: localFilePath,
      fileName: localFileName,
      sizeBytes: buffer.length,
    });
  }

  return results;
}

function parseArgs(argv: string[]): { fileIds: string[]; outDir: string; token?: string } {
  let fileIds: string[] = [];
  let outDir = './tmp/telegram-images';
  let token: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file-ids' && argv[i + 1]) {
      fileIds = argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean);
      i += 1;
    } else if (arg === '--out-dir' && argv[i + 1]) {
      outDir = argv[i + 1];
      i += 1;
    } else if (arg === '--token' && argv[i + 1]) {
      token = argv[i + 1];
      i += 1;
    }
  }

  return { fileIds, outDir, token };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const args = parseArgs(process.argv.slice(2));
  downloadTelegramPhotos(args)
    .then((downloaded) => {
      console.log(JSON.stringify({ count: downloaded.length, files: downloaded }, null, 2));
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
