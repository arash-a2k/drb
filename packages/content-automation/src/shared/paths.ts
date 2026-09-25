import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const packageRoot: string = path.resolve(__dirname, '../..');
export const repoRoot: string = process.env.DRB_REPO_ROOT
  ? path.resolve(process.env.DRB_REPO_ROOT)
  : path.resolve(packageRoot, '../..');
export const schemaPath: string = path.join(packageRoot, 'schemas/pageDraft.schema.json');
export const defaultDraftPath: string = path.join(packageRoot, 'schemas/examples/pageDraft.sample.json');
export const promptRoot: string = path.join(packageRoot, 'prompts');
export const seoGuidePath: string = path.join(repoRoot, 'SEO-guide.md');
