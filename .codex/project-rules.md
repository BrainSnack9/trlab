# Project Rules

## General

- Keep changes scoped and buildable.
- Prefer the existing TrLab module structure over adding new top-level folders.
- Treat this `.codex` folder as the project rule source.
- Do not import from outside TrLab project modules unless it is an explicit npm dependency.
- Use JavaScript and JSX only. Do not introduce TypeScript unless the project is intentionally migrated.
- Use explicit, stable module ownership. UI state belongs in web controllers. Server domain work belongs in WAS services.

## Commands

Run these after structural changes:

```bash
npm run build
npm run db:reset
npm run test
```

For WAS smoke tests:

```bash
npm run dev:was
curl -s http://localhost:5174/health
curl -s http://localhost:5174/api/signals/latest
curl -s http://localhost:5174/api/trends/latest
```

Stop any dev server started for testing before ending work.

## Web Rules

- Product code lives under `apps/web/src/core/TrLab`.
- `apps/web/src/app` should stay thin: document shell and page mount only.
- `apps/web/src/TrLabApp.jsx` is a compatibility entry that exports `core/TrLab/App`.
- Keep the TrLab UI layer order:
  - `Components/Desktop/Atoms/TrLab/...`
  - `Components/Desktop/Molecules/TrLab/...`
  - `Components/Desktop/Organisms/TrLab/...`
  - `Components/Desktop/Systems/TrLab/...`
  - `Components/Desktop/Templates/...`
  - `modules/controller`
  - `modules/configs`
  - `modules/helpers`
  - `routes/pages`
  - `routes/paths`
- Systems are page-level orchestrators.
- Organisms are feature sections with business UI logic.
- Molecules are reusable composed UI pieces.
- Atoms are primitive UI elements.
- Templates own app-level layout and scroll containers.

## WAS Rules

- Product server code lives under `apps/was/src/core/trlab`.
- `apps/was/src/server.js` should stay thin: HTTP server, health check, route dispatch.
- Route registry belongs in `apps/was/src/core/trlab/modules/routes/index.js`.
- HTTP route handlers belong in `apps/was/src/core/trlab/modules/routes/api/**/route.js`.
- Domain logic belongs in `apps/was/src/core/trlab/modules/services/**`.
- Infrastructure adapters belong in `apps/was/src/core/trlab/libraries/**`.
- Worker and maintenance entrypoints belong in `apps/was/src/core/trlab/scripts/**`.
- Use the `#trlab/*` package import alias for cross-folder server imports.
- Do not resurrect `#lib/*`.
- Use `zod` for route/env validation instead of ad hoc parsing when adding new endpoints.
- Use `pino` logger instead of direct `console.log/error` in long-running server/worker code.
- Use `node-cron` for scheduled worker jobs.

## Database Rules

- Current local DB implementation is `sql.js` at `apps/was/src/core/trlab/libraries/sqlite/db.js`.
- Storage access should go through `apps/was/src/core/trlab/libraries/storage`.
- Supabase schema work is documented in `docs/supabase-db-design.md`.
- Supabase and Postgres clients are prepared as optional adapters; do not make local dev depend on them unless explicitly requested.
- Keep local SQLite fallback unless explicitly removed.

## Style Notes

- Current code still has some legacy patterns such as dense files and direct `array.map`.
- When touching a file, improve it toward the TrLab layer rules if the change is local and safe.
- Avoid broad visual rewrites while doing architecture cleanup.
