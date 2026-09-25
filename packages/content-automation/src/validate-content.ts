#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { defaultDraftPath, repoRoot, schemaPath } from './shared/paths.ts';
import { isSlugReserved, validateSlugFormat } from './shared/slug.ts';

type AjvError = {
  instancePath?: string;
  message?: string;
  params?: Record<string, unknown>;
};

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function formatAjvError(error: AjvError): string {
  const location = error.instancePath || '/';
  const detail = error.params ? ` ${JSON.stringify(error.params)}` : '';
  return `${location} ${error.message || 'is invalid'}${detail}`;
}

function collectInputFiles(args: string[]): string[] {
  const files: string[] = [];
  let allowSample = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--file') {
      const file = args[i + 1];
      if (!file) {
        throw new Error('--file requires a path');
      }
      files.push(file);
      i += 1;
    } else if (arg === '--dir') {
      const dir = args[i + 1];
      if (!dir) {
        throw new Error('--dir requires a path');
      }
      const absoluteDir = path.resolve(repoRoot, dir);
      if (fs.existsSync(absoluteDir)) {
        for (const entry of fs.readdirSync(absoluteDir)) {
          if (entry.endsWith('.json')) {
            files.push(path.join(absoluteDir, entry));
          }
        }
      }
      i += 1;
    } else if (arg === '--sample') {
      allowSample = true;
    } else if (arg && !arg.startsWith('--')) {
      files.push(arg);
    }
  }

  if (allowSample) {
    files.push(defaultDraftPath);
  }

  if (files.length) {
    return files;
  }

  // H1 Defense: In CI environments, fail if no file or --sample is passed
  if (process.env.CI && !allowSample) {
    throw new Error('validate-content: In CI, you must provide a file to validate. Usage: npm run validate:content -- --file <path> (or --sample)');
  }

  return [defaultDraftPath];
}

function main(): void {
  const schema = readJson(schemaPath);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const files = collectInputFiles(process.argv.slice(2));
  let failed = false;

  for (const file of files) {
    const absoluteFile = path.resolve(repoRoot, file);
    if (!fs.existsSync(absoluteFile)) {
      console.error(`Target draft file does not exist: ${file}`);
      failed = true;
      continue;
    }

    const draft = readJson(absoluteFile) as { slug?: string };
    const valid = validate(draft);
    if (!valid) {
      failed = true;
      console.error(`Invalid PageDraft: ${path.relative(repoRoot, absoluteFile)}`);
      for (const error of (validate.errors || []) as AjvError[]) {
        console.error(`  - ${formatAjvError(error)}`);
      }
    } else {
      if (draft.slug) {
        try {
          validateSlugFormat(draft.slug);
          if (isSlugReserved(draft.slug)) {
            throw new Error(`slug "${draft.slug}" is a reserved system route`);
          }
        } catch (slugErr) {
          failed = true;
          console.error(`Invalid PageDraft: ${path.relative(repoRoot, absoluteFile)}`);
          console.error(`  - ${slugErr instanceof Error ? slugErr.message : String(slugErr)}`);
          continue;
        }
      }
      console.log(`Valid PageDraft: ${path.relative(repoRoot, absoluteFile)}`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
