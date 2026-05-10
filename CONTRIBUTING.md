# Contributing

This repository uses a branch-and-PR workflow.

## Working model
- `main` is the merge branch.
- Small, verified fixes can land directly on `main` when they are low risk and locally validated.
- Larger slices should use a short-lived branch and a Draft PR.
- GitHub issues and PRs track collaboration state only.
- Durable decisions belong in `PROJECT_MEMORY.md`.
- Current phase tracking belongs in `PROJECT_STATUS.md`.

## Before you open a PR
- Pick one issue or one scoped slice of work.
- Use the issue templates when filing new work.
- Run `npm run check:ci` first.
- Run `npm run check` when the change touches shared code paths or workflow behavior.
- Update `README.md` or the relevant docs when behavior changes.
- Update `PROJECT_MEMORY.md` if a durable decision changed.
- Update `PROJECT_STATUS.md` if the work changes the current phase or milestone.

## Labels
- Use `type:*` for the kind of work.
- Use `area:*` for the subsystem.
- Use `priority:*` for urgency.
- Use `status:*` for the current state of the work.

## Releases
- The `release-addon` workflow runs `npm run check:ci` before building the addon archive; the smoke step is portable on GitHub Actions, so release gating does not depend on sibling CLI checkouts being present.
- Build the addon archive with `npm run addon:build` when you need a local package.
- Update `CHANGELOG.md` before a tagged release if you want the release notes to reflect the current user-facing slice.
- Tag a release commit with a `v*` tag to publish the generated `.mnaddon` as a GitHub Release asset.
- Use the `release-addon` workflow manually when you want a fresh packaged archive without publishing a tag.

## Issue hygiene
- One issue should represent one actionable slice.
- Write an explicit acceptance criterion.
- Include validation commands or checks.
- If the work is blocked, say what dependency is missing.
