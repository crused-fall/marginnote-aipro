# Repository AGENTS

## Scope
- Applies to `/Users/cfall/Documents/Programs/Marginnote-AIpro`.
- Repo-specific instructions here override the global Codex defaults for this repository.

## Branch and review policy
- `main` is the merge branch.
- Small, verified fixes can land directly on `main`.
- Medium and larger changes should use a short-lived branch plus Draft PR.
- Use GitHub issues and PRs for collaboration state only; keep long-term project memory in `PROJECT_MEMORY.md` and current phase state in `PROJECT_STATUS.md`.

## Verification policy
- Prefer the narrowest useful check first.
- Use `npm run check:ci` for CI-safe repository verification.
- Use `npm run check` for the broader local verification suite when the environment supports it.
- Update docs and status files whenever behavior, workflow, or decisions change.

## Safety
- Do not stage or publish generated output from `node_modules/`, `tmp/`, or `.mnaddon` archives.
- Keep changes scoped to the requested work. If a repo-wide change is needed, document why in `PROJECT_STATUS.md`.

