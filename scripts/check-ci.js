const { spawnSync } = require("child_process");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

const syntaxChecks = [
  "main.js",
  "bridge/planner.js",
  "bridge/server.js",
  "bridge/obsidian-sync.js",
  "bridge/native-ai-supervision.js",
  "bridge/native-ai-template-governance.js",
  "bridge/native-ai-breakdown-postprocess.js",
  "bridge/breakdown-artifact-audit.js",
  "bridge/model-backend.js",
  "bridge/experimental/gate.js",
  "bridge/experimental/diagnostics.js",
  "bridge/experimental/registry.js",
  "plugin/agent-core.js",
  "plugin/index.js",
  "plugin/mock-api.js",
  "cli/mnaipro.js",
  "bin/mnaipro.js",
  "scripts/dry-run.js",
  "scripts/check-planner-invariants.js",
  "scripts/inspect-latest-plan.js",
  "scripts/inspect-latest-followup.js",
  "scripts/inspect-latest-followup-apply.js",
  "scripts/inspect-latest-apply.js",
  "scripts/inspect-latest-diagnostic.js",
  "scripts/inspect-native-ai.js",
  "scripts/inspect-native-ai-matrix.js",
  "scripts/inspect-native-ai-templates.js",
  "scripts/check-native-ai-template-governance.js",
  "scripts/inspect-native-ai-breakdown-postprocess.js",
  "scripts/inspect-native-ai-breakdown-artifacts.js",
  "scripts/check-native-ai-breakdown-postprocess.js",
  "scripts/check-native-ai-breakdown-artifacts.js",
  "scripts/check-native-ai-breakdown-smoke.js",
  "scripts/check-bridge-status-breakdown-surface.js",
  "scripts/check-cli-breakdown-audit-surface.js",
  "scripts/check-main-breakdown-origin.js",
  "scripts/check-plugin-agent-core.js",
  "scripts/bridge-status.js",
  "scripts/bridge-doctor.js",
  "scripts/reload-launch-agent.js",
  "scripts/replay-requests.js",
  "scripts/replay-after-apply.js",
];

const scriptChecks = [
  ["planner invariants", "scripts/check-planner-invariants.js"],
  ["native-ai template governance", "scripts/check-native-ai-template-governance.js"],
  ["native-ai breakdown postprocess", "scripts/check-native-ai-breakdown-postprocess.js"],
  ["native-ai breakdown artifacts", "scripts/check-native-ai-breakdown-artifacts.js"],
  ["native-ai breakdown smoke", "scripts/check-native-ai-breakdown-smoke.js"],
  ["bridge model backend", "scripts/check-bridge-model-backend.js"],
  ["experimental gate", "scripts/check-experimental-gate.js"],
  ["ci orchestrator", "scripts/check-ci-orchestrator.js"],
  ["portable cli smoke", "scripts/check-cli-smoke-portable.js"],
  ["cli smoke", "scripts/check-cli-smoke.js"],
  ["release addon workflow", "scripts/check-release-addon-workflow.js"],
  ["bridge status breakdown surface", "scripts/check-bridge-status-breakdown-surface.js"],
  ["cli breakdown audit surface", "scripts/check-cli-breakdown-audit-surface.js"],
  ["main breakdown origin", "scripts/check-main-breakdown-origin.js"],
  ["plugin agent core", "scripts/check-plugin-agent-core.js"],
];

if (process.platform === "darwin") {
  scriptChecks.push([
    "bridge supervisor managed stop",
    "scripts/check-bridge-supervisor-managed-stop.js",
  ]);
}

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`${label} failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr || "").trim();
    const stdout = String(result.stdout || "").trim();
    throw new Error(
      `${label} failed with exit code ${result.status}\n${stderr || stdout || "(no output)"}`
    );
  }
}

function main() {
  let count = 0;

  count += 1;
  run("github workflow yaml parse", "ruby", [
    "-e",
    [
      'require "yaml"',
      'files = Dir[".github/**/*.yml", ".github/**/*.yaml"]',
      'files.each { |f| YAML.load_file(f) }',
      'puts "YAML ok: #{files.length} file(s)"',
    ].join("; "),
  ]);

  for (const relativePath of syntaxChecks) {
    count += 1;
    run(`node --check ${relativePath}`, process.execPath, [
      "--check",
      path.join(ROOT_DIR, relativePath),
    ]);
  }

  for (const [label, relativePath] of scriptChecks) {
    count += 1;
    const args = [path.join(ROOT_DIR, relativePath)];
    if (relativePath === "scripts/check-cli-smoke.js") {
      args.push("--portable");
    }
    run(label, process.execPath, args);
  }

  console.log(`CI checks passed (${count} checks)`);
}

main();
