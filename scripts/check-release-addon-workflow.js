const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const WORKFLOW_PATH = path.join(ROOT_DIR, ".github", "workflows", "release-addon.yml");

function main() {
  const yaml = fs.readFileSync(WORKFLOW_PATH, "utf8");
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

  process.stdout.write("Release workflow checks OK\n");
}

main();
