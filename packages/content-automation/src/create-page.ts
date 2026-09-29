#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import { packageRoot, repoRoot } from './shared/paths.ts';
import { supportedLanguages, type ContentSectionDraft, type DataTable, type FaqItem, type Language, type PageContentDraft, type PageDraft, type PageType } from './shared/types.ts';
import { isSlugReserved, validateSlugFormat } from './shared/slug.ts';

type GeneratedLanguageContent = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  heroImage: string;
  sections: Array<Required<Pick<ContentSectionDraft, 'id' | 'title' | 'content'>> & { bold: string[] }>;
  imageTitle: string;
  images: Array<{ src: string; alt: string }>;
  faq: FaqItem[];
  tables: DataTable[];
};

type ParsedArgs = {
  draft?: string;
  dryRun: boolean;
};

const normalPageTypes: Set<PageType> = new Set([
  'single-column',
  'two-column',
  'hero-with-sections',
  'content-with-image-grid',
  'solo-image-content-lines',
  'gallery-only',
]);

function readJson<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeFileIfChanged(filePath: string, content: string): boolean {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) {
    return false;
  }
  fs.writeFileSync(filePath, content);
  return true;
}

function toPascalCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function validateDraft(draft: unknown, sourceLabel = 'draft'): asserts draft is PageDraft {
  const schema = readJson(path.join(packageRoot, 'schemas/pageDraft.schema.json'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (!validate(draft)) {
    const errors = (validate.errors || [])
      .map((error: { instancePath?: string; message?: string }) => `${error.instancePath || '/'} ${error.message}`)
      .join('\n');
    throw new Error(`Invalid PageDraft ${sourceLabel}:\n${errors}`);
  }

  const pageDraft = draft as PageDraft;
  validateSlugFormat(pageDraft.slug);
  if (isSlugReserved(pageDraft.slug)) {
    throw new Error(`Invalid PageDraft ${sourceLabel}: slug "${pageDraft.slug}" is a reserved system route and cannot be used.`);
  }
}

function normalizeImagesForLanguage(draft: PageDraft, lang: Language): Array<{ src: string; alt: string }> {
  return draft.images.map((image) => ({
    src: image.src,
    alt: image.alt[lang],
  }));
}

function normalizeSections(content: PageContentDraft): GeneratedLanguageContent['sections'] {
  return content.sections.map((section) => ({
    id: section.id,
    title: section.title,
    content: section.content,
    bold: section.bold || [],
  }));
}

function buildLanguageContent(draft: PageDraft, lang: Language): GeneratedLanguageContent {
  const content = draft.content[lang];
  const firstImage = draft.images[0]?.src || '';
  return {
    title: content.title,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
    intro: content.intro,
    heroImage: content.heroImage || firstImage,
    sections: normalizeSections(content),
    imageTitle: content.title,
    images: normalizeImagesForLanguage(draft, lang),
    faq: content.faq || [],
    tables: content.tables || [],
  };
}

function buildPageJson(draft: PageDraft): Record<Language, GeneratedLanguageContent> {
  return supportedLanguages.reduce((acc, lang) => {
    acc[lang] = buildLanguageContent(draft, lang);
    return acc;
  }, {} as Record<Language, GeneratedLanguageContent>);
}

function buildNormalPageComponent(componentName: string, jsonFileName: string): string {
  return `import React from 'react';
import { useLanguage } from '../../hooks';
import Seo from '../../components/seo/Seo';
import { ContentSection, DataTable, FaqAccordion, TrustStrip } from '../../components/common';
import ImageGrid from '../../components/imageGrid/ImageGrid';
import * as text from './${jsonFileName}';

export default function ${componentName}() {
  const { lang = 'fa' } = useLanguage() || {};
  const content = text[lang] || text.en;
  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  const featuredImage = (content.images && content.images.length > 0 && content.images[0]?.src) || content.heroImage || '/assets/images/carousel/office-main.webp';
  const featuredAlt = (content.images && content.images.length > 0 && content.images[0]?.alt) || content.title || 'دکتر بابک ختایی';
  const galleryImages = content.images && content.images.length > 1 ? content.images.slice(1) : (content.images?.length === 1 ? content.images : []);

  const badgeText = {
    fa: '✨ خدمات تخصصی دندانپزشکی دکتر بابک ختایی',
    en: '✨ Specialized Dental Care by Dr. Babak Khatayee',
    ru: '✨ Стоматология доктора Бабака Хатаи',
  }[lang] || '✨ Specialized Dental Care';

  const ctaConsult = {
    fa: 'درخواست مشاوره و رزرو وقت',
    en: 'Book Consultation',
    ru: 'Записаться на прием',
  }[lang] || 'Book Consultation';

  const galleryTitle = {
    fa: 'گالری تصاویر و نمونه درمان‌ها',
    en: 'Clinical Photo Gallery',
    ru: 'Галерея клиники',
  }[lang] || 'Photo Gallery';

  return (
    <main dir={dir} className="bg-slate-50/50 min-h-screen text-slate-950">
      <Seo
        lang={lang}
        title={content.seoTitle}
        description={content.seoDescription}
        path="/${jsonFileName.replace('.json', '')}"
        image={content.heroImage}
        faq={content.faq}
      />

      {/* Mobile-First Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-8 sm:pt-10 sm:pb-12 md:pt-16 md:pb-16 bg-gradient-to-b from-slate-100/80 via-white to-slate-50/60 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-14 lg:items-center">
            
            <div className="lg:col-span-7 flex flex-col items-start text-start order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs sm:text-sm font-medium mb-3 sm:mb-4 shadow-xs">
                <span>{badgeText}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-snug sm:leading-tight mb-3 sm:mb-4">
                {content.title}
              </h1>

              {/* Mobile hero image right under title */}
              <div className="w-full my-4 sm:my-5 lg:hidden order-2">
                <div className="relative overflow-hidden rounded-2xl bg-slate-200 shadow-md border-2 border-white ring-1 ring-slate-200/80">
                  <img
                    src={featuredImage}
                    alt={featuredAlt}
                    className="w-full h-auto aspect-[16/10] sm:aspect-[4/3] object-cover"
                  />
                </div>
              </div>

              {content.intro ? (
                <p className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed mb-6 max-w-2xl order-3">
                  {content.intro}
                </p>
              ) : null}

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-1 order-4">
                <a
                  href={'/' + lang + '/contact-us'}
                  className="inline-flex items-center justify-center min-h-[48px] px-6 py-3.5 rounded-xl font-bold text-white bg-slate-950 hover:bg-slate-800 shadow-md active:scale-[0.98] transition-all text-center text-sm sm:text-base"
                >
                  {ctaConsult}
                </a>
                <a
                  href="tel:+982122722876"
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3.5 rounded-xl font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs active:scale-[0.98] transition-all text-center text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span dir="ltr">021-22722876</span>
                </a>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-5 order-2">
              <div className="relative mx-auto w-full max-w-lg">
                <div className="relative overflow-hidden rounded-3xl bg-slate-200 shadow-xl shadow-slate-900/10 border-4 border-white ring-1 ring-slate-200/80">
                  <img
                    src={featuredImage}
                    alt={featuredAlt}
                    className="w-full h-auto aspect-[4/3] object-cover transition duration-700 hover:scale-105"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust & Credibility Strip */}
      <TrustStrip lang={lang} />

      {/* Main Content Sections (Cards Grid) */}
      <section className="py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {content.sections.map((section) => (
              <ContentSection
                key={section.id}
                id={section.id}
                title={section.title}
                text={section.content}
                highlights={section.bold}
              />
            ))}
          </div>

          {/* Data Tables */}
          {content.tables?.map((table, index) => (
            <div className="mt-6 sm:mt-8" key={(table.title || 'table') + '-' + index}>
              <DataTable table={table} />
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      {content.faq && content.faq.length > 0 ? (
        <FaqAccordion faq={content.faq} lang={lang} />
      ) : null}

      {/* Image Gallery */}
      {galleryImages.length > 0 ? (
        <ImageGrid title={content.imageTitle || galleryTitle} images={galleryImages} />
      ) : null}
    </main>
  );
}
`;
}

function buildLanguageRoute(componentName: string, importPath: string): string {
  return `import React from 'react';
import ${componentName} from '${importPath}';

export default function ${componentName}Page() {
  return <${componentName} />;
}
`;
}

function buildRedirectRoute(href: string): string {
  return `import React from 'react';
import { Redirect } from 'expo-router';

export default function RedirectPage() {
  return <Redirect href="${href}" />;
}
`;
}

function buildTreatmentRoute(jsonFileName: string, templateImport: string, componentName: string): string {
  return `import React from 'react';
import { useLanguage } from '../../../../hooks';
import Seo from '../../../../components/seo/Seo';
import ${componentName}Template from '${templateImport}';
import * as text from './${jsonFileName}';

export default function ${componentName}Page() {
  const { lang = 'fa' } = useLanguage() || {};
  const content = text[lang] || text.en;
  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  return (
    <div dir={dir}>
      <Seo
        lang={lang}
        path="/treatments/${jsonFileName.replace('.json', '')}"
        title={content.seoTitle}
        description={content.seoDescription}
        image={content.heroImage}
        faq={content.faq}
      />
      <${componentName}Template
        images={content.images}
        title={content.title}
        sections={content.sections}
        imageTitle={content.imageTitle}
        heroImage={content.heroImage}
        intro={content.intro}
        tables={content.tables}
        faq={content.faq}
      />
    </div>
  );
}
`;
}

function treatmentTemplateForPageType(pageType: PageType): { importPath: string; componentName: string } {
  if (pageType === 'solo-image-content-lines' || pageType === 'hero-with-sections') {
    return {
      importPath: '../../../../components/pageTemplates/SoloImageContentImageLines',
      componentName: 'SoloImageContentImageLines',
    };
  }
  return {
    importPath: '../../../../components/pageTemplates/ContentWithImageGrid',
    componentName: 'ContentWithImageGrid',
  };
}

function updateTreatmentNav(draft: PageDraft): string[] {
  if (draft.navPlacement !== 'treatments') {
    return [];
  }

  const headerPath = path.join(repoRoot, 'components/header/header.json');
  const header = readJson<{ navbar: Record<Language, { dropdown?: { items?: Array<{ text: string; link: string }> } }> }>(headerPath);
  for (const lang of supportedLanguages) {
    const navbar = header.navbar[lang];
    if (!navbar?.dropdown?.items) {
      continue;
    }

    const link = `treatments/${draft.slug}`;
    const exists = navbar.dropdown.items.some((item) => item.link === link);
    if (!exists) {
      navbar.dropdown.items.push({
        text: draft.content[lang].title,
        link,
      });
    }
  }

  writeFileIfChanged(headerPath, `${JSON.stringify(header, null, 2)}\n`);
  return [headerPath];
}

function generateTreatmentPage(draft: PageDraft): string[] {
  const outputFiles: string[] = [];
  const treatmentDir = path.join(repoRoot, 'app/[lang]/treatments', draft.slug);
  const jsonPath = path.join(treatmentDir, `${draft.slug}.json`);
  const indexPath = path.join(treatmentDir, 'index.jsx');
  const redirectPath = path.join(repoRoot, 'app/treatments', draft.slug, 'index.js');
  const template = treatmentTemplateForPageType(draft.pageType);

  const jsonChanged = writeFileIfChanged(jsonPath, `${JSON.stringify(buildPageJson(draft), null, 2)}\n`);
  const routeChanged = writeFileIfChanged(indexPath, buildTreatmentRoute(`${draft.slug}.json`, template.importPath, template.componentName));
  const redirectChanged = writeFileIfChanged(redirectPath, buildRedirectRoute(`/fa/treatments/${draft.slug}`));
  if (jsonChanged) outputFiles.push(jsonPath);
  if (routeChanged) outputFiles.push(indexPath);
  if (redirectChanged) outputFiles.push(redirectPath);
  outputFiles.push(...updateTreatmentNav(draft));
  return outputFiles;
}

function generateNormalPage(draft: PageDraft): string[] {
  if (!normalPageTypes.has(draft.pageType)) {
    throw new Error(`Page type "${draft.pageType}" must use navPlacement "treatments" or pageType "treatment"`);
  }

  const outputFiles: string[] = [];
  const componentName = toPascalCase(draft.slug);
  const pageDir = path.join(repoRoot, 'pages', draft.slug);
  const jsonPath = path.join(pageDir, `${draft.slug}.json`);
  const componentPath = path.join(pageDir, `${componentName}.jsx`);
  const langRoutePath = path.join(repoRoot, 'app/[lang]', `${draft.slug}.jsx`);
  const redirectPath = path.join(repoRoot, 'app', `${draft.slug}.js`);

  const jsonChanged = writeFileIfChanged(jsonPath, `${JSON.stringify(buildPageJson(draft), null, 2)}\n`);
  const componentChanged = writeFileIfChanged(componentPath, buildNormalPageComponent(componentName, `${draft.slug}.json`));
  const routeChanged = writeFileIfChanged(langRoutePath, buildLanguageRoute(componentName, `../../pages/${draft.slug}/${componentName}`));
  const redirectChanged = writeFileIfChanged(redirectPath, buildRedirectRoute(`/fa/${draft.slug}`));
  if (jsonChanged) outputFiles.push(jsonPath);
  if (componentChanged) outputFiles.push(componentPath);
  if (routeChanged) outputFiles.push(langRoutePath);
  if (redirectChanged) outputFiles.push(redirectPath);

  if (draft.navPlacement === 'main') {
    console.warn('navPlacement "main" does not have deterministic Header.jsx support yet; generated page without main nav update.');
  }

  return outputFiles;
}

export function generatePage(draft: PageDraft): string[] {
  if (draft.pageType === 'treatment' || draft.navPlacement === 'treatments') {
    return generateTreatmentPage(draft);
  }
  return generateNormalPage(draft);
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--draft') {
      args.draft = argv[i + 1];
      i += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (!args.draft) {
      args.draft = arg;
    }
  }
  if (!args.draft) {
    throw new Error('Usage: npm run create:page -- --draft <page-draft.json>');
  }
  return args;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const draftPath = path.resolve(repoRoot, args.draft || '');
  const draft = readJson(draftPath);
  validateDraft(draft, path.relative(repoRoot, draftPath));

  if (args.dryRun) {
    console.log(`Valid draft. Would generate page "${draft.slug}" (${draft.pageType}).`);
    return;
  }

  const outputFiles = generatePage(draft);
  console.log(`Generated page "${draft.slug}".`);
  for (const file of outputFiles) {
    console.log(`- ${path.relative(repoRoot, file)}`);
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
