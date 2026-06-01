# Next Work

## Highest Priority

1. Split large Organism files.
   - `DashboardView.jsx`
   - `CollectionTabs.jsx`
   - `SearchView.jsx`
   - `StudioView.jsx`
   - `CardNewsMaker.jsx`
   - Prefer one meaningful component per file where it improves readability.

2. Add service index files in WAS.
   - Example: `modules/services/signals/index.js`.
   - Route handlers should import from service public exports where practical.

3. Implement the Supabase storage adapter.
   - Keep `libraries/sqlite/db.js` as local fallback.
   - Use `libraries/storage/supabase.js` only when Supabase env vars are set.
   - Map `saveCollectionResult`, `saveKeywordSnapshots`, and content plans to the Supabase schema.

## Medium Priority

1. Move worker orchestration out of `scripts/collector.js`.
   - Keep script as entrypoint.
   - Put scheduling/collection logic into `modules/services/collector`.

2. Normalize route response errors.
   - Add a small helper for JSON error responses.
   - Keep sensitive details out of production responses.

3. Expand focused tests.
   - Content plan cache behavior.
   - Route adapters for required validation.
   - Web API client error handling.

4. Update docs when paths change.
   - Search for old paths after every large move:
     ```bash
     rg "app-shell|components/ui|apps/was/src/lib|apps/was/src/routes|apps/was/src/scripts|#lib" .
     ```
   - Keep `docs/trlab-rebuild-plan.md` aligned with `.codex/architecture.md`.

## Known Legacy Debt

- Several React files still use direct `array.map` and internal helper components.
- Some UI primitives are still generic and can be renamed or split when the TrLab design system becomes clearer.
- WAS is intentionally REST/route based. Do not add GraphQL unless product needs it.
- Supabase schema exists, but runtime code still uses local SQLite.

## Done Criteria For Future Refactors

- `npm run build` passes.
- `npm run db:reset` passes if WAS storage changed.
- WAS smoke endpoints respond if server routing changed.
- No dev server is left running.
- No old folder names or aliases are reintroduced.
