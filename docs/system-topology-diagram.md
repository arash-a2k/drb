# Telegram Content Bot - System Topology & Component Diagram

This diagram maps every architectural block, execution environment, network boundary, communication protocol, and security boundary for the Dr. Khatayee Telegram Content Bot.

```mermaid
graph TB
    subgraph Client["📱 User Device"]
        Dentist["👨‍⚕️ Dentist (Telegram Mobile / Desktop)"]
    end

    subgraph TelegramCloud["☁️ Telegram Cloud"]
        TGApi["Telegram Bot API<br/>(api.telegram.org)"]
    end

    subgraph GCP["☁️ Google Cloud Platform (GCP)"]
        subgraph CloudRun["Cloud Run Service: drb-telegram-bot"]
            BotApp["Thin Node.js Webhook Server<br/>(packages/telegram-bot)"]
            SessionMem["In-Memory Buffer<br/>(Text, Photos, Draft State)"]
        end
        SecretMgr["GCP Secret Manager<br/>- TELEGRAM_BOT_TOKEN<br/>- GITHUB_TOKEN<br/>- ALLOWED_TELEGRAM_IDS<br/>- ADMIN_TELEGRAM_IDS<br/>- TELEGRAM_WEBHOOK_SECRET"]
    end

    subgraph GitHubPlatform["🐙 GitHub Platform"]
        GHApi["GitHub REST API<br/>(/actions/workflows/.../dispatches)"]
        
        subgraph GHA["GitHub Actions Runner (Ubuntu Latest)"]
            Workflow["bot-create-page.yml / bot-revise-page.yml"]
            Downloader["Telegram Photo Downloader<br/>(download-telegram-photos.ts)"]
            Sharp["Image Optimizer (Sharp -> WebP)<br/>(optimize-images.ts)"]
            Orchestrator["AI Orchestrator Engine<br/>(orchestrator.ts)"]
            PageGen["Deterministic Page Generator<br/>(create-page.ts)"]
            StaticExport["Expo Web Static Exporter<br/>(EXPO_PUBLIC_PREVIEW=1)"]
        end

        RepoSource["Main Repo: arash-a2k/drb<br/>(Branch: bot/page-...)"]
        RepoPreview["Preview Repo: arash-a2k/drb-preview<br/>(CNAME: preview.dr-khatayee.com)"]
        GHSecrets["GitHub Repository Secrets<br/>- ANTHROPIC_API_KEY<br/>- TELEGRAM_BOT_TOKEN<br/>- PREVIEW_DEPLOY_KEY"]
    end

    subgraph AnthropicCloud["🧠 Anthropic Cloud"]
        Claude["Claude 3.7 Sonnet API<br/>(api.anthropic.com/v1/messages)"]
    end

    %% Network & Data Flows
    Dentist -->|"1. Sends text, photos & taps Generate"| TGApi
    TGApi -->|"2. HTTPS Webhook (X-Telegram-Bot-Api-Secret-Token)"| BotApp
    SecretMgr -.->|"Injects secrets at container startup"| BotApp
    BotApp <--> SessionMem
    BotApp -->|"3. HTTPS POST /dispatches (Bearer GITHUB_TOKEN)"| GHApi
    GHApi -->|"4. Triggers workflow run"| Workflow

    Workflow -->|"Fetch original full-res photos"| TGApi
    Workflow --> Downloader
    Downloader --> Sharp
    Sharp --> Orchestrator
    GHSecrets -.->|"Supplies API keys & deploy keys"| Workflow
    Orchestrator <-->|"5. Structured Prompts & JSON response"| Claude
    Orchestrator --> PageGen
    PageGen -->|"6. Commit & Push PR branch"| RepoSource
    PageGen --> StaticExport
    StaticExport -->|"7. Deploy dist/ to root"| RepoPreview
    Workflow -->|"8. Direct HTTPS POST /sendMessage"| TGApi
    TGApi -->|"9. Delivers preview & PR link"| Dentist
```

---

## Component Roles & Boundaries

| Component | Host / Runtime | Responsibility | Protocol / Auth |
|---|---|---|---|
| **Telegram Bot** | GCP Cloud Run | Inbound webhook receiver, authorization check, session buffer, workflow dispatcher | HTTPS (`X-Telegram-Bot-Api-Secret-Token`) |
| **GitHub REST API** | GitHub Cloud | Receives workflow dispatch requests from Cloud Run | HTTPS (`Bearer GITHUB_TOKEN`) |
| **Actions Runner** | GitHub Ubuntu Runner | Photo download, image optimization, AI orchestration, static export, and preview deploy | Native Runner environment |
| **Claude 3.7 Sonnet** | Anthropic API | Medical SEO optimization, classification, and 3-language translation (`fa`, `en`, `ru`) | HTTPS (`x-api-key: ANTHROPIC_API_KEY`) |
| **Preview Site** | GitHub Pages (`drb-preview`) | Live static preview at root CNAME `preview.dr-khatayee.com` with `noindex,nofollow` | HTTPS / SSH Deploy Key |
