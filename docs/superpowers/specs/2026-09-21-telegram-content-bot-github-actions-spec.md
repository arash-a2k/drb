# Telegram Content Bot - GitHub Actions Architecture Spec

Date: 2026-09-21  
Status: Proposed (Supersedes GCP Cloud Run + Cloud Tasks + GCS design)  
Target Audience: Engineering Lead / Implementing Engineer  

---

## 1. Executive Summary & Why This Architecture

We are replacing the previous design (which relied on GCP Cloud Run, Cloud Tasks queues, GCS optimistic concurrency, and in-container Git operations) with a **Thin Bot + GitHub Actions Engine** architecture.

### Why Pivot to GitHub Actions?

| Problem in Previous Design | How GitHub Actions Solves It |
|---|---|
| **High Complexity / Over-Engineering:** Required GCP Cloud Run, Cloud Tasks, OIDC self-impersonation, Artifact Registry, Secret Manager, and Terraform. | **Zero Custom Infrastructure:** GitHub Actions already provides the runner, job queue, secret store, environment, and logs out-of-the-box. |
| **GCS Database Emulation & Race Conditions:** Used GCS object preconditions (`ifGenerationMatch`) to emulate transactional state. Rapid Telegram photo album uploads caused 412 lock contention and dropped images. | **Stateless Job Dispatch:** Telegram photos are referenced by their native `file_id` strings and dispatched directly to a GitHub workflow. Zero database or lock management needed. |
| **Container Git / RAM Constraints:** Cloud Run was forced to shallow-clone Git, resolve 650MB+ `node_modules`, and process Sharp images inside an in-memory `/tmp` filesystem. | **Native Environment:** GitHub Actions runners have 7 GB RAM, 14 GB SSD, Git pre-installed, and execute inside the checked-out repository with dependencies cached. |
| **Slow Turnaround & 90s Dead Time:** The bot forced a 90-second debounce timer before even showing a confirmation card. | **Interactive & Instant:** Immediate button feedback (`[🚀 Generate Preview]`); total turnaround drops from ~5–6 minutes to under 2.5 minutes. |
| **Cost Parity:** Same $0/month infrastructure cost. | At 5 runs/day (~150 runs/mo), GitHub Actions consumes **~375 minutes/month** out of the **2,000 free monthly minutes** (18.7% quota). Hosting cost is **$0.00/month**. |

---

## 2. Architecture Overview

```
Dentist (Telegram)
      │
      │ 1. Sends text & photos
      ▼
┌──────────────────────────────────────────────┐
│  Thin Telegram Bot                           │
│  (Cloudflare Worker / Vercel / Cloud Run)    │
│  - Verifies user ID against allowlist        │
│  - Collects Telegram file_ids in memory      │
│  - Displays [🚀 Generate Preview] button     │
└──────────────────────┬───────────────────────┘
                       │ 2. POST /actions/workflows/.../dispatches
                       │    (GitHub REST API)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  GitHub Action (.github/workflows/bot-create-page.yml)       │
│                                                              │
│  1. Checkout master & cache dependencies                     │
│  2. Download images from Telegram via file_id                │
│  3. Run `optimize-images.ts` (Sharp -> WebP)                 │
│  4. Run AI Orchestrator (Claude 3.7 Sonnet) -> draft.json   │
│  5. Run `create-page.ts` & `validate-content.ts`             │
│  6. Git commit & push branch `bot/page-<slug>-<run_id>`      │
│  7. Open Pull Request via `gh pr create`                     │
│  8. Build & Export static preview (`EXPO_PUBLIC_PREVIEW=1`)  │
│  9. Deploy preview to `drb-preview` (GitHub Pages)           │
│ 10. POST direct message to Telegram Bot API with URLs        │
└──────────────────────────────────────────────────────────────┘
                       │
                       │ 3. Instant Telegram notification
                       ▼
Dentist receives preview & PR link in chat!
```

---

## 3. End-to-End User Experience

### A. New Page Creation
1. **Intake:**
   - Dentist sends text and 1–10 photos in any order.
   - The bot replies immediately and edits its status message:
     ```text
     📸 3 photos received.
     📝 Title: Dental Implants (ایمپلنت دندان)
     🌐 Detected Language: Persian (fa)

     [ 🚀 Generate Preview ]      [ ❌ Cancel ]
     ```
2. **Execution:**
   - Dentist taps **`[ 🚀 Generate Preview ]`**.
   - Bot updates message:
     ```text
     ⏳ Job started! Building your page and deploying preview...
     Estimated time: ~90 seconds.
     ```
   - Bot triggers `workflow_dispatch` on GitHub with the payload.
3. **Completion:**
   - GitHub Action finishes in ~2 to 2.5 minutes and sends a message directly to the Telegram chat:
     ```text
     🎉 Your page preview is ready!

     🔗 Preview: https://preview.dr-khatayee.com/fa/treatments/dental-implants
     📄 Pull Request: https://github.com/arash-a2k/drb/pull/12

     To request changes, reply:
     /revise <your feedback>
     ```

### B. Revisions (`/revise`)
1. Dentist replies:
   ```text
   /revise make the introduction more friendly and emphasize pain-free anesthesia
   ```
2. The bot fetches the active branch for that chat (or reads the open PR for `bot/page-*`).
3. The bot dispatches the revision workflow on GitHub.
4. GitHub Actions applies the AI patch to `draft.json`, runs `create-page.ts`, commits to the existing branch, rebuilds the preview, and notifies Telegram:
   ```text
   🔄 Preview updated with your requested revisions!
   🔗 https://preview.dr-khatayee.com/fa/treatments/dental-implants
   ```

---

## 4. System Components

### Component 1: Thin Telegram Bot
- **Responsibilities:**
  - Authenticate updates via `X-Telegram-Bot-Api-Secret-Token`.
  - Authorize users against `ALLOWED_TELEGRAM_IDS`.
  - Buffer incoming messages & photo `file_id`s in lightweight memory/cache.
  - Dispatch GitHub Actions workflow runs via Octokit (`workflow_dispatch`).
- **Hosting Options:**
  - **Option A (Recommended):** Cloudflare Worker (100% free, 0ms cold start, KV storage for chat session).
  - **Option B:** Single minimal Cloud Run container (scale-to-zero, $0 cost, simple in-memory session or 1 JSON file in GCS).

### Component 2: GitHub Actions Workflow (`bot-create-page.yml`)
- **Trigger:** `workflow_dispatch`
- **Inputs:**
  - `chat_id`: Telegram chat to report back to.
  - `title`: Extracted or user-specified title.
  - `text`: Raw text submitted by dentist.
  - `photo_file_ids`: Comma-separated Telegram `file_id` strings.
  - `slug`: (Optional) Custom slug override.

#### Workflow Steps:
1. **Repository Setup:**
   ```yaml
   - uses: actions/checkout@v4
   - uses: actions/setup-node@v4
     with:
       node-version: 22
       cache: 'npm'
   - run: npm ci
   ```
2. **Download & Optimize Images:**
   - A short Node script iterates over `photo_file_ids`, calls Telegram's `getFile` API, downloads the images into a temp folder, and runs the existing `optimize-images.ts` script.
3. **AI Generation:**
   - Calls `packages/content-automation/src/services/ai/orchestrator.ts` using **Claude 3.7 Sonnet**.
   - Input: Raw text + images metadata.
   - Output: Valid `PageDraft` JSON.
4. **Deterministic Code Generation:**
   - Runs `packages/content-automation/src/create-page.ts`.
   - Generates routes, JSON translations (`fa`, `en`, `ru`), and updates navigation.
   - Runs `packages/content-automation/src/validate-content.ts` to ensure 100% valid schema and clean build.
5. **Git Commit & PR:**
   - Creates branch `bot/page-<slug>-<run_id>`.
   - Commits generated files and pushes to remote.
   - Opens PR: `gh pr create --title "Add page: <title>" --body "Automated page creation via Telegram"`.
6. **Static Preview Deploy:**
   - Runs `EXPO_PUBLIC_PREVIEW=1 npm run pre-export && npm run pre-deploy`.
   - Pushes exported `dist/` directly to root of `drb-preview` repository (pointing to CNAME `preview.dr-khatayee.com`).
   - Ensures build-time `<meta name="robots" content="noindex,nofollow">` is included.
7. **Telegram Direct Notification:**
   - In the workflow's final step (`if: always()`), makes a `POST` request to `https://api.telegram.org/bot<TOKEN>/sendMessage`.
   - Sends the live preview link + PR link (or an actionable error message if any step failed).

---

## 5. Security & Safety Model

1. **Authentication & Authorization:**
   - Bot checks `ctx.from.id` against `ALLOWED_TELEGRAM_IDS`.
   - Webhook checks `X-Telegram-Bot-Api-Secret-Token`.
2. **GitHub Access:**
   - The bot uses a GitHub Fine-Grained Personal Access Token (or GitHub App) with minimal permissions: `Actions: Read & Write` on `drb`.
   - Inside the Action, `GITHUB_TOKEN` is used for branch creation, PR opening, and repository commits.
3. **SEO Protection:**
   - Build-time `<meta name="robots" content="noindex,nofollow">` enabled when `EXPO_PUBLIC_PREVIEW=1`.
   - Deliberately **no** `Disallow: /` in `robots.txt` so Googlebot crawls, reads the `noindex`, and drops the URL from index.
4. **Content Guardrails:**
   - Strict `PageDraft` schema validation blocks any hallucinated or malformed output before it can ever be committed to a branch.
   - Medical content rules: prompts explicitly prohibit inventing clinical pricing or treatments not mentioned in source notes.

---

## 6. Cost & Limits Analysis

### At 5 runs per day (150 runs / month):
- **GitHub Actions Usage:**
  - Average run duration: ~2.5 minutes.
  - Monthly usage: $150 \times 2.5 = \mathbf{375 \text{ minutes / month}}$.
  - Free tier limit (GitHub Free): **2,000 minutes / month**.
  - Utilization: **18.7%** $\rightarrow$ **Cost: $0.00 / month**.
- **Bot Hosting:**
  - Free tier on Cloudflare Workers or GCP Cloud Run $\rightarrow$ **Cost: $0.00 / month**.
- **Model Costs (Anthropic):**
  - Model: `claude-3-7-sonnet`.
  - Average tokens: ~12K input / ~15K output.
  - Cost per page: ~$0.15.
  - Monthly cost: $150 \times \$0.15 = \mathbf{\sim \$22.50 / month}$ (if maxed at 5 runs/day).

---

## 7. Implementation Plan for Engineer

### Phase 1: GitHub Actions Automation (No bot needed yet)
1. Create `.github/workflows/bot-create-page.yml` with `workflow_dispatch`.
2. Add a CLI runner script in `packages/content-automation/src/cli/create-page-runner.ts` that:
   - Takes CLI inputs (title, text, image paths).
   - Calls the orchestrator, image optimizer, and generator scripts.
3. Test triggering the workflow manually via GitHub Web UI or `gh workflow run` to verify end-to-end PR creation and preview deploy.

### Phase 2: Telegram Downloader Helper
1. Create `packages/telegram-bot/src/downloader.ts` to fetch Telegram photos by `file_id` using the Telegram Bot API.

### Phase 3: Thin Bot Wiring
1. Update `packages/telegram-bot/src/bot.ts`:
   - Replace the multi-step questionnaire with simple message & photo buffering.
   - Add the inline keyboard `[🚀 Generate Preview]`.
   - On button click, call Octokit's `actions.createWorkflowDispatch`.
2. Implement `/revise` to trigger the revision workflow.

### Phase 4: Deploy & Verify
1. Add `TELEGRAM_BOT_TOKEN`, `ANTHROPIC_API_KEY`, and `DEPLOY_PREVIEW_TOKEN` to GitHub Repository Secrets.
2. Deploy the thin bot webhook to Cloudflare Workers or Cloud Run.
3. Verify full loop in Telegram: text + 3 photos $\rightarrow$ PR opened $\rightarrow$ preview deployed $\rightarrow$ link returned to chat.
