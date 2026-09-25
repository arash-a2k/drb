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

export type ContentSectionDraft = {
  id: string;
  title: string;
  content: string;
  bold?: string[];
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type DataTable = {
  title: string;
  description?: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string>>;
};

export type PageContentDraft = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  heroImage?: string;
  sections: ContentSectionDraft[];
  faq?: FaqItem[];
  tables?: DataTable[];
};

export type PageImageDraft = {
  telegramFileId?: string;
  sourcePath?: string;
  src: string;
  alt: Record<Language, string>;
};

export type PageDraft = {
  slug: string;
  sourceLanguage: Language;
  pageType: PageType;
  navPlacement: NavPlacement;
  canonicalPath?: string;
  targetKeywords?: string[];
  content: Record<Language, PageContentDraft>;
  images: PageImageDraft[];
};

export const supportedLanguages: Language[] = ['fa', 'en', 'ru'];
