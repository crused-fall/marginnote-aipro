const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const WORKFLOW_PATH = path.join(ROOT_DIR, ".github", "workflows", "release-addon.yml");
const PR_TEMPLATE_PATH = path.join(ROOT_DIR, ".github", "pull_request_template.md");
const RELEASE_PROCESS_PATH = path.join(ROOT_DIR, "docs", "release-process.md");
const CHANGELOG_PATH = path.join(ROOT_DIR, "CHANGELOG.md");
const README_PATH = path.join(ROOT_DIR, "README.md");
const CONTRIBUTING_PATH = path.join(ROOT_DIR, "CONTRIBUTING.md");

function main() {
  const yaml = fs.readFileSync(WORKFLOW_PATH, "utf8");
  const prTemplate = fs.readFileSync(PR_TEMPLATE_PATH, "utf8");
  const releaseProcess = fs.readFileSync(RELEASE_PROCESS_PATH, "utf8");
  const changelog = fs.readFileSync(CHANGELOG_PATH, "utf8");
  const readme = fs.readFileSync(README_PATH, "utf8");
  const contributing = fs.readFileSync(CONTRIBUTING_PATH, "utf8");
  const checkCiIndex = yaml.indexOf("npm run check:ci");
  const buildIndex = yaml.indexOf("npm run addon:build");

  assert(checkCiIndex !== -1, "release workflow should run npm run check:ci");
  assert(buildIndex !== -1, "release workflow should build the addon package");
  assert(
    checkCiIndex < buildIndex,
    "release workflow should run check:ci before building the addon package"
  );

  assert(
    yaml.includes("workflow_dispatch:"),
    "release workflow should remain manually triggerable"
  );
  assert(
    yaml.includes("tags:\n      - \"v*\""),
    "release workflow should remain tag-triggered"
  );
  assert(
    yaml.includes("softprops/action-gh-release@v2"),
    "release workflow should continue publishing GitHub Release assets"
  );
  assert(
    changelog.includes("## Unreleased"),
    "CHANGELOG.md should keep an Unreleased section for the next tagged release"
  );
  assert(
    readme.includes("CHANGELOG.md"),
    "README.md should point release readers at CHANGELOG.md"
  );
  assert(
    contributing.includes("CHANGELOG.md"),
    "CONTRIBUTING.md should remind release authors to update CHANGELOG.md"
  );
  assert(
    prTemplate.includes("CHANGELOG.md"),
    "pull_request_template.md should prompt contributors to update CHANGELOG.md when behavior changes"
  );
  assert(
    releaseProcess.includes("npm run check:ci") &&
      releaseProcess.includes("npm run addon:build") &&
      releaseProcess.includes("CHANGELOG.md") &&
      releaseProcess.includes("workflow_dispatch") &&
      releaseProcess.includes("v*"),
    "docs/release-process.md should describe the release checks and publish paths"
  );

  process.stdout.write("Release workflow checks OK\n");
}

main();
