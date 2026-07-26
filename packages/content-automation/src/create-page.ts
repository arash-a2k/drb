#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

type Language = 'fa' | 'en' | 'ru';
type PageType =
  | 'single-column'
  | 'two-column'
  | 'hero-with-sections'
  | 'content-with-image-grid'
  | 'solo-image-content-lines'
  | 'gallery-only'
  | 'treatment';
type NavPlacement = 'none' | 'main' | 'treatments';

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

type PageImageDraft = {
  telegramFileId?: string;
  sourcePath?: string;
  src: string;
  alt: Record<Language, string>;
};

type PageDraft = {
  slug: string;
  sourceLanguage: Language;
  pageType: PageType;
  navPlacement: NavPlacement;
  canonicalPath?: string;
  targetKeywords?: string[];
  content: Record<Language, PageContentDraft>;
  images: PageImageDraft[];
};

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

const packageRoot: string = path.resolve(__dirname, '..');
const repoRoot: string = path.resolve(packageRoot, '../..');
const supportedLanguages: Language[] = ['fa', 'en', 'ru'];
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

function validateDraft(draft: unknown, sourceLabel: string): asserts draft is PageDraft {
  const schema = readJson(path.join(packageRoot, 'schemas/pageDraft.schema.json'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (validate(draft)) {
    return;
  }

  const errors = (validate.errors || [])
    .map((error: { instancePath?: string; message?: string }) => `${error.instancePath || '/'} ${error.message}`)
    .join('\n');
  throw new Error(`Invalid PageDraft ${sourceLabel}:\n${errors}`);
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
import { ContentSection, DataTable } from '../../components/common';
import ImageGrid from '../../components/imageGrid/ImageGrid';
import * as text from './${jsonFileName}';

export default function ${componentName}() {
  const { lang = 'fa' } = useLanguage() || {};
  const content = text[lang] || text.en;
  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  return (
    <main dir={dir} className="bg-[#f6f8f7] text-slate-950">
      <Seo lang={lang} title={content.seoTitle} description={content.seoDescription} path="/${jsonFileName.replace('.json', '')}" image={content.heroImage} />
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="text-4xl font-black leading-tight sm:text-5xl">{content.title}</h1>
        {content.intro && <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">{content.intro}</p>}
      </section>

      <section className="bg-white py-10 sm:py-14">
        <div className="container mx-auto flex flex-col space-y-6 px-4">
          {content.sections.map((section) => (
            <ContentSection
              key={section.id}
              id={section.id}
              title={section.title}
              text={section.content}
              highlights={section.bold}
            />
          ))}
          {content.tables?.map((table, index) => (
            <DataTable key={\`\${table.title || 'table'}-\${index}\`} table={table} />
          ))}
        </div>
      </section>

      <ImageGrid title={content.imageTitle} images={content.images} />
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
      />
      <${componentName}Template
        images={content.images}
        title={content.title}
        sections={content.sections}
        imageTitle={content.imageTitle}
        heroImage={content.heroImage}
        tables={content.tables}
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

function generatePage(draft: PageDraft): string[] {
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

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
