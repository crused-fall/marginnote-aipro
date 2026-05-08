const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const SMOKE_SCRIPT_PATH = path.join(ROOT_DIR, "scripts", "check-cli-smoke.js");

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-smoke-portable-"));
  const marginnoteCliRoot = path.join(tempDir, "missing-marginnote-cli");
  const bridgeRoot = path.join(tempDir, "missing-mn-obsidian-bridge");
  const result = spawnSync(
    process.execPath,
    [
      SMOKE_SCRIPT_PATH,
      "--portable",
      "--marginnote-cli-root",
      marginnoteCliRoot,
      "--bridge-root",
      bridgeRoot,
      "--json",
    ],
    {
      cwd: ROOT_DIR,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    }
  );

  if (result.error) {
    throw new Error(`portable smoke failed to start: ${result.error.message}`);
  }
  assert.strictEqual(result.status, 0, `portable smoke should pass\n${result.stderr || result.stdout}`);

  const report = JSON.parse(result.stdout);
  assert.strictEqual(report.ok, true, "portable smoke should report ok");
  assert.strictEqual(report.mode, "portable", "portable smoke should report portable mode");
  assert(
    Array.isArray(report.skipped) &&
      report.skipped.some((entry) => entry && entry.surface === "sibling-cli-coverage") &&
      report.skipped.some((entry) => entry && entry.surface === "sibling-cli-root-checks"),
    "portable smoke should skip sibling CLI coverage and sibling root checks"
  );
  assert(
    Array.isArray(report.checks) &&
      !report.checks.some((check) => check && check.name === "marginnote-cli root exists") &&
      !report.checks.some((check) => check && check.name === "mn-obsidian-bridge root exists"),
    "portable smoke should not run sibling root existence checks"
  );

  process.stdout.write("Portable CLI smoke checks OK\n");
}

main();
