#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

type AjvError = {
  instancePath?: string;
  message?: string;
  params?: Record<string, unknown>;
};

const packageRoot: string = path.resolve(__dirname, '..');
const repoRoot: string = path.resolve(packageRoot, '../..');
const schemaPath: string = path.join(packageRoot, 'schemas/pageDraft.schema.json');
const defaultDraftPath: string = path.join(packageRoot, 'schemas/examples/pageDraft.sample.json');

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
      for (const entry of fs.readdirSync(absoluteDir)) {
        if (entry.endsWith('.json')) {
          files.push(path.join(absoluteDir, entry));
        }
      }
      i += 1;
    } else {
      files.push(arg);
    }
  }

  return files.length ? files : [defaultDraftPath];
}

function main(): void {
  const schema = readJson(schemaPath);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const files = collectInputFiles(process.argv.slice(2));
  let failed = false;

  for (const file of files) {
    const absoluteFile = path.resolve(repoRoot, file);
    const draft = readJson(absoluteFile);
    const valid = validate(draft);
    if (!valid) {
      failed = true;
      console.error(`Invalid PageDraft: ${path.relative(repoRoot, absoluteFile)}`);
      for (const error of (validate.errors || []) as AjvError[]) {
        console.error(`  - ${formatAjvError(error)}`);
      }
    } else {
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
