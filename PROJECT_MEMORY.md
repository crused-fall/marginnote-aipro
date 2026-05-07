# Project Memory

Canonical long-term memory for this repository.

## Purpose
- This file stores durable product decisions, boundaries, and long-lived architectural intent.
- GitHub issues and PRs track collaboration state only; they do not replace this file.

## Product lines
- `mnaipro` is the plugin/agent CLI for this repository.
- `marginnote-cli` is the standalone CLI for MarginNote native capabilities.
- `mn-obsidian-bridge` is the standalone CLI for MarginNote ↔ Obsidian bridge diagnostics and evidence.

## Governance model
- `main` is the merge branch.
- Small, verified fixes can go straight to `main`.
- Medium and larger slices should use a short-lived branch and Draft PR.
- Long-term target state belongs in `PROJECT_MEMORY.md`.
- Current phase / milestone tracking belongs in `PROJECT_STATUS.md`.
- Repo-specific operating rules belong in `AGENTS.md`.
- Contributor workflow guidance belongs in `CONTRIBUTING.md`.
- `CODEOWNERS` can be used to keep the maintainer review path visible in GitHub.

## Durable technical decisions
- `mnaipro breakdown smoke` defaults to self-hosted mode and can reuse an explicit bridge via `--bridge-base-url` or `--base-url` before or after the subcommand.
- `npm run check` remains the broad local validation command.
- `npm run check:ci` is the CI-safe subset used by GitHub Actions.
- `.mnaddon` archives are generated locally from source and should not be tracked in git.
- Release packaging should produce the `.mnaddon` archive outside version control, with git keeping source only.
- Public docs should prefer stable repository-relative examples or environment variables over hard-coded machine paths when practical.

## Change discipline
- If a decision changes, update this file first.
- If a work item changes the current phase, update `PROJECT_STATUS.md` in the same change.

## Current long-term direction
- Keep expanding the standalone CLI surfaces so MarginNote native capabilities, the plugin workflow, and the Obsidian bridge stay separated and testable.
