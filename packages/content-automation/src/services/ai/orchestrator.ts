import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

export type Language = 'fa' | 'en' | 'ru';
export type PageType =
  | 'single-column'
  | 'two-column'
  | 'hero-with-sections'
  | 'content-with-image-grid'
  | 'solo-image-content-lines'
  | 'gallery-only'
  | 'treatment';
export type NavPlacement = 'none' | 'main' | 'treatments';

export type PageDraftImageInput = {
  src: string;
  telegramFileId?: string;
  sourcePath?: string;
  altHint?: string;
};

export type GeneratePageDraftInput = {
  slug: string;
  pageTitle: string;
  sourceLanguage: Language;
  sourceText: string;
  pageGoal?: string;
  preferredPageType?: PageType;
  navPlacement?: NavPlacement;
  images?: PageDraftImageInput[];
};

export type AiCompletionRequest = {
  task: 'classify-page-type' | 'seo-page-optimizer' | 'translate-page';
  prompt: string;
  input: unknown;
  attempt: number;
};

export type AiModelClient = {
  completeJson(request: AiCompletionRequest): Promise<string>;
};

export type OrchestratorOptions = {
  maxRetries?: number;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
};

type ContentSectionDraft = {
  id: string;
  title: string;
  content: string;
  bold?: string[];
};

type FaqItem = {
  question: string;
  answer: string;
};

type DataTable = {
  title: string;
  description?: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string>>;
};

type PageContentDraft = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  heroImage?: string;
  sections: ContentSectionDraft[];
  faq?: FaqItem[];
  tables?: DataTable[];
};

export type PageDraft = {
  slug: string;
  sourceLanguage: Language;
  pageType: PageType;
  navPlacement: NavPlacement;
  canonicalPath?: string;
  targetKeywords?: string[];
  content: Record<Language, PageContentDraft>;
  images: Array<{
    telegramFileId?: string;
    sourcePath?: string;
    src: string;
    alt: Record<Language, string>;
  }>;
};

type ClassifierOutput = {
  pageType: PageType;
  navPlacement: NavPlacement;
  reason: string;
  confidence?: 'low' | 'medium' | 'high';
};

type SeoOptimizerOutput = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  targetKeywords?: string[];
  sections: ContentSectionDraft[];
  faq?: FaqItem[];
  tables?: DataTable[];
  pricingNote?: string;
  pageTypeRecommendation?: {
    pageType: PageType;
    reason: string;
  };
  imageAltTextBrief?: string[];
};

type TranslationOutput = {
  fa: PageContentDraft;
  en: PageContentDraft;
  ru: PageContentDraft;
  imageAlt: Array<Record<Language, string>>;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '../../..');
const repoRoot = path.resolve(packageRoot, '../..');
const promptRoot = path.join(packageRoot, 'prompts');
const schemaPath = path.join(packageRoot, 'schemas/pageDraft.schema.json');
const seoGuidePath = path.join(repoRoot, 'SEO-guide.md');
const supportedLanguages: Language[] = ['fa', 'en', 'ru'];
const allowedPageTypes = new Set<PageType>([
  'single-column',
  'two-column',
  'hero-with-sections',
  'content-with-image-grid',
  'solo-image-content-lines',
  'gallery-only',
  'treatment',
]);
const allowedNavPlacements = new Set<NavPlacement>(['none', 'main', 'treatments']);
const treatmentNavPageTypes = new Set<PageType>(['treatment', 'content-with-image-grid', 'solo-image-content-lines']);

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson<T = unknown>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function loadPrompt(name: string): string {
  return readText(path.join(promptRoot, name));
}

export function stripMarkdownJsonWrapper(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseAiJson<T>(raw: string): T {
  return JSON.parse(stripMarkdownJsonWrapper(raw)) as T;
}

function assertPageType(value: unknown): asserts value is PageType {
  if (typeof value !== 'string' || !allowedPageTypes.has(value as PageType)) {
    throw new Error(`Invalid pageType: ${String(value)}`);
  }
}

function assertNavPlacement(value: unknown): asserts value is NavPlacement {
  if (typeof value !== 'string' || !allowedNavPlacements.has(value as NavPlacement)) {
    throw new Error(`Invalid navPlacement: ${String(value)}`);
  }
}

function assertLogicalPagePlacement(pageType: PageType, navPlacement: NavPlacement): void {
  if (pageType === 'treatment' && navPlacement !== 'treatments') {
    throw new Error('pageType "treatment" requires navPlacement "treatments"');
  }
  if (navPlacement === 'treatments' && !treatmentNavPageTypes.has(pageType)) {
    throw new Error('navPlacement "treatments" requires a treatment-compatible pageType');
  }
}

function validateClassifierOutput(output: ClassifierOutput): ClassifierOutput {
  assertPageType(output.pageType);
  assertNavPlacement(output.navPlacement);
  assertLogicalPagePlacement(output.pageType, output.navPlacement);
  if (!output.reason) {
    throw new Error('Classifier output requires a reason');
  }
  return output;
}

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeSection(section: ContentSectionDraft, index: number): ContentSectionDraft {
  return {
    id: normalizeText(section.id, `section-${index + 1}`),
    title: normalizeText(section.title),
    content: normalizeText(section.content),
    bold: Array.isArray(section.bold) ? section.bold.filter((item) => typeof item === 'string') : [],
  };
}

function normalizeFaq(items: FaqItem[] | undefined): FaqItem[] {
  return (items || []).map((item) => ({
    question: normalizeText(item.question),
    answer: normalizeText(item.answer),
  })).filter((item) => item.question && item.answer);
}

function normalizeContent(content: PageContentDraft): PageContentDraft {
  return {
    title: normalizeText(content.title),
    seoTitle: normalizeText(content.seoTitle),
    seoDescription: normalizeText(content.seoDescription),
    intro: normalizeText(content.intro),
    heroImage: content.heroImage,
    sections: (content.sections || []).map(normalizeSection),
    faq: normalizeFaq(content.faq),
    tables: content.tables || [],
  };
}

function buildPersianContent(seo: SeoOptimizerOutput): PageContentDraft {
  const sections = (seo.sections || []).map(normalizeSection);
  const pricingNote = normalizeText(seo.pricingNote);
  if (pricingNote) {
    sections.push({
      id: 'pricing-guidance',
      title: 'راهنمای هزینه درمان',
      content: pricingNote,
      bold: ['قیمت لمینت دندان ۱۴۰۵', 'ایمپلنت دندان قسطی تهران'].filter((keyword) => pricingNote.includes(keyword)),
    });
  }

  return normalizeContent({
    title: seo.title,
    seoTitle: seo.seoTitle,
    seoDescription: seo.seoDescription,
    intro: seo.intro,
    sections,
    faq: seo.faq || [],
    tables: seo.tables || [],
  });
}

function validateSeoOutput(output: SeoOptimizerOutput): SeoOptimizerOutput {
  if (!output.title || !output.seoTitle || !output.seoDescription) {
    throw new Error('SEO output requires title, seoTitle, and seoDescription');
  }
  if (output.seoTitle.length >= 60) {
    throw new Error('seoTitle must be under 60 characters');
  }
  if (output.seoDescription.length >= 155) {
    throw new Error('seoDescription must be strictly under 155 characters');
  }
  if (!Array.isArray(output.sections)) {
    throw new Error('SEO output requires sections[]');
  }
  return output;
}

function validateTranslationOutput(output: TranslationOutput, logger: OrchestratorOptions['logger']): TranslationOutput {
  for (const lang of supportedLanguages) {
    const content = output[lang];
    if (!content?.title || !content.seoTitle || !content.seoDescription || !Array.isArray(content.sections)) {
      throw new Error(`Translation output requires complete ${lang} content`);
    }
    if (lang === 'fa' && content.seoTitle.length >= 60) {
      throw new Error('fa.seoTitle must be under 60 characters');
    }
    if (lang === 'fa' && content.seoDescription.length >= 155) {
      throw new Error('fa.seoDescription must be strictly under 155 characters');
    }
    if (lang !== 'fa' && content.seoTitle.length >= 60) {
      logger?.warn(`${lang}.seoTitle is ${content.seoTitle.length} characters; target is under 60`);
    }
    if (lang !== 'fa' && content.seoDescription.length >= 155) {
      logger?.warn(`${lang}.seoDescription is ${content.seoDescription.length} characters; target is under 155`);
    }
  }
  if (!Array.isArray(output.imageAlt)) {
    throw new Error('Translation output requires imageAlt[]');
  }
  return output;
}

function buildCanonicalPath(input: GeneratePageDraftInput, classification: ClassifierOutput): string {
  return classification.navPlacement === 'treatments' || classification.pageType === 'treatment'
    ? `/treatments/${input.slug}`
    : `/${input.slug}`;
}

function buildImages(input: GeneratePageDraftInput, translation: TranslationOutput): PageDraft['images'] {
  return (input.images || []).map((image, index) => ({
    telegramFileId: image.telegramFileId,
    sourcePath: image.sourcePath,
    src: image.src,
    alt: translation.imageAlt[index] || {
      fa: image.altHint || input.pageTitle,
      en: image.altHint || input.pageTitle,
      ru: image.altHint || input.pageTitle,
    },
  }));
}

function validatePageDraft(draft: PageDraft): void {
  const schema = readJson(schemaPath);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (validate(draft)) {
    return;
  }

  const errors = (validate.errors || [])
    .map((error: { instancePath?: string; message?: string }) => `${error.instancePath || '/'} ${error.message}`)
    .join('\n');
  throw new Error(`Generated PageDraft is invalid:\n${errors}`);
}

async function runAiStep<T>(
  client: AiModelClient,
  request: Omit<AiCompletionRequest, 'attempt'>,
  validate: (output: T) => T,
  maxRetries: number,
  logger: OrchestratorOptions['logger'],
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      logger?.info(`Running AI step ${request.task}, attempt ${attempt}`);
      const raw = await client.completeJson({ ...request, attempt });
      return validate(parseAiJson<T>(raw));
    } catch (error) {
      lastError = error;
      logger?.warn(`AI step ${request.task} failed on attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function runTranslationDraftStep(
  client: AiModelClient,
  request: Omit<AiCompletionRequest, 'attempt'>,
  maxRetries: number,
  logger: OrchestratorOptions['logger'],
  buildDraft: (translation: TranslationOutput) => PageDraft,
): Promise<PageDraft> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      logger?.info(`Running AI step ${request.task}, attempt ${attempt}`);
      const raw = await client.completeJson({ ...request, attempt });
      const translation = validateTranslationOutput(parseAiJson<TranslationOutput>(raw), logger);
      const draft = buildDraft(translation);
      validatePageDraft(draft);
      return draft;
    } catch (error) {
      lastError = error;
      logger?.warn(`AI step ${request.task} failed on attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function generatePageDraft(
  input: GeneratePageDraftInput,
  client: AiModelClient,
  options: OrchestratorOptions = {},
): Promise<PageDraft> {
  const logger = options.logger;
  const maxRetries = options.maxRetries ?? 2;
  const imageCount = input.images?.length || 0;
  if (imageCount > 10) {
    throw new Error(`A page can include at most 10 images; received ${imageCount}`);
  }

  const classifier = await runAiStep<ClassifierOutput>(
    client,
    {
      task: 'classify-page-type',
      prompt: loadPrompt('classify-page-type.md'),
      input: {
        pageTitle: input.pageTitle,
        sourceLanguage: input.sourceLanguage,
        sourceText: input.sourceText,
        pageGoal: input.pageGoal || '',
        preferredPageType: input.preferredPageType || '',
        navPlacement: input.navPlacement || 'none',
        imageCount,
        hasHeroImage: imageCount > 0,
        isDentalService: /لمینت|کامپوزیت|ایمپلنت|ونیر|بلیچینگ|ارتودنسی|dental|implant|veneer|laminate|composite/i.test(input.sourceText),
      },
    },
    validateClassifierOutput,
    maxRetries,
    logger,
  );

  const seo = await runAiStep<SeoOptimizerOutput>(
    client,
    {
      task: 'seo-page-optimizer',
      prompt: loadPrompt('seo-page-optimizer.md'),
      input: {
        pageTitle: input.pageTitle,
        sourceLanguage: input.sourceLanguage,
        sourceText: input.sourceText,
        pageGoal: input.pageGoal || '',
        preferredPageType: input.preferredPageType || classifier.pageType,
        navPlacement: input.navPlacement || classifier.navPlacement,
        imageCount,
        seoGuide: readText(seoGuidePath),
      },
    },
    validateSeoOutput,
    maxRetries,
    logger,
  );

  const persianContent = buildPersianContent(seo);
  const draft = await runTranslationDraftStep(
    client,
    {
      task: 'translate-page',
      prompt: loadPrompt('translate-page.md'),
      input: {
        slug: input.slug,
        sourceLanguage: input.sourceLanguage,
        persianContent,
        imageAltTextBrief: seo.imageAltTextBrief || input.images?.map((image) => image.altHint || '') || [],
        targetKeywords: seo.targetKeywords || [],
      },
    },
    maxRetries,
    logger,
    (translation) => ({
      slug: input.slug,
      sourceLanguage: input.sourceLanguage,
      pageType: classifier.pageType,
      navPlacement: classifier.navPlacement,
      canonicalPath: buildCanonicalPath(input, classifier),
      targetKeywords: seo.targetKeywords || [],
      content: {
        fa: normalizeContent(translation.fa),
        en: normalizeContent(translation.en),
        ru: normalizeContent(translation.ru),
      },
      images: buildImages(input, translation),
    }),
  );
  logger?.info(`Generated valid PageDraft for ${input.slug}`);
  return draft;
}
