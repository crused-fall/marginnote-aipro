# Maintenance Backlog

This file gives the heartbeat automation a concrete set of low-risk maintenance tasks to choose from.
It is the short queue for `docs/maintenance-operations.md`: pick one item, inspect it, and if a real issue exists, fix the smallest safe slice.

## Priority order
1. Review the most recently changed code surfaces for regressions or behavior drift.
2. Review user-facing docs and help text for clarity, consistency, and UI/usability friction.
3. Verify CI-safe and smoke coverage still matches the shipped behavior.
4. Keep durable records aligned after any user-visible change.

## Current task candidates
- Review `mnaipro doctor --compact`, `mnaipro bridge doctor --compact`, and nearby compact surfaces for wording drift after maintenance changes.
- Verify `npm run check:ci`, `npm run check`, and the relevant smoke/regression scripts still cover the recently touched surfaces.
- Review `docs/release-process.md` and `CHANGELOG.md` for maintenance-mode and preflight wording consistency before the next release.
- Review `PROJECT_STATUS.md`, `PROJECT_MEMORY.md`, and `PROJECT_LOG.md` for record drift after any user-visible change.

## Done for now
- The backlog itself should stay small and concrete.
- If an item is clearly stale, replace it with a more specific maintenance check instead of adding broad feature work.
