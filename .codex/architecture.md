# Current Architecture

## Workspaces

```text
apps/
  web/   # Next.js frontend, deployable separately
  was/   # Node HTTP API/worker app, deployable separately
```

The web app proxies `/api/*` to the WAS through `apps/web/next.config.js`.

## Web Structure

```text
apps/web/src/
  app/
    layout.jsx
    page.jsx
  TrLabApp.jsx
  styles.css
  core/TrLab/
    App.jsx
    Components/Desktop/
      Atoms/TrLab/Common/
      Molecules/TrLab/Common/
      Organisms/Templates/Header/
      Organisms/TrLab/
        CardNews/
        Collection/
        Dashboard/
        Search/
        Studio/
      Systems/TrLab/
        CardNews/
        Collection/
        Dashboard/
        Search/
        Studio/
      Templates/
        TemplateHeader.jsx
    modules/
      ContextProvider.jsx
      configs/
      controller/
      helpers/
      utils/
    routes/
      pages/desktop/
      paths/
```

Important files:

- `core/TrLab/App.jsx` composes `ContextProvider` and `TemplateHeader`.
- `modules/controller/useTrLabWorkspace.jsx` owns global workspace UI state.
- `modules/controller/useTrLabData.js` owns API data loading.
- `routes/pages/desktop/index.jsx` maps current view state to a System.
- `Components/Desktop/Templates/TemplateHeader.jsx` owns header plus main scroll layout.

## WAS Structure

```text
apps/was/src/
  server.js
  core/trlab/
    libraries/
      storage/
      sqlite/
        db.js
    modules/
      helpers/
      routes/
        index.js
        api/
          content/
          search/
          signals/
          trends/
      services/
        ai/
        content/
        ranking/
        search/
        signals/
        trends/
    scripts/
```

Important files:

- `server.js` starts the HTTP server and dispatches routes.
- `modules/routes/index.js` owns the API route registry.
- `modules/routes/api/**/route.js` files are HTTP adapters.
- `modules/services/**` files contain server domain logic.
- `modules/routes/validators/**` owns zod request validation.
- `libraries/logger/logger.js` owns pino logging.
- `libraries/storage/**` owns storage adapter selection and optional Supabase/Postgres clients.
- `libraries/sqlite/db.js` is the current local persistence adapter.
- `scripts/collector.js` is the worker entrypoint.

## Data Flow

```text
Web view
  -> useTrLabWorkspace
  -> useTrLabData
  -> /api/*
  -> apps/was server route registry
  -> route adapter
  -> service module
  -> sqlite adapter
```

## Deployment Notes

- Web and WAS can be deployed separately.
- Web needs `WAS_URL` or `NEXT_PUBLIC_WAS_URL` for API rewrites.
- WAS listens on `PORT` or `WAS_PORT`, default `5174`.
