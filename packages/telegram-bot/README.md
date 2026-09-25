# Telegram Content Bot (@drb/telegram-bot)

A secure, private Telegram intake bot that enables authorized dental clinicians and administrators to create, preview, revise, and approve fully localized (`fa`, `en`, `ru`), SEO-optimized website pages for [dr-khatayee.com](https://dr-khatayee.com) directly from Telegram.

The bot runs as a lightweight, stateless serverless container on **Google Cloud Run** ($0/month idle), while all heavy computation (image optimization, AI translation via Claude 3.7 Sonnet, static site generation, and preview hosting) is orchestrated asynchronously on **GitHub Actions**.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Security & Privacy Guarantees](#security--privacy-guarantees)
3. [Prerequisites](#prerequisites)
4. [Deployment Guide (Cloud Run)](#deployment-guide-cloud-run)
   - [Step 1: Telegram Bot Setup (@BotFather)](#step-1-telegram-bot-setup-botfather)
   - [Step 2: Obtain GitHub Token / Credentials](#step-2-obtain-github-token--credentials)
   - [Step 3: Store Secrets in GCP Secret Manager](#step-3-store-secrets-in-gcp-secret-manager)
   - [Step 4: Build & Deploy Container to Cloud Run](#step-4-build--deploy-container-to-cloud-run)
   - [Step 5: Verify Webhook Registration](#step-5-verify-webhook-registration)
5. [Local Development & Polling Mode](#local-development--polling-mode)
6. [How to Use the Bot](#how-to-use-the-bot)
   - [Command Reference](#command-reference)
   - [Walkthrough: Creating a New Page](#walkthrough-creating-a-new-page)
   - [Walkthrough: Requesting Revisions](#walkthrough-requesting-revisions)
   - [Walkthrough: Clinical Approval & Publishing](#walkthrough-clinical-approval--publishing)
7. [Operational Safeguards & Troubleshooting](#operational-safeguards--troubleshooting)

---

## Architecture Overview

```
[ Telegram App ]
       │  (1) Dentist sends notes & photos
       ▼
[ Telegram Bot API ]
       │  (2) HTTPS Webhook (verified with secret token)
       ▼
[ Cloud Run: drb-telegram-bot ] ─── (scales to zero when idle)
       │  (3) Authenticates user ID & chat ID (silent drop if unauthorized)
       │  (4) Dispatches workflow via GitHub REST API
       ▼
[ GitHub Actions Runner ]
       ├── Downloads photos from Telegram API
       ├── Sharp: Optimizes & converts to WebP (1800px max, strips EXIF)
       ├── Claude 3.7 Sonnet: Classifies layout, writes SEO Persian copy, translates to EN & RU
       ├── Generates deterministic Expo Router pages & JSON content
       ├── Commits to feature branch `bot/page-<slug>` & creates Draft PR
       ├── Builds static preview with SEO `noindex,nofollow` protection
       ├── Deploys to `preview.dr-khatayee.com` (drb-preview repo)
       └── Sends Telegram notification with preview link & PR details
```

---

## Security & Privacy Guarantees

- **Protected Master Branch & Least Privilege:** The bot is cryptographically and logically prohibited from merging PRs or pushing to `master`/`main`. It can only create branches, push revisions, and deploy previews. Merging to production requires human review and merge directly on GitHub.
- **Strict Silent Drop (Zero-Cost Black Hole):** If an unauthorized user or crawler messages the bot, the bot **does not reply**. It returns immediately with zero outbound network calls, keeping Cloud Run asleep and preventing bot discovery, reconnaissance, and API quota exhaustion.
- **Fail-Closed Webhook Ingress:** Requires `TELEGRAM_WEBHOOK_SECRET` ($\ge 32$ characters). Unauthenticated HTTP calls directly to Cloud Run are rejected immediately (`401 Unauthorized`) before any bot code runs.
- **User & Chat Allowlisting:** Only Telegram User IDs listed in `ALLOWED_TELEGRAM_IDS` can use the bot. If `ALLOWED_CHAT_IDS` is set, requests outside the authorized 1-on-1 chat or group are silently dropped.
- **Stateless Cold-Start Rehydration:** The bot does not require an external database. If Cloud Run restarts or scales down to zero, `/status`, `/revise`, and `/approve` query the GitHub API to seamlessly restore the active PR, branch, and slug.
- **Anti-Abuse Rate Limits:** 
  - Max 5 page dispatches per user per 24 hours.
  - 15 runs/day repository-wide workflow circuit breaker.
  - Maximum 10 photos per session.

---

## Prerequisites

1. **Google Cloud Platform (GCP) Account:**
   - A GCP project with **Cloud Run Admin API**, **Cloud Build API**, and **Secret Manager API** enabled.
   - [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed and logged in (`gcloud auth login`).
2. **Telegram Account:**
   - Access to [@BotFather](https://t.me/botfather).
3. **GitHub Repository Access:**
   - Write access to `arash-a2k/drb` and `arash-a2k/drb-preview`.
   - Anthropic API key added to repository secrets as `ANTHROPIC_API_KEY`.
   - Deploy key with write access to `drb-preview` added as `PREVIEW_DEPLOY_KEY`.

---

## Deployment Guide (Cloud Run)

### Step 1: Telegram Bot Setup (@BotFather)

1. Open Telegram and search for [@BotFather](https://t.me/botfather).
2. Send `/newbot`, choose a name (e.g. `Dr. Khatayee Content Bot`) and a unique username ending in `bot` (e.g. `drkhatayee_content_bot`).
3. Save the **Bot Token** returned by BotFather (e.g., `7123456789:AAH...`).
4. **Configure Privacy Settings:**
   - Send `/setprivacy` -> Select your bot -> Choose **ENABLE** (Default). This ensures that if the bot is in a group chat, it only receives messages prefixed with `/` commands or explicitly mentioning the bot.
   - Send `/setinline` -> Select your bot -> Choose **Disable** (Prevents public mention indexing).
5. **Register Bot Commands:**
   Send `/setcommands` to `@BotFather`, select your bot, and paste the following:
   ```text
   newpage - Start a new page draft session
   status - Show the active draft or PR stage
   revise - Request changes to preview: /revise <notes>
   approve - Approve the current preview for publishing
   cancel - Clear current draft session
   help - List available commands
   ```
6. **Get your Telegram User ID:**
   Message [@userinfobot](https://t.me/userinfobot) to find your numeric Telegram ID (e.g., `123456789`).

---

### Step 2: Obtain GitHub Token / Credentials

Create a GitHub Personal Access Token (Classic) or fine-grained token with `repo` and `workflow` (or `actions:write`) permissions:
- Go to GitHub -> **Settings** -> **Developer settings** -> **Personal access tokens** -> **Generate new token**.
- Select scopes: `repo` (Full control) and `workflow` (Update GitHub Action workflows).
- Alternatively, you can use a GitHub App with installation credentials (configured via `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY`).

---

### Step 3: Store Secrets in GCP Secret Manager

Set your GCP project:
```bash
gcloud config set project dr-bob-website
PROJECT_ID="dr-bob-website"
```

Create the required secrets:

```bash
# 1. Telegram Bot Token
echo -n "YOUR_TELEGRAM_BOT_TOKEN" | gcloud secrets create TELEGRAM_BOT_TOKEN --data-file=-

# 2. GitHub Token (needs actions:write / repo permissions)
echo -n "YOUR_GITHUB_TOKEN" | gcloud secrets create GITHUB_TOKEN --data-file=-

# 3. Allowed User IDs (comma-separated numeric IDs, NOT usernames like @handle)
# To find your numeric Telegram user ID, message @userinfobot or @raw_data_bot on Telegram
echo -n "123456789,987654321" | gcloud secrets create ALLOWED_TELEGRAM_IDS --data-file=-

# 4. Webhook Secret Token (Random string, min 32 chars)
openssl rand -hex 20 | tr -d '\n' | gcloud secrets create TELEGRAM_WEBHOOK_SECRET --data-file=-

# 5. (Optional) Allowed Chat IDs (if restricting bot to a specific private group or chat)
# For Telegram supergroups, IDs are negative numbers (e.g., -100123456789)
echo -n "-100123456789" | gcloud secrets create ALLOWED_CHAT_IDS --data-file=-
```

> [!IMPORTANT]
> **Grant Secret Manager Access to Cloud Run:**  
> By default, Cloud Run uses the Compute Engine default service account (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`), which does not have permission to read secrets. You must grant it the `Secret Manager Secret Accessor` role, or Cloud Run will fail to deploy:
> ```bash
> PROJECT_NUMBER=$(gcloud projects describe dr-bob-website --format='value(projectNumber)')
>
> gcloud projects add-iam-policy-binding dr-bob-website \
>   --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
>   --role="roles/secretmanager.secretAccessor"
> ```

---

### Step 4: Build & Deploy Container to Cloud Run

> [!IMPORTANT]
> The build must be submitted from the **root of the `drb` repository** because `packages/telegram-bot/Dockerfile` copies the root workspace manifests (`package.json`, `package-lock.json`).

From the root directory of `drb`:

```bash
# 1. Build and push container to Google Artifact Registry / Container Registry
gcloud builds submit \
  --config packages/telegram-bot/cloudbuild.yaml \
  --substitutions _IMAGE_TAG="gcr.io/dr-bob-website/drb-telegram-bot:latest" \
  .

# 2. Deploy service to Cloud Run
gcloud run deploy drb-telegram-bot \
  --image "gcr.io/dr-bob-website/drb-telegram-bot:latest" \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --memory 256Mi \
  --set-env-vars GITHUB_REPO="arash-a2k/drb" \
  --set-secrets TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN:latest \
  --set-secrets GITHUB_TOKEN=GITHUB_TOKEN:latest \
  --set-secrets ALLOWED_TELEGRAM_IDS=ALLOWED_TELEGRAM_IDS:latest \
  --set-secrets TELEGRAM_WEBHOOK_SECRET=TELEGRAM_WEBHOOK_SECRET:latest \
  --set-secrets ALLOWED_CHAT_IDS=ALLOWED_CHAT_IDS:latest
```
*(If you configured `ALLOWED_CHAT_IDS`, append `--set-secrets ALLOWED_CHAT_IDS=ALLOWED_CHAT_IDS:latest` to the command).*

---

### Step 5: Verify Webhook Registration

Once deployed, retrieve the assigned Cloud Run public URL:
```bash
SERVICE_URL=$(gcloud run services describe drb-telegram-bot --region europe-west1 --format 'value(status.url)')
echo "Cloud Run URL: $SERVICE_URL"
```

Update the Cloud Run service environment variable with its own public URL:
```bash
gcloud run services update drb-telegram-bot \
  --region europe-west1 \
  --update-env-vars WEBHOOK_URL="$SERVICE_URL"
```

The bot's startup code (`src/index.ts`) automatically registers the webhook with Telegram:
- It calls `bot.api.setWebhook(WEBHOOK_URL, { secret_token: TELEGRAM_WEBHOOK_SECRET })`.
- Telegram will now deliver all updates securely via HTTPS POST to your Cloud Run endpoint.

To verify health:
```bash
curl "$SERVICE_URL/healthz"
# Expected response: {"status":"ok","service":"telegram-bot"}
```

---

## Local Development & Polling Mode

For local development or testing without Cloud Run, you can run the bot in long-polling mode:

1. Create a local `.env` file in `packages/telegram-bot/`:
   ```bash
   TELEGRAM_BOT_TOKEN="your_bot_token"
   ALLOWED_TELEGRAM_IDS="your_telegram_id"
   ADMIN_TELEGRAM_IDS="your_telegram_id"
   GITHUB_TOKEN="your_github_token"
   GITHUB_REPO="arash-a2k/drb"
   ```
   *(Do not set `WEBHOOK_URL` locally — omitting it enables long-polling mode automatically).*

2. Run the test smoke suite:
   ```bash
   npm run bot:smoke
   ```

3. Start the bot locally:
   ```bash
   npm run bot:dev
   ```

---

## How to Use the Bot

### Command Reference

| Command | Permission | Description |
|---|---|---|
| `/start` | Allowlisted | Verifies authorization and displays a greeting. |
| `/help` | Allowlisted | Lists available commands. |
| `/newpage` | Allowlisted | Clears any pending intake buffer and starts a fresh page creation draft. |
| `/cancel` | Allowlisted | Discards the current draft session. |
| `/status` | Allowlisted | Displays active draft intake card, or queries GitHub for the current open PR and stage. |
| `/revise <notes>` | Allowlisted | Requests changes on the active preview (e.g. `/revise shorten intro and focus on ceramic veneers`). |
| `/approve` | Allowlisted | Clinically approves the current preview. Marks PR ready for review and records clinician sign-off on GitHub. |

---

### Walkthrough: Creating a New Page

```
Dentist                         Telegram Bot                       GitHub Actions
   │                                  │                                  │
   │─── /newpage ────────────────────>│                                  │
   │<── "Send notes & photos" ────────│                                  │
   │                                  │                                  │
   │─── Sends photos (up to 10) ─────>│                                  │
   │─── Sends Persian treatment text >│                                  │
   │<── Interactive Draft Card ───────│                                  │
   │    [🚀 Generate Preview]         │                                  │
   │                                  │                                  │
   │─── Taps [🚀 Generate Preview] ──>│                                  │
   │<── "⏳ Building preview (~90s)" ─│─── Dispatches bot-create-page ──>│
   │                                  │                                  │
   │<── "🎉 Preview is Ready! ────────┼──────────────────────────────────│
   │     🔗 preview.dr-khatayee.com   │                                  │
   │     📦 Draft PR #42"             │                                  │
```

1. **Start Draft:** Send `/newpage` to the bot.
2. **Send Content:**
   - Send the title or raw treatment notes in Persian. (The first line is treated as the tentative title).
   - Send photos (before/after clinical pictures). You can send up to 10 photos.
3. **Generate:** The bot presents an interactive summary card. Tap **🚀 Generate Preview**.
4. **Wait ~90 seconds:** GitHub Actions downloads the high-res photos, optimizes them to WebP via `sharp`, invokes Claude 3.7 Sonnet for SEO copywriting and English/Russian translations, validates schemas, creates a draft PR, and deploys the static preview.
5. **Inspect Preview:** The bot sends you a notification with:
   - Live preview link (e.g., `https://preview.dr-khatayee.com/fa/treatments/dental-implants`).
   - GitHub Draft PR link.

---

### Walkthrough: Requesting Revisions

If the preview needs modifications (e.g. copy adjustments, emphasis on materials, tone change):

1. Type:
   ```text
   /revise make the hero subtitle shorter and highlight the 10-year warranty in the pricing section
   ```
2. The bot rehydrates your session from the active GitHub PR, dispatches `bot-revise-page.yml`, and responds:
   ```text
   ⏳ Revision submitted! GitHub Actions is updating preview for dental-implants...
   ```
3. Once updated, you will receive a new notification that the preview has been refreshed.

---

### Walkthrough: Clinical Approval & Publishing

In compliance with clinical and patient privacy standards, every newly generated page begins as a **Draft PR** with a Clinical Privacy Checklist:
- [ ] Patient consent verified for clinical photos.
- [ ] No patient identifiable information (PHI/names/records) in images or text.
- [ ] Medical claims and contraindications clinically accurate.
- [ ] Approved by supervising clinician.

#### Step 1: Clinician Sign-off (`/approve`)
When the supervising dentist is satisfied with the preview:
```text
/approve
```
The bot:
1. Locates the open PR on GitHub.
2. Posts a signed clinical approval comment containing the clinician's Telegram username, ID, and audit timestamp.
3. Marks the Pull Request as **Ready for Review** (un-drafts it).

#### Step 2: Human Review & Merge to Production on GitHub
For safety, quality control, and branch protection, **the bot cannot merge pull requests to master**.
Once clinical approval is recorded via `/approve`:
1. A repository maintainer reviews the Pull Request on GitHub.
2. Verifies that all automated CI checks (schema validation, static web export, smoke tests) pass and that the clinician sign-off comment is present.
3. Merges the PR directly on GitHub (**Squash and merge**).
4. GitHub Pages automatically rebuilds and deploys the production website (`dr-khatayee.com`).

---

## Operational Safeguards & Troubleshooting

### Daily Rate Limit Trip
- If a user sends more than 5 requests in 24 hours, the bot blocks the dispatch with:
  `⚠️ Daily limit reached: You have reached the maximum limit of 5 page generations/revisions per 24 hours.`
- If the repository experiences more than 15 total workflow runs in a day, the workflow circuit breaker trips to protect GitHub Actions quota.

### Slug Collision
- If a page title produces a slug that conflicts with an existing page (or reserved routes like `contact`, `about`, `home`), the workflow halts safely and sends an actionable message:
  `❌ Page generation failed: slug "contact" is already in use by an existing page.`
- Fix: Use `/newpage` with a more descriptive title (e.g. `Emergency Contact Consultation`).

### Checking Cloud Run Logs
To view live logs from Cloud Run:
```bash
gcloud run services logs read drb-telegram-bot --region europe-west1 --limit 50
```
*(All rejected unauthorized requests are logged as `Blocked unauthorized Telegram user (silent drop)` with zero replies sent).*
