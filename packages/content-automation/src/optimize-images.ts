#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

type ParsedArgs = {
  inputs: string[];
  outDir: string;
  slug: string;
  maxWidth: number;
  quality: number;
  manifest?: string;
};

type OptimizedImage = {
  sourcePath: string;
  outputPath: string;
  publicSrc: string;
  width: number;
  height: number;
  bytes: number;
};

const packageRoot: string = path.resolve(__dirname, '..');
const repoRoot: string = path.resolve(packageRoot, '../..');
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'image';
}

function parsePositiveInt(value: string | undefined, fallback: number, name: string): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    inputs: [],
    outDir: 'assets/images/generated',
    slug: 'page',
    maxWidth: 1800,
    quality: 82,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') {
      const input = argv[i + 1];
      if (!input) throw new Error('--input requires a file or directory path');
      args.inputs.push(input);
      i += 1;
    } else if (arg === '--out-dir') {
      const outDir = argv[i + 1];
      if (!outDir) throw new Error('--out-dir requires a path');
      args.outDir = outDir;
      i += 1;
    } else if (arg === '--slug') {
      const slug = argv[i + 1];
      if (!slug) throw new Error('--slug requires a value');
      args.slug = slugify(slug);
      i += 1;
    } else if (arg === '--max-width') {
      args.maxWidth = parsePositiveInt(argv[i + 1], args.maxWidth, '--max-width');
      i += 1;
    } else if (arg === '--quality') {
      args.quality = parsePositiveInt(argv[i + 1], args.quality, '--quality');
      if (args.quality > 100) {
        throw new Error('--quality must be <= 100');
      }
      i += 1;
    } else if (arg === '--manifest') {
      const manifest = argv[i + 1];
      if (!manifest) throw new Error('--manifest requires a path');
      args.manifest = manifest;
      i += 1;
    } else {
      args.inputs.push(arg);
    }
  }

  if (!args.inputs.length) {
    throw new Error('Usage: npm run optimize:images -- --input <file-or-dir> --slug <page-slug>');
  }

  return args;
}

function collectImageFiles(inputPaths: string[]): string[] {
  const files: string[] = [];
  for (const inputPath of inputPaths) {
      const absoluteInput = path.resolve(repoRoot, inputPath);
    if (!fs.existsSync(absoluteInput)) {
      throw new Error(`Input does not exist: ${inputPath}`);
    }

    const stat = fs.statSync(absoluteInput);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absoluteInput)) {
        const absoluteEntry = path.join(absoluteInput, entry);
        if (fs.statSync(absoluteEntry).isFile() && allowedExtensions.has(path.extname(entry).toLowerCase())) {
          files.push(absoluteEntry);
        }
      }
    } else if (stat.isFile() && allowedExtensions.has(path.extname(absoluteInput).toLowerCase())) {
      files.push(absoluteInput);
    }
  }

  const uniqueFiles = [...new Set(files)].sort((a, b) => a.localeCompare(b));
  if (uniqueFiles.length > 10) {
    throw new Error(`A page can include at most 10 images; received ${uniqueFiles.length}`);
  }
  return uniqueFiles;
}

function toPublicSrc(outputPath: string): string {
  const relative = path.relative(path.join(repoRoot, 'assets'), outputPath).split(path.sep).join('/');
  return `/assets/${relative}`;
}

async function optimizeImage(filePath: string, index: number, args: ParsedArgs): Promise<OptimizedImage> {
  const outputDir = path.resolve(repoRoot, args.outDir, args.slug);
  fs.mkdirSync(outputDir, { recursive: true });

  const baseName = slugify(path.basename(filePath, path.extname(filePath)));
  const outputPath = path.join(outputDir, `${args.slug}-${String(index + 1).padStart(2, '0')}-${baseName}.webp`);

  const image = sharp(filePath, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const resizeWidth = metadata.width && metadata.width > args.maxWidth ? args.maxWidth : undefined;

  await image
    .resize({ width: resizeWidth, withoutEnlargement: true })
    .webp({ quality: args.quality, effort: 5 })
    .toFile(outputPath);

  const optimizedMetadata = await sharp(outputPath).metadata();
  const outputStat = fs.statSync(outputPath);
  return {
    sourcePath: path.relative(repoRoot, filePath),
    outputPath: path.relative(repoRoot, outputPath),
    publicSrc: toPublicSrc(outputPath),
    width: optimizedMetadata.width || 0,
    height: optimizedMetadata.height || 0,
    bytes: outputStat.size,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const imageFiles = collectImageFiles(args.inputs);
  if (!imageFiles.length) {
    throw new Error('No supported image files found');
  }

  const optimized: OptimizedImage[] = [];
  for (let index = 0; index < imageFiles.length; index += 1) {
    optimized.push(await optimizeImage(imageFiles[index], index, args));
  }

  const manifestPath = args.manifest
    ? path.resolve(repoRoot, args.manifest)
    : path.resolve(repoRoot, args.outDir, args.slug, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify({ images: optimized }, null, 2)}\n`);

  console.log(`Optimized ${optimized.length} image(s).`);
  for (const image of optimized) {
    console.log(`- ${image.publicSrc} (${image.width}x${image.height}, ${image.bytes} bytes)`);
  }
  console.log(`Manifest: ${path.relative(repoRoot, manifestPath)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
