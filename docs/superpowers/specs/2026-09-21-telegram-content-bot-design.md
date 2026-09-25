# Telegram Content Bot - Design

Date: 2026-09-21
Status: Approved for planning
Supersedes the hosting/preview assumptions in `TELEGRAM_CONTENT_BOT_PLAN.md`

## 1. Goal

A dentist submits page content through a Telegram chat. The system optimizes it for
SEO, generates a translated page in this repo, opens a GitHub PR, deploys a preview
that search engines will not index, and returns the link. The dentist requests changes
in chat; each accepted change becomes a new commit on the same PR and a refreshed
preview.

## 2. Where the repo already is

Committed on `feat/uplift-ai`. Four of the five CI steps were run locally and pass on
Node 22.13.1 (validate:content, orchestrator smoke, bot smoke, create:page dry-run);
the fifth, `npm run pre-deploy`, was not run locally and is verified only in CI.

| Capability | Location |
|---|---|
| PageDraft schema + validator | `packages/content-automation/schemas/`, `src/validate-content.ts` |
| Page generator (normal + treatment) | `src/create-page.ts` |
| Image optimizer (sharp -> WebP) | `src/optimize-images.ts` |
| AI prompt contracts | `prompts/{seo-page-optimizer,translate-page,classify-page-type}.md` |
| AI orchestrator w/ retries + schema validation | `src/services/ai/orchestrator.ts` |
| CI validation workflow | `.github/workflows/validate.yml` |

Uncommitted: `packages/content-automation/src/shared/` (types + paths extraction) and
`packages/telegram-bot/` (grammy scaffold, allowlist middleware, JSON logger, command
stubs). Both should be committed before new work starts.

Not started: real AI client, intake, persistence, GitHub automation, preview deploy,
revision loop, infrastructure.

## 3. Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Preview on **GitHub Pages**, not Cloudflare/Netlify/Vercel | No new vendor. Accepted cost: no custom HTTP headers, so exclusion is a meta tag. |
| D2 | **Single live preview at the domain root** of a separate `drb-preview` repo, CNAME `preview.dr-khatayee.com` | Serving from root means every `/assets/...` path in content JSON works unchanged - no `baseUrl` config, no deploy-time path rewriting. Cost: one preview live at a time, last deploy wins. Acceptable for a single clinic. |
| D3 | **Build-time `<meta name="robots" content="noindex,nofollow">`**, and deliberately **no `robots.txt` Disallow** | A Disallow would stop Google reading the noindex, and it could index the bare URL from any stray link. Crawl must be allowed for noindex to be honored. |
| D4 | **GCP Cloud Run + Telegram webhook**, not an always-on host | Scales to zero, fits GCP free tier. Rejected scheduled polling: at 10-minute intervals intake alone takes 35-70 minutes, which is not a chat interface. Webhooks are faster, cheaper, and simpler than Scheduler. |
| D5 | **One** Cloud Run service, three routes | A webhook/worker split was justified only by cold start; `sharp` adds ~300-500ms to require, so one image starts in ~2-4s. Not worth doubling the infra. |
| D6 | **GCS for all state**, no Firestore | Generation preconditions (`ifGenerationMatch`) give optimistic concurrency, which is sufficient. |
| D7 | **One Cloud Tasks task type**, payload `{ jobId }`, worker is a reconciler | Same queue and endpoint serve the intake debounce and the PR work. New page and revision share one code path. |
| D8 | **3 intake states**, not a 6-prompt wizard | Language, page type, nav placement, title and slug are all inferable from the submitted text. Only the slug warrants a confirmation tap, because it fixes the URL and every generated file path. |
| D9 | **5 AI-backed mutations per user per day**, Asia/Tehran boundary | Bounds the only meaningful cost. ~$75/month if fully maxed. |
| D10 | **`claude-opus-5`** with adaptive thinking | Latest and most capable. Do not use `budget_tokens` (rejected on this model) or assistant prefill (rejected). |
| D11 | **One dedicated service account** | The IAM bindings are needed regardless; a dedicated SA is one extra Terraform resource and avoids scoping them onto the shared default compute SA. |
| D12 | Bot calls the **existing scripts unmodified** | Determinism. Same input produces the same output. No bot code writes route/component internals. |

### Measured, not assumed

Worst-case input (ten 10 MB JPEGs, 4000x3000, EXIF orientation set so auto-rotate
forces full decode):

| Step | Peak RSS | Time (12 cores) |
|---|---|---|
| `optimize-images`, 10 photos | 285 MB | 6.6 s |
| `create-page` | 85 MB | 0.13 s |
| `orchestrator` (stub client) | 90 MB | 0.11 s |

Repo footprint: 58 MB tree, 27 MB `.git`, 659 MB `node_modules`.
Cloud Run sizing follows from this: **2 vCPU / 2 GB**.

## 4. Architecture

```
Telegram ──webhook──▶ ┌──────────────────────────┐
                      │  drb-bot (Cloud Run)     │
GitHub  ──webhook──▶  │  POST /telegram          │
                      │  POST /task    (OIDC)    │──enqueue──▶ Cloud Tasks
Cloud Tasks ────────▶ │  POST /github  (HMAC)    │◀────────────────┘
                      └────────────┬─────────────┘
                                   │
                        GCS: gs://drb-bot-state
                                   │
                          git push / Octokit
                                   ▼
                       GitHub repo ──Actions──▶ drb-preview repo
                                                  preview.dr-khatayee.com
```

| Route | Caller | Auth | Responsibility |
|---|---|---|---|
| `POST /telegram` | Telegram | `secret_token` header | allowlist, append to GCS, enqueue, fast ack |
| `POST /task` | Cloud Tasks | OIDC | the reconciler - all model calls live here |
| `POST /github` | GitHub Actions | HMAC signature | preview ready/failed -> notify via Telegram |

**Invariant: `/telegram` never calls Anthropic.** It does auth, one GCS write, one
enqueue, and a short acknowledgement - always inside Telegram's retry window. Every
model call happens under `/task`.

Service config: concurrency ~10 (chat stays responsive while a long task runs on the
same instance; `sharp` runs in the libuv threadpool and does not block the event loop),
request timeout 30 min (Cloud Tasks HTTP dispatch deadline), min instances 0.

## 5. State model (GCS)

```
gs://drb-bot-state/
  chats/<chatId>/session.json          FSM phase, active job pointer   [generation-guarded]
  chats/<chatId>/pending.json          in-flight submission buffer     [generation-guarded]
  jobs/<jobId>/job.json                status, slug, branch, prNumber  [generation-guarded]
  jobs/<jobId>/events.jsonl            append-only audit log
  jobs/<jobId>/images/raw/NN.<ext>     Telegram originals
  jobs/<jobId>/images/opt/NN.webp      post-sharp
  jobs/<jobId>/draft.json              generated PageDraft
  limits/<telegramUserId>/<YYYY-MM-DD>.json   daily mutation counter
```

Every mutation goes through one helper:

```
read(path)            -> { body, generation }
mutate in memory
write(path, body, ifGenerationMatch: generation)
  200 -> committed
  412 -> re-read and retry (bounded: 3 attempts, then fail the job with a clear reason)
```

Ordering defence in depth: `setWebhook` with `max_connections: 1` makes Telegram
deliver serially, and the Tasks queue runs `max_concurrent_dispatches = 1`.
Preconditions then only catch genuine races.

Lifecycle rule: delete `jobs/**` after 30 days.

Free-tier fit: ~2 GCS ops per chat turn, ~1,500 Class A ops/month against 5,000 free.

## 6. Intake

```
/newpage  ->  collecting  ->  confirming  ->  processing  ->  preview_ready  ->  revising
```

The dentist sends **text and photos in any order, as many messages as they like**.
Nothing else is asked.

### Why a collection window is unavoidable

Telegram delivers each photo of an album as a **separate update sharing a
`media_group_id`, with no album-complete event**. The bot cannot know which photo is
last. Therefore:

- every incoming message appends to `pending.json` and stamps `lastMessageAt`
- every incoming message enqueues a finalize task at **T+90s**
- a finalize task that runs while `lastMessageAt` is newer than 90s exits and lets a
  later task handle it (idempotent; avoids Cloud Tasks name-reuse restrictions)
- `/done` fires it immediately

Related limits: album captions cap at 1024 chars (too short for a treatment page),
plain messages at 4096. So page text arrives as its own message - which the
order-insensitive buffer handles for free.

### Confirmation

One classifier call (~$0.02) populates a single card before the expensive SEO and
translation steps run:

```
Ready to generate:
  Title:    <detected>
  Slug:     <ascii slug derived from title>
  Type:     <pageType> -> <navPlacement>
  Language: <fa|en|ru>   Images: <n>
  [Generate]  [Change slug]  [Cancel]
```

Only the slug is worth confirming: it fixes the URL and every generated file path, and
changing it later means renaming routes and redirects. Everything else on the card is
cheap to correct through `/revise`.

Validation at finalize: text present, <=10 images, each image a supported MIME type and
within Telegram's 20 MB `getFile` limit, and the user under the daily cap.

## 7. The reconciler

One task type. Payload `{ jobId }`. The worker loads the job and advances it.

```
reconcile(job):
  'collecting' -> debounce check -> classify -> post confirm card -> 'confirming'
  'queued'     -> optimize images
               -> generatePageDraft (classify -> SEO -> translate)
               -> upsertPR
               -> 'previewing'
```

### upsertPR

```
branch = bot/page-<slug>-<jobId>
if !job.prNumber:
  shallow-clone, branch from master, write files, commit, push, open PR, save prNumber
else:
  fetch branch, write files, commit, push, comment on PR
```

Writing files always means: copy optimized images into `assets/`, then run
`create-page` and `validate-content` **unmodified**. A revision is not a separate
pipeline - it patches `draft.json` and calls the same `upsertPR`, so the validity gate
lives in exactly one place.

PR title `Add page: <slug>`; body carries source title, page type, target keywords,
generated routes, image count, preview placeholder, and the Telegram job ID.

### AI pipeline

`claude-opus-5`, adaptive thinking, `output_config.format` for schema-valid JSON.
The orchestrator already retries on parse/validation failure and refuses to write repo
files. Estimated ~12K input / 15-25K output tokens per page, roughly $0.40-0.75.
Persian and Russian tokenize 2-3x worse than English, which is why output dominates.

## 8. Revisions and validity

`/revise <free text>` stores the request and enqueues `{ jobId }`. The worker classifies
it into a typed intent:

`edit_section` | `replace_image` | `change_title` | `change_nav` | `regenerate_seo` | `out_of_scope`

`/approve` records preview approval in the job event log and notifies; it never merges.
Production merge is a separate admin-only action (`/merge`), per the existing bot
scaffold. This keeps preview approval and production deploy distinct.

**Validity sense 1 - in scope.** `out_of_scope` returns a reason, relayed verbatim,
and does **not** count against the daily cap. Requests like "redesign the whole site"
or "change prices everywhere" land here.

**Validity sense 2 - output still validates.** The patched draft must pass the
PageDraft schema and `validate-content` before any commit. Failure retries, then fails
the revision with the error. Nothing invalid reaches the branch. CI on the PR is the
backstop.

Content-safety rules (no invented pricing, pricing questions direct to the office) stay
as they are in the existing prompts. The Telegram allowlist stays as built. Neither was
in scope for "valid change requests" and neither gets new machinery.

## 9. Preview deployment

On PR open or update, GitHub Actions:

1. `npm ci` and the existing validation steps
2. `EXPO_PUBLIC_PREVIEW=1 npm run pre-export && npm run pre-deploy`
3. push `dist/` to the root of the `drb-preview` repo
4. POST to `/github` so the bot can send the preview + PR links

`app/+html.jsx` emits the `noindex,nofollow` meta tag when `EXPO_PUBLIC_PREVIEW` is
set. Production builds are unaffected. No `robots.txt` Disallow (see D3).

The bot never sends a preview link before the deploy reports success. Failures are
relayed with an actionable reason.

## 10. Infrastructure as code

```
infra/
  README.md                       bootstrap order, manual steps, runbook
  terraform/
    versions.tf                   terraform + provider pins
    backend.tf                    GCS remote state
    variables.tf
    terraform.tfvars.example
    main.tf                       API enablement, bucket, Artifact Registry,
                                  Cloud Tasks queue, Cloud Run service, secrets
    iam.tf                        service account + least-privilege bindings
    outputs.tf                    service URL (input to setWebhook)
```

| Resource | Count |
|---|---|
| Cloud Run service | 1 |
| Cloud Tasks queue | 1, `max_concurrent_dispatches = 1` |
| GCS bucket | 1, lifecycle rule on `jobs/**` |
| Artifact Registry repo | 1 |
| Service account | 1 |
| Secret Manager secrets | 3 |

Two deliberate exclusions, both documented in `infra/README.md`:

- **Secret values never enter Terraform.** TF creates the secret resources; values are
  added out-of-band via `gcloud secrets versions add` so nothing sensitive lands in
  state.
- **The state bucket is bootstrapped once by hand** before Terraform adopts it.

## 11. Security

- `secret_token` on `setWebhook`, verified against the
  `X-Telegram-Bot-Api-Secret-Token` header on every request. The service must be
  publicly invokable for Telegram to reach it, so this is the only thing standing
  between the public internet and job creation.
- HMAC signature verification on `/github`.
- Telegram allowlist middleware (already built); admin subset for merge.
- `/task` reachable only via Cloud Tasks OIDC, never public.
- Service account bindings, all narrowly scoped:
  `storage.objectAdmin` on the bucket, `secretmanager.secretAccessor` on the three
  secrets, `cloudtasks.enqueuer` on the queue, `run.invoker` on the service.
- Cloud Tasks OIDC requires `actAs` on the service account it mints tokens for. Because
  the service enqueues tasks naming itself, this is a self-binding
  (`roles/iam.serviceAccountUser` on itself). Encode in `iam.tf`; verify at apply.
- Secrets are never logged. The existing structured logger already logs only ids.

## 12. Changes to existing repo code

| Change | Why |
|---|---|
| `shared/paths.ts`: accept a `DRB_REPO_ROOT` override | `repoRoot` is derived from the module's own location, which is wrong in a container where the package and the checkout live in different places. Blocks the worker entirely. |
| `app/+html.jsx`: conditional `noindex` meta | Preview exclusion (D3). |
| `create-page.ts`: implement `navPlacement: 'main'` | Currently warns and generates no header link; Task 1.2 is incomplete for main-nav pages. |
| `.github/workflows/`: add preview deploy workflow | D2. |
| CI: cover `optimize-images` | The only script with no CI coverage today. |
| Commit `src/shared/` and `packages/telegram-bot/` | Finished work currently untracked. |

## 13. Non-goals

Auto-merge to production; admin dashboard; FAQ answer generation; multiple concurrent
previews; page types beyond those the existing templates support; expanding
content-safety or authorization beyond what already exists.

## 14. Open items for implementation

- Confirm whether the GCP project's default compute SA carries Editor (affects how
  urgent the dedicated SA is, not whether to have one).
- Confirm `drb-preview` repo name and that `preview.dr-khatayee.com` DNS can be pointed
  at GitHub Pages.
- Confirm the exact daily-cap timezone handling at the Asia/Tehran boundary (UTC+3:30).

## 15. Definition of done

A dentist sends text and photos in Telegram. Within one confirmation tap the bot
produces an SEO-optimized page in `fa`, `en` and `ru`, opens a PR that passes CI, and
returns a preview link that search engines will not index. The dentist requests a change
in plain language; the bot either applies it as a new commit with a refreshed preview,
or explains why it is out of scope. All GCP resources are created by Terraform in
`infra/`.
