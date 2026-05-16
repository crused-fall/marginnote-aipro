# Maintenance Backlog

This file gives the heartbeat automation a concrete set of low-risk maintenance tasks to choose from.
It is intentionally operational: pick one item, inspect it, and if a real issue exists, fix the smallest safe slice.

## Priority order
1. Review the most recently changed code surfaces for regressions or behavior drift.
2. Review user-facing docs and help text for clarity, consistency, and UI/usability friction.
3. Verify CI-safe and smoke coverage still matches the shipped behavior.
4. Keep durable records aligned after any user-visible change.

## Current task candidates
- Review `cli/mnaipro.js` compact `doctor` output for parity with the new `bridge_offline_reason` hint on `status` / `overview`.
- Review `README.md` and `docs/mnaipro-cli-quickref.md` for maintenance-mode, automation, and usability wording consistency.
- Review `PROJECT_STATUS.md`, `PROJECT_MEMORY.md`, and `PROJECT_LOG.md` for record drift after any user-visible change.

## Done for now
- The backlog itself should stay small and concrete.
- If an item is clearly stale, replace it with a more specific maintenance check instead of adding broad feature work.
