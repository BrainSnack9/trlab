# TrLab

Personal marketing trend radar and card-news production tool.

## Setup

```powershell
cd C:\Project\TrLab
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:5173`.

## Worker

```powershell
npm run worker:win
npm run worker:stop
npm run worker:restart
```

DB reset:

```powershell
npm run worker:stop
npm run db:reset
npm run worker:win
```

More details: `docs/operations.md`.
