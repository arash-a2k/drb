# Telegram Content Bot - End-to-End Sequence & Data Flow Diagram

This diagram traces the full chronological lifecycle of a page creation request, background GitHub Actions execution, preview deployment, and the optional revision loop.

```mermaid
sequenceDiagram
    autonumber
    actor Dentist as 👨‍⚕️ Dentist (Telegram)
    participant Telegram as 💬 Telegram API
    participant CloudRun as 🚀 Cloud Run (drb-telegram-bot)
    participant GitHub as 🐙 GitHub API
    participant Runner as ⚙️ GitHub Actions Runner
    participant Claude as 🧠 Claude 3.7 Sonnet (Anthropic API)
    participant PreviewRepo as 🌐 Preview Deployment (drb-preview)

    Note over Dentist, CloudRun: PHASE 1: INTAKE & DISPATCH
    Dentist->>Telegram: Sends photos (album) & Persian notes
    Telegram->>CloudRun: POST / (Webhook update)
    Note over CloudRun: 1. Authenticate secret_token header<br/>2. Verify user in ALLOWED_TELEGRAM_IDS<br/>3. Buffer text & photo file_ids in memory
    CloudRun-->>Telegram: Returns 200 OK & sends Interactive Card
    Telegram-->>Dentist: Displays: "📸 3 photos received. [🚀 Generate Preview]"
    
    Dentist->>Telegram: Taps [🚀 Generate Preview]
    Telegram->>CloudRun: POST / (CallbackQuery: action:generate)
    CloudRun-->>Telegram: Edits message: "⏳ Job started! Building preview (~90s)..."
    CloudRun->>GitHub: POST /repos/arash-a2k/drb/actions/workflows/bot-create-page.yml/dispatches
    Note over CloudRun: Dispatched. Cloud Run finishes response & scales to 0.

    Note over Runner, PreviewRepo: PHASE 2: GITHUB ACTIONS EXECUTION
    GitHub->>Runner: Triggers workflow "bot-create-page.yml"
    activate Runner
    Runner->>Runner: 1. actions/checkout@v4 & npm ci --legacy-peer-deps
    Runner->>Telegram: 2. getFile(file_id) for each photo
    Telegram-->>Runner: Returns binary image streams
    Runner->>Runner: 3. optimize-images.ts (Sharp -> WebP, max 1800px, strip EXIF)
    
    Runner->>Claude: 4. AI Orchestrator (classify, SEO optimize Persian, translate to en & ru)
    Claude-->>Runner: Returns structured PageDraft JSON
    Runner->>Runner: 5. create-page.ts (write JSX component, routes, translated JSON, nav)
    Runner->>Runner: 6. validate-content.ts (schema validation gate)
    Runner->>Runner: 7. Save packages/content-automation/drafts/<slug>.draft.json
    Runner->>Runner: 8. Git checkout -b bot/page-<slug>-<run_id>, commit & push
    Runner->>GitHub: 9. gh pr create --title "Add page: <slug>"
    GitHub-->>Runner: PR created with URL

    Runner->>Runner: 10. EXPO_PUBLIC_PREVIEW=1 npm run pre-export && npm run pre-deploy
    Runner->>PreviewRepo: 11. Push dist/ to drb-preview (main)
    PreviewRepo-->>Runner: Live at preview.dr-khatayee.com
    
    Runner->>Telegram: 12. Direct POST /sendMessage (Preview link & PR link)
    deactivate Runner
    Telegram-->>Dentist: "🎉 Preview is Ready! 🔗 preview.dr-khatayee.com/... Reply with /revise <notes>"

    Note over Dentist, Runner: PHASE 3: REVISION LOOP (OPTIONAL)
    Dentist->>Telegram: /revise Change title to Bleaching and shorten intro
    Telegram->>CloudRun: POST / (Command: /revise)
    CloudRun->>GitHub: POST /actions/workflows/bot-revise-page.yml/dispatches
    GitHub->>Runner: Triggers workflow "bot-revise-page.yml" on PR branch
    activate Runner
    Runner->>Claude: Apply revision notes to existing <slug>.draft.json
    Claude-->>Runner: Returns updated PageDraft JSON
    Runner->>Runner: Re-run create-page.ts & validate-content.ts
    Runner->>Runner: Git commit & push updates to existing PR branch
    Runner->>PreviewRepo: Rebuild and re-deploy preview
    Runner->>Telegram: Direct POST /sendMessage ("🔄 Preview Updated!")
    deactivate Runner
    Telegram-->>Dentist: "🔄 Preview Updated! Check your changes."
```

---

## Phase Breakdown

1. **Phase 1: Intake & Dispatch:** Rapid, asynchronous buffer in Cloud Run. Allows user to send multiple photos and notes without waiting.
2. **Phase 2: GitHub Actions Execution:** Heavy lifting (image compression, AI prompt chaining, schema validation, static build, and deploy) executed with full compute resources.
3. **Phase 3: Revision Loop:** Allows unlimited iterative refinements on the same PR branch with automatic preview re-export.
