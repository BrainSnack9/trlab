# TrLab

Personal marketing trend radar and card-news production tool.

## Setup

```bash
cd /Users/educere/EducereProject/SideProject/trlab
nvm use
npm install
cp .env.example .env.local
npm run dev:was
npm run dev:web
```

Open `http://localhost:5173`. The web app proxies `/api/*` to the WAS server at `http://localhost:5174`.

## Environment

Use Node.js `20.19.0` or newer, below `25`. This project includes `.nvmrc`, so `nvm use` selects the expected local version.

The app is split into two npm workspaces:

```text
apps/web  Next.js UI, deployable to Vercel
apps/was  API, SQLite storage, collectors, ranking, workers
```

The WAS app uses local SQLite by default:

```text
apps/was/data/trlab.sqlite
```

API keys in `.env.local` are optional for basic UI startup, but required for AI analysis, search verification, and image generation providers.

## Worker

macOS:

```bash
npm run worker:mac
npm run worker:stop:mac
npm run worker:restart:mac
```

Windows:

```powershell
npm run worker:win
npm run worker:stop
npm run worker:restart
```

DB reset:

```bash
npm run worker:stop:mac
npm run db:reset
npm run worker:mac
```

More details: `docs/operations.md`.
