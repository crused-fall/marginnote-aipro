const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CI_SCRIPT_PATH = path.join(ROOT_DIR, "scripts", "check-ci.js");

function main() {
  const source = fs.readFileSync(CI_SCRIPT_PATH, "utf8");
  assert(
    source.includes("scripts/check-cli-smoke.js"),
    "check-ci.js should invoke the CLI smoke harness"
  );
  assert(
    source.includes("--portable"),
    "check-ci.js should force portable mode for the CLI smoke harness"
  );
  process.stdout.write("CI orchestrator checks OK\n");
}

main();
