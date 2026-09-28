# Instructions
This project is based on `expo-router` and its static serving. Components are created with vanila react html components. `Expo` is only used because of expo router and static serving. For styling `tailwind` is used.

## How to Deploy to Production (`dr-khatayee.com`)
1. **Automated Deployment (Recommended):**
   Whenever a pull request is merged into `master`, the GitHub Actions workflow `.github/workflows/deploy-production.yml` automatically builds the static site (`npm run pre-export && npm run pre-deploy`) and publishes it to the `gh-pages` branch with the `dr-khatayee.com` CNAME and `.nojekyll`. The live website updates automatically within ~60 seconds.

2. **Manual Deployment (Fallback):**
   - Run `npm run pre-export` (clears and copies assets to `public/assets/`, touches `.nojekyll`).
   - Run `npm run pre-deploy` (exports the web build to `dist/`).
   - Run `npm run deploy` (publishes `dist/` to `gh-pages` with `--cname dr-khatayee.com`).

**Important Notes:**
- The `google8b1d1cbfffc4755f.html` verification file must be kept in `public/` to prove site ownership to Google Search Console.
- The `CNAME` file must exist at the root with `dr-khatayee.com` for GitHub Pages custom domain routing.
- The `.nojekyll` file must be present so GitHub Pages does not run Jekyll and omits `_expo/` assets.

## Preview Deployments (`preview.dr-khatayee.com`)
Because GitHub Pages only allows **one** custom domain per repository, automated preview builds use a dedicated companion repository:
- **Repository:** [`arash-a2k/drb-preview`](https://github.com/arash-a2k/drb-preview)
- **Branch:** `main` (root directory `/`)
- **Custom Domain:** `preview.dr-khatayee.com` (with HTTPS enforced)
- **DNS Record:** CNAME `preview` pointing to `arash-a2k.github.io`
- **Automation:** When the Telegram content bot runs (`bot-create-page.yml` or `bot-revise-page.yml`), GitHub Actions builds static preview files (`EXPO_PUBLIC_PREVIEW=1`) and pushes them to `drb-preview` via the `PREVIEW_DEPLOY_KEY` deploy key. The preview site is immediately live and verified with `noindex,nofollow` robots tags.

## Telegram Content Bot
The repository includes a private Telegram intake bot in `packages/telegram-bot/` that allows authorized dentists to create, preview, revise, and approve localized website pages directly via chat.
- **Full Guide:** See [Telegram Bot README](file:///./packages/telegram-bot/README.md) for deployment to Google Cloud Run, GitHub Actions secrets configuration, and usage instructions.
- **Smoke Check:** `npm run bot:smoke`

## Content Automation Commands
These commands belong to the monorepo content automation package at `packages/content-automation`. They are used by the Telegram bot workflows and GitHub Actions validation.

### `npm run validate:content`
Validates generated page draft JSON files against `packages/content-automation/schemas/pageDraft.schema.json`.

Default sample validation:

```bash
npm run validate:content
```

Validate a specific draft:

```bash
npm run validate:content -- --file path/to/page-draft.json
```

Meaning: the page content has the required `fa`, `en`, and `ru` fields, valid page type, valid navigation placement, valid image references, SEO metadata, sections, FAQ shape, and other schema rules.

### `npm run create:page`
Creates website files from a validated page draft.

Dry run:

```bash
npm run create:page -- --draft packages/content-automation/schemas/examples/pageDraft.sample.json --dry-run
```

Real generation:

```bash
npm run create:page -- --draft path/to/page-draft.json
```

Meaning: the script turns structured content into route files, translated JSON, page components when needed, treatment routes, redirects, and optional treatment navigation updates. The dry run only checks that the draft is valid and reports what would be generated.

### `npm run optimize:images`
Compresses source images into WebP files for the website.

Example:

```bash
npm run optimize:images -- --input path/to/images --slug dental-laminates
```

Meaning: the script accepts up to 10 images, resizes large images, strips metadata, converts them to `.webp`, writes them under `assets/images/generated/<slug>/`, and creates a manifest with public `/assets/...` paths.

### `npm --workspace @drb/content-automation run orchestrate:page:smoke`
Runs a local smoke test for the AI page draft orchestrator.

```bash
npm --workspace @drb/content-automation run orchestrate:page:smoke
```

Meaning: this does not call a real AI provider and does not write website files. It uses a mock AI client to simulate page classification, Persian SEO optimization using the prompt contract, translation, markdown-wrapped JSON parsing, final `PageDraft` assembly, and schema validation.

This command is also run in `.github/workflows/validate.yml` so pull requests can verify the AI orchestration contract without needing API keys.


## How does development/expo web works
- `+html.jsx` is a static file which covers the template of all genarated html files. It cannot have react logic and all the JS logic will only be run during export/deployment and under ndoeJS env.
- `_layout.jsx` is used to cover for common template of all of the pages. For example the context providers, header, footer etc.

- components are under `/components`
- Pages are under `app/`
- Everything under `app/` is used to serve the website.
- Everything under such paths `[lang]` will get dynamic path for lang value.
- `generateStaticParams` async function defines the possible values for this dynamic [lang] to genarate the static rendering.
- Translations are handled with the help of language hook and translation .json file under each page or components.

- `app/index.js` is for the index page. so `dr-khatayee.com/`.
- Any path under `app/` will be used by the expo router to serve static pages. For example `app/about-us.jsx` will server `dr-khatayee.com/about-us` and `app/dental-implants/index.jsx` for `dr-khatayee.com/dental-implants/`.



## Things to take care while development
### Tailwind Configuration
Take care how to configure tailwind config. For example on this configuration of `tailwind.config.js` `module.exports = {
  content: [
      "./pug/*.pug",
      "./html/*.html",
      "./pages/**/*.{js,tsx,ts,jsx}",
      "./components/**/*.{js,tsx,ts,jsx}",
      // Ensure this points to your source code...
      './*.{js,tsx,ts,jsx}',
    // If you use a `src` folder, add: './src/**/*.{js,tsx,ts,jsx}'
    // Do the same with `components`, `hooks`, `styles`, or any other top-level folders...
  ], ...`

For the content part it is important to make sure only pages and components or anything react related is configured. A bad configuration will include as well node_modules, which will cause the run and export procedures taking forever.
