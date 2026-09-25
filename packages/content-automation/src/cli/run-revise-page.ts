#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { repoRoot } from '../shared/paths.ts';
import type { PageDraft } from '../shared/types.ts';
import { generatePage, validateDraft } from '../create-page.ts';
import { AnthropicModelClient } from '../services/ai/anthropic-client.ts';
import { isSlugReserved, validateSlugFormat } from '../shared/slug.ts';

export type RevisePipelineOptions = {
  slug: string;
  revisionText: string;
  useMockAi?: boolean;
};

export { validateSlugFormat as validateSlug };

function findExistingDraft(slug: string): { draftPath: string; draft: PageDraft } {
  validateSlugFormat(slug);
  if (isSlugReserved(slug)) {
    throw new Error(`Security validation error: Slug "${slug}" is a reserved system route and cannot be revised via automated content pipeline.`);
  }

  const draftsDir = path.join(repoRoot, 'packages/content-automation/drafts');
  const draftPath = path.join(draftsDir, `${slug}.draft.json`);

  if (!fs.existsSync(draftPath)) {
    throw new Error(`Could not find existing PageDraft at ${draftPath}. Revisions require an existing draft.`);
  }

  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8')) as PageDraft;
  return { draftPath, draft };
}

/**
 * C3 Defense: Strictly freezes structural properties (slug, pageType, navPlacement, image src).
 * Only permits updating editable content fields (title, intro, sections, faq, tables, image alt).
 */
function applySafeContentPatch(original: PageDraft, candidate: Partial<PageDraft>): PageDraft {
  if (candidate.slug && candidate.slug !== original.slug) {
    throw new Error(
      `Security violation: Model attempted to modify immutable slug from "${original.slug}" to "${candidate.slug}"`
    );
  }

  const candidateContent = candidate.content;

  return {
    slug: original.slug, // Strictly code-controlled
    sourceLanguage: original.sourceLanguage, // Strictly code-controlled
    pageType: original.pageType, // Strictly code-controlled
    navPlacement: original.navPlacement, // Strictly code-controlled
    canonicalPath: original.canonicalPath, // Strictly code-controlled
    targetKeywords: Array.isArray(candidate.targetKeywords) ? candidate.targetKeywords : original.targetKeywords,
    content: {
      fa: candidateContent?.fa ? { ...original.content.fa, ...candidateContent.fa } : original.content.fa,
      en: candidateContent?.en ? { ...original.content.en, ...candidateContent.en } : original.content.en,
      ru: candidateContent?.ru ? { ...original.content.ru, ...candidateContent.ru } : original.content.ru,
    },
    images: (original.images || []).map((img, idx) => ({
      ...img,
      // Only alt text can be revised; sourcePath and src are immutable
      alt: candidate.images?.[idx]?.alt ? candidate.images[idx].alt : img.alt,
    })),
  };
}

export async function runRevisePagePipeline(options: RevisePipelineOptions): Promise<{ slug: string; canonicalPath: string; updatedFiles: string[] }> {
  const { slug, revisionText, useMockAi } = options;
  if (!slug) throw new Error('Slug is required');
  if (!revisionText) throw new Error('Revision text is required');

  const { draftPath, draft } = findExistingDraft(slug);

  let updatedDraft: PageDraft = draft;

  if (useMockAi || process.env.DRB_USE_MOCK_AI === '1') {
    // Mock revision: safely update Persian intro
    if (draft.content?.fa) {
      const mockCandidate: Partial<PageDraft> = {
        content: {
          ...draft.content,
          fa: {
            ...draft.content.fa,
            intro: `${draft.content.fa.intro} (ویرایش شده: ${revisionText})`,
          },
        },
      };
      updatedDraft = applySafeContentPatch(draft, mockCandidate);
    }
  } else {
    const client = new AnthropicModelClient();
    const prompt = `You are a medical SEO expert editor.
You are given an existing website PageDraft in JSON format and a requested revision from the dentist.
Dentist revision request: "${revisionText}"

Update the PageDraft accordingly:
- Apply the dentist's request across the relevant languages (fa, en, ru).
- Keep all existing schema properties intact.
- Retain valid medical terminology.
- Output ONLY the updated PageDraft JSON object.`;

    const rawJson = await client.completeJson({
      task: 'seo-page-optimizer',
      prompt,
      input: draft,
      attempt: 1,
    });

    const parsed = JSON.parse(rawJson) as Partial<PageDraft>;
    // Enforce C3 safe patch
    updatedDraft = applySafeContentPatch(draft, parsed);
  }

  // Validate updated draft
  validateDraft(updatedDraft, slug);

  // Write updated draft to disk
  fs.writeFileSync(draftPath, `${JSON.stringify(updatedDraft, null, 2)}\n`);

  // Re-generate page files
  const updatedFiles = generatePage(updatedDraft);
  updatedFiles.push(draftPath);

  const canonicalPath = updatedDraft.pageType === 'treatment' || updatedDraft.navPlacement === 'treatments'
    ? `/fa/treatments/${slug}`
    : `/fa/${slug}`;

  return {
    slug,
    canonicalPath,
    updatedFiles,
  };
}

function parseCliArgs(argv: string[]): RevisePipelineOptions {
  let slug = '';
  let revisionText = '';
  let useMockAi = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--slug' && argv[i + 1]) {
      slug = argv[i + 1];
      i += 1;
    } else if (arg === '--revision' && argv[i + 1]) {
      revisionText = argv[i + 1];
      i += 1;
    } else if (arg === '--mock') {
      useMockAi = true;
    }
  }

  return { slug, revisionText, useMockAi };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const options = parseCliArgs(process.argv.slice(2));
  runRevisePagePipeline(options)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
