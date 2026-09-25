#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { repoRoot } from '../shared/paths.ts';
import { runRevisePagePipeline } from './run-revise-page.ts';
import type { PageDraft } from '../shared/types.ts';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const testSlug = 'smoke-test-revision-page';
  const draftsDir = path.join(repoRoot, 'packages/content-automation/drafts');
  fs.mkdirSync(draftsDir, { recursive: true });
  const draftPath = path.join(draftsDir, `${testSlug}.draft.json`);

  const initialDraft: PageDraft = {
    slug: testSlug,
    sourceLanguage: 'fa',
    pageType: 'content-with-image-grid',
    navPlacement: 'none',
    canonicalPath: `/fa/${testSlug}`,
    targetKeywords: ['تست بازنگری'],
    content: {
      fa: {
        title: 'صفحه تست بازنگری',
        seoTitle: 'صفحه تست بازنگری | دکتر ختایی',
        seoDescription: 'توضیحات تست بازنگری صفحه',
        intro: 'مقدمه اولیه تست',
        sections: [
          {
            id: 'overview',
            title: 'بررسی کلی',
            content: 'محتوای اولیه تست',
            bold: ['تست'],
          },
        ],
        faq: [],
        tables: [],
      },
      en: {
        title: 'Smoke Test Revision Page',
        seoTitle: 'Smoke Test Revision Page',
        seoDescription: 'Test page description for revision testing',
        intro: 'Initial test intro',
        sections: [
          {
            id: 'overview',
            title: 'Overview',
            content: 'Initial test overview content',
            bold: ['test'],
          },
        ],
        faq: [],
        tables: [],
      },
      ru: {
        title: 'Тестовая страница проверки',
        seoTitle: 'Тестовая страница проверки',
        seoDescription: 'Описание тестовой страницы',
        intro: 'Начальное введение',
        sections: [
          {
            id: 'overview',
            title: 'Обзор',
            content: 'Содержимое начального обзора',
            bold: ['тест'],
          },
        ],
        faq: [],
        tables: [],
      },
    },
    images: [],
  };

  fs.writeFileSync(draftPath, JSON.stringify(initialDraft, null, 2));

  try {
    const revisionText = 'بهبود کیفیت و خلاصه سازی مقدمه';
    const result = await runRevisePagePipeline({
      slug: testSlug,
      revisionText,
      useMockAi: true,
    });

    assert(result.slug === testSlug, 'Result slug should match');
    assert(result.canonicalPath === `/fa/${testSlug}`, 'Canonical path should match');
    assert(Array.isArray(result.updatedFiles) && result.updatedFiles.length > 0, 'updatedFiles must be a non-empty array');

    // Verify draft file was updated
    const updatedDraft = JSON.parse(fs.readFileSync(draftPath, 'utf8')) as PageDraft;
    assert(updatedDraft.content.fa.intro.includes(revisionText), 'Draft file on disk should include revision text');

    // Verify all generated files actually exist
    for (const file of result.updatedFiles) {
      assert(fs.existsSync(file), `Expected generated file to exist: ${file}`);
    }

    console.log('Revision pipeline smoke check passed successfully.');
  } finally {
    // Cleanup generated test files
    const toDelete = [
      draftPath,
      path.join(repoRoot, `pages/${testSlug}`),
      path.join(repoRoot, `app/[lang]/${testSlug}.jsx`),
      path.join(repoRoot, `app/${testSlug}.js`),
    ];
    for (const target of toDelete) {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
  }
}

main().catch((err: unknown) => {
  console.error('Revision smoke check failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
