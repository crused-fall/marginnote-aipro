# Changelog

All notable user-facing changes for this repository should be recorded here.

## Unreleased

- Added the opt-in `mnaipro experimental` surface with gate, diagnostics, and registry commands that stay hidden unless `MNAIPRO_EXPERIMENTAL=1` is set.
- Made `npm run check:ci` portable so CI-safe verification no longer depends on sibling CLI checkouts being present.
- Documented the portable smoke fallback and release workflow more explicitly in the repo docs.
- Kept the three product lines separated while the repo continues phase 7 release hardening.
