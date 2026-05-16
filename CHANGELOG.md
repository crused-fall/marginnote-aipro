# Changelog

All notable user-facing changes for this repository should be recorded here.

## Unreleased

- Tightened the maintenance runbook with an explicit compact UI review checklist and routed routine maintenance slices through the same backlog and contributor guidance.
- Extended the release workflow check so it now verifies the maintenance preflight docs alongside the release checklist.
- Added a long-term maintenance runbook and tightened the maintenance backlog so routine checks, release preflight, and durable records all point at the same operating model.
- Linked the maintenance guidance from the README, CLI quickref, and bridge quickstart so operators can find the same cadence from any of the main entry docs.
- Added the opt-in `mnaipro experimental` surface with gate, diagnostics, and registry commands that stay hidden unless `MNAIPRO_EXPERIMENTAL=1` is set.
- Made `npm run check:ci` portable so CI-safe verification no longer depends on sibling CLI checkouts being present.
- Documented the portable smoke fallback and release workflow more explicitly in the repo docs.
- Kept the three product lines separated while the repo continues phase 7 release hardening.
