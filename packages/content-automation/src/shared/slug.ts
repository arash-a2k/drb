import fs from 'fs';
import path from 'path';
import { repoRoot } from './paths.ts';

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'home',
  'about',
  'about-us',
  'contact',
  'contact-us',
  'faq',
  'index',
  'treatments',
  'services',
  'admin',
  'api',
  'assets',
  'public',
  'drafts',
]);

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || `page-${Date.now()}`;
}

export function validateSlugFormat(slug: string): void {
  if (!slug || !SLUG_REGEX.test(slug)) {
    throw new Error(
      `Security validation error: Invalid slug format: "${slug}". Must only contain lowercase alphanumeric characters and single hyphens (^[a-z0-9]+(?:-[a-z0-9]+)*$). Path traversal is forbidden.`
    );
  }
}

export function isSlugReserved(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export function checkSlugCollision(slug: string, repoRootDir = repoRoot): { collides: boolean; conflictingPaths: string[] } {
  const conflictingPaths: string[] = [];

  const candidatePaths = [
    path.join(repoRootDir, 'pages', slug),
    path.join(repoRootDir, 'app', `${slug}.js`),
    path.join(repoRootDir, 'app', `${slug}.jsx`),
    path.join(repoRootDir, 'app', slug),
    path.join(repoRootDir, 'app/[lang]', `${slug}.jsx`),
    path.join(repoRootDir, 'app/[lang]', `${slug}.js`),
    path.join(repoRootDir, 'app/[lang]', slug),
    path.join(repoRootDir, 'app/[lang]/treatments', slug),
    path.join(repoRootDir, 'app/treatments', slug),
    path.join(repoRootDir, 'packages/content-automation/drafts', `${slug}.draft.json`),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      conflictingPaths.push(path.relative(repoRootDir, candidate));
    }
  }

  return {
    collides: conflictingPaths.length > 0,
    conflictingPaths,
  };
}

export function validateSlugAvailability(slug: string, repoRootDir = repoRoot): void {
  validateSlugFormat(slug);

  if (isSlugReserved(slug)) {
    throw new Error(
      `Security validation error: Slug "${slug}" is a reserved system route and cannot be used for new pages.`
    );
  }

  const { collides, conflictingPaths } = checkSlugCollision(slug, repoRootDir);
  if (collides) {
    throw new Error(
      `Slug collision error: Slug "${slug}" collides with existing website route(s): ${conflictingPaths.join(
        ', '
      )}. Please choose a distinct title or use /revise to update an existing draft.`
    );
  }
}
