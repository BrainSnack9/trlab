# TrLab Codex Guide

This folder is the handoff guide for future agents working on TrLab.

Read these files before making changes:

1. `project-rules.md` — coding and architecture rules.
2. `architecture.md` — current web/WAS folder map.
3. `next-work.md` — prioritized follow-up work.

## Source Of Truth

TrLab's current architecture is the source of truth. Future work should extend the rules in this folder and keep the project self-contained.

- Web source: `apps/web/src/core/TrLab`
- WAS source: `apps/was/src/core/trlab`
- Project rules: `.codex/project-rules.md`
- Current architecture map: `.codex/architecture.md`
- Future work queue: `.codex/next-work.md`

## Golden Rule

Do not reintroduce the old TrLab flat structure:

- Do not create `apps/web/src/app-shell`.
- Do not create `apps/web/src/components/ui`.
- Do not create `apps/was/src/lib`.
- Do not create `apps/was/src/routes`.
- Do not create `apps/was/src/scripts`.

Use the current `src/core` module structure instead.
