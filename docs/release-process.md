# Release Process

This repository ships releases through the `release-addon` GitHub workflow and keeps user-visible release notes in `CHANGELOG.md`.
Routine maintenance slices should follow `docs/maintenance-operations.md` first so the release preflight, docs, and durable records all stay aligned.

## Before a release

1. Update `CHANGELOG.md` with the user-visible changes you want in the next release.
2. If you are landing a maintenance slice on `main`, follow `docs/maintenance-operations.md` before you publish it.
3. Run `npm run check:ci` to confirm the CI-safe gate is green.
4. Run `npm run check` when the change touched stable behavior or operator guidance.
5. Run `npm run addon:build` to produce a local `.mnaddon` package.
6. If the change is broader than a small fix, keep it on a branch and open a draft PR before merging.

## Publish paths

- Manual: trigger `.github/workflows/release-addon.yml` with `workflow_dispatch`.
- Tag-based: push a `v*` tag to publish the built `.mnaddon` as a GitHub Release asset.

## What the workflow does

1. Checks out the repository.
2. Installs dependencies.
3. Runs `npm run check:ci`.
4. Builds `mnaipro.mnaddon`.
5. Uploads the package as a workflow artifact.
6. Publishes the same archive as a GitHub Release asset when the workflow runs from a `v*` tag.

## Validation

- `npm run check:ci`
- `npm run check`
- `npm run addon:build`
- For maintenance slices, the runbook in `docs/maintenance-operations.md` defines when `npm run check` is expected in addition to `npm run check:ci`.

The release process intentionally stays preview-first for checks and only packages from source once the verification gates are green.
