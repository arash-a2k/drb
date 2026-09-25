#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { repoRoot } from '../shared/paths.ts';
import type { Language, PageDraft } from '../shared/types.ts';
import { generatePageDraft, type AiCompletionRequest, type AiModelClient, type PageDraftImageInput } from '../services/ai/orchestrator.ts';
import { AnthropicModelClient } from '../services/ai/anthropic-client.ts';
import { generatePage, validateDraft } from '../create-page.ts';
import { collectImageFiles, optimizeImage, type OptimizedImage } from '../optimize-images.ts';
import { slugify, validateSlugAvailability, validateSlugFormat } from '../shared/slug.ts';

class MockCliModelClient implements AiModelClient {
  private readonly slug: string;
  private readonly title: string;

  constructor(slug: string, title: string) {
    this.slug = slug;
    this.title = title;
  }

  async completeJson(request: AiCompletionRequest): Promise<string> {
    if (request.task === 'classify-page-type') {
      return JSON.stringify({
        pageType: 'content-with-image-grid',
        navPlacement: 'treatments',
        reason: 'Dental treatment content with images.',
        confidence: 'high',
      });
    }

    if (request.task === 'seo-page-optimizer') {
      return JSON.stringify({
        title: this.title,
        seoTitle: `${this.title} | دکتر ختایی`,
        seoDescription: `${this.title} در زعفرانیه با مشاوره تخصصی دکتر بابک ختایی.`,
        intro: `${this.title} برای ارتقای سلامت و زیبایی دندان با متدهای پیشرفته دندانپزشکی انجام می شود.`,
        targetKeywords: [this.title, `${this.title} زعفرانیه`],
        sections: [
          {
            id: 'overview',
            title: `آشنایی با ${this.title}`,
            content: `توضیحات و جزییات تخصصی درباره نحوه انجام و مزایای ${this.title}.`,
            bold: [this.title],
          },
        ],
        faq: [
          {
            question: `مزایای ${this.title} چیست؟`,
            answer: 'مراقبت بهتر، ماندگاری بالا و زیبایی طبیعی لبخند.',
          },
        ],
        pricingNote: 'برای استعلام هزینه به روز و مشاوره با مطب تماس حاصل فرمایید.',
        pageTypeRecommendation: {
          pageType: 'content-with-image-grid',
          reason: 'Treatment service page with visual examples.',
        },
        imageAltTextBrief: [`تصویر مربوط به ${this.title}`],
      });
    }

    return JSON.stringify({
      fa: {
        title: this.title,
        seoTitle: `${this.title} | دکتر ختایی`,
        seoDescription: `${this.title} در زعفرانیه با مشاوره تخصصی دکتر بابک ختایی.`,
        intro: `${this.title} برای ارتقای سلامت و زیبایی دندان انجام می شود.`,
        sections: [
          {
            id: 'overview',
            title: `آشنایی با ${this.title}`,
            content: `توضیحات و جزییات تخصصی درباره ${this.title}.`,
            bold: [this.title],
          },
          {
            id: 'pricing-guidance',
            title: 'راهنمای هزینه درمان',
            content: 'برای استعلام هزینه دقیق و هماهنگی نوبت مشاوره با مطب دکتر ختایی تماس بگیرید.',
            bold: ['هزینه درمان'],
          },
        ],
        faq: [
          {
            question: `مزایای ${this.title} چیست؟`,
            answer: 'مراقبت بهتر، ماندگاری بالا و زیبایی طبیعی لبخند.',
          },
        ],
        tables: [],
      },
      en: {
        title: this.slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
        seoTitle: `${this.slug} | Dr. Khatayee Dental Clinic`,
        seoDescription: `Specialized dental service in Zafaraniyeh with Dr. Babak Khatayee.`,
        intro: `Modern dental treatments to improve smile aesthetics and oral health.`,
        sections: [
          {
            id: 'overview',
            title: 'Overview',
            content: `Specialized treatment designed for long-lasting oral health and aesthetic results.`,
            bold: ['Treatment'],
          },
          {
            id: 'pricing-guidance',
            title: 'Pricing Guidance',
            content: 'For updated pricing and appointment booking, please contact our office.',
            bold: ['pricing'],
          },
        ],
        faq: [
          {
            question: 'How long does the treatment take?',
            answer: 'Treatment length varies based on each patient’s clinical conditions.',
          },
        ],
        tables: [],
      },
      ru: {
        title: this.title,
        seoTitle: `${this.title} | Стоматология Доктора Хатаи`,
        seoDescription: `Профессиональное стоматологическое лечение в Заферание у доктора Бабака Хатаи.`,
        intro: `Современные методы стоматологического лечения для здоровья и гармонии улыбки.`,
        sections: [
          {
            id: 'overview',
            title: 'Обзор',
            content: `Индивидуальный подход и современные технологии для достижения лучших результатов.`,
            bold: ['Лечение'],
          },
          {
            id: 'pricing-guidance',
            title: 'Информация о стоимости',
            content: 'Для получения актуальной информации о стоимости свяжитесь с клиникой.',
            bold: ['стоимости'],
          },
        ],
        faq: [
          {
            question: 'Сколько длится лечение?',
            answer: 'Продолжительность лечения определяется индивидуально.',
          },
        ],
        tables: [],
      },
      imageAlt: [
        {
          fa: `تصویر مربوط به ${this.title}`,
          en: `Image illustrating ${this.slug}`,
          ru: `Изображение процедуры ${this.title}`,
        },
      ],
    });
  }
}

export type RunPipelineOptions = {
  title: string;
  text: string;
  slug?: string;
  images?: string[];
  sourceLanguage?: Language;
  pageGoal?: string;
  useMockAi?: boolean;
};

export type PipelineResult = {
  slug: string;
  title: string;
  pageType: string;
  navPlacement: string;
  canonicalPath: string;
  generatedFiles: string[];
  imagesCount: number;
};

export { validateSlugFormat as validateSlug };

export async function runCreatePagePipeline(options: RunPipelineOptions): Promise<PipelineResult> {
  const title = options.title.trim();
  const text = options.text.trim();
  if (!title) throw new Error('Title is required');
  if (!text) throw new Error('Text is required');

  const slug = options.slug ? slugify(options.slug) : slugify(title);
  // Enforce format, reserved route rejection, and filesystem collision checks
  validateSlugAvailability(slug, repoRoot);
  const sourceLanguage: Language = options.sourceLanguage || (/[\u0600-\u06FF]/.test(text) ? 'fa' : 'en');

  // 1. Optimize images if provided
  const draftImages: PageDraftImageInput[] = [];
  if (options.images && options.images.length > 0) {
    const rawImageFiles = collectImageFiles(options.images);
    for (let i = 0; i < rawImageFiles.length; i += 1) {
      const optimized = await optimizeImage(rawImageFiles[i], i, { slug });
      draftImages.push({
        src: optimized.publicSrc,
        sourcePath: optimized.outputPath,
        altHint: title,
      });
    }
  }

  // 2. Select AI Client
  const client: AiModelClient = options.useMockAi || process.env.DRB_USE_MOCK_AI === '1'
    ? new MockCliModelClient(slug, title)
    : new AnthropicModelClient();

  // 3. Generate Draft via Orchestrator
  const draft: PageDraft = await generatePageDraft(
    {
      slug,
      pageTitle: title,
      sourceLanguage,
      sourceText: text,
      pageGoal: options.pageGoal,
      images: draftImages,
    },
    client,
    { logger: console },
  );

  // 4. Validate & Create Page
  validateDraft(draft, slug);
  const generatedFiles = generatePage(draft);

  // 5. Save draft JSON for revisions and audit trail
  const draftsDir = path.join(repoRoot, 'packages/content-automation/drafts');
  fs.mkdirSync(draftsDir, { recursive: true });
  const draftPath = path.join(draftsDir, `${draft.slug}.draft.json`);
  fs.writeFileSync(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
  generatedFiles.push(draftPath);

  const canonicalPath = draft.pageType === 'treatment' || draft.navPlacement === 'treatments'
    ? `/fa/treatments/${draft.slug}`
    : `/fa/${draft.slug}`;

  return {
    slug: draft.slug,
    title,
    pageType: draft.pageType,
    navPlacement: draft.navPlacement,
    canonicalPath,
    generatedFiles,
    imagesCount: draftImages.length,
  };
}

function parseCliArgs(argv: string[]): RunPipelineOptions {
  let title = '';
  let text = '';
  let slug: string | undefined;
  let images: string[] = [];
  let sourceLanguage: Language | undefined;
  let pageGoal: string | undefined;
  let useMockAi = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--title' && argv[i + 1]) {
      title = argv[i + 1];
      i += 1;
    } else if (arg === '--text' && argv[i + 1]) {
      text = argv[i + 1];
      i += 1;
    } else if (arg === '--slug' && argv[i + 1]) {
      slug = argv[i + 1];
      i += 1;
    } else if (arg === '--images' && argv[i + 1]) {
      images = argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean);
      i += 1;
    } else if (arg === '--lang' && argv[i + 1]) {
      sourceLanguage = argv[i + 1] as Language;
      i += 1;
    } else if (arg === '--goal' && argv[i + 1]) {
      pageGoal = argv[i + 1];
      i += 1;
    } else if (arg === '--mock') {
      useMockAi = true;
    }
  }

  return { title, text, slug, images, sourceLanguage, pageGoal, useMockAi };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const options = parseCliArgs(process.argv.slice(2));
  runCreatePagePipeline(options)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
