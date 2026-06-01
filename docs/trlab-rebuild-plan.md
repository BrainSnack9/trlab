# TrLab Rebuild Plan

## Current Shape

TrLab is split into two npm workspaces:

- `apps/web`: Next.js UI and app shell.
- `apps/was`: HTTP API, local storage, collectors, ranking, and workers.

The current architecture standard is documented in `.codex`.

## Current Web Structure

```text
apps/web/src/
  app/
    layout.jsx
    page.jsx
  TrLabApp.jsx
  core/TrLab/
    App.jsx
    Components/Desktop/
      Atoms/TrLab/
      Molecules/TrLab/
      Organisms/TrLab/
      Systems/TrLab/
      Templates/
    modules/
      configs/
      controller/
      helpers/
      utils/
    routes/
      pages/
      paths/
```

## Current WAS Structure

```text
apps/was/src/
  server.js
  core/trlab/
    libraries/
      sqlite/
    modules/
      helpers/
      routes/
      services/
    scripts/
```

## Rebuild Priorities

1. Keep the app buildable after every structural move.
2. Keep `apps/web/src/app` thin and product code under `apps/web/src/core/TrLab`.
3. Keep `apps/was/src/server.js` thin and server product code under `apps/was/src/core/trlab`.
4. Move raw web API calls behind a client module.
5. Split large UI Organism files when they are touched.
6. Add a storage facade before introducing Supabase runtime access.
7. Keep route handlers as HTTP adapters and domain work in services.
8. Keep worker scripts as entrypoints and move orchestration into services over time.

## Adopted Packages

- `ky`: web API client wrapper.
- `zod`: WAS env and request validation.
- `pino` and `pino-pretty`: structured server and worker logs.
- `node-cron`: worker scheduling.
- `@supabase/supabase-js`, `drizzle-orm`, `postgres`: optional future Supabase/Postgres storage adapters.
- `vitest`, `msw`: unit tests and API mocking setup.
- `@playwright/test`: future browser E2E tests.

## Verification

Use these after cleanup or refactors:

```bash
npm run build
npm run db:reset
npm run test
npm run dev:was
curl -s http://localhost:5174/health
curl -s http://localhost:5174/api/signals/latest
curl -s http://localhost:5174/api/trends/latest
```

Stop any dev server started for verification.
