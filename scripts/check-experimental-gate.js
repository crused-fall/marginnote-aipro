const assert = require("assert");
const { spawnSync } = require("child_process");
const path = require("path");
const { buildExperimentalState, parseExperimentalFlag } = require("../bridge/experimental/gate");

const ROOT_DIR = path.resolve(__dirname, "..");
const CLI_PATH = path.join(ROOT_DIR, "cli", "mnaipro.js");

function runCli(args, extraEnv = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${error.message}\n${text}`);
  }
}

function main() {
  assert.strictEqual(parseExperimentalFlag(undefined), false, "experimental flag should default off");
  assert.strictEqual(parseExperimentalFlag("0"), false, "zero should disable experimental mode");
  assert.strictEqual(parseExperimentalFlag("false"), false, "false should disable experimental mode");
  assert.strictEqual(parseExperimentalFlag("1"), true, "one should enable experimental mode");

  const disabled = buildExperimentalState({});
  assert.strictEqual(disabled.enabled, false, "experimental state should be disabled by default");
  assert.strictEqual(disabled.mode, "stable", "default experimental mode should be stable");
  assert(Array.isArray(disabled.warnings), "disabled state should expose warnings");
  assert(disabled.warnings.includes("experimental_disabled"), "disabled state should include a disabled warning");

  const enabled = buildExperimentalState({
    MNAIPRO_EXPERIMENTAL: "1",
    MNAIPRO_EXPERIMENTAL_COMMANDS: "ui-probe,private-selector",
  });
  assert.strictEqual(enabled.enabled, true, "experimental state should be enabled when flagged");
  assert.strictEqual(enabled.mode, "experimental", "enabled state should report experimental mode");
  assert(Array.isArray(enabled.commands), "enabled state should expose commands");
  assert(enabled.commands.includes("ui-probe"), "enabled state should preserve configured commands");
  assert(enabled.commands.includes("private-selector"), "enabled state should expose all configured commands");

  const disabledHelp = runCli(["--help"]);
  assert.strictEqual(disabledHelp.status, 0, "disabled help should succeed");
  assert(
    !String(disabledHelp.stdout || "").includes("mnaipro experimental"),
    "experimental commands should stay hidden from default help"
  );
  assert(
    !String(disabledHelp.stdout || "").includes("mnaipro experimental diagnostics"),
    "experimental diagnostics should stay hidden from default help"
  );
  assert(
    !String(disabledHelp.stdout || "").includes("mnaipro experimental registry"),
    "experimental registry should stay hidden from default help"
  );

  const disabledCapabilities = runCli(["capabilities", "--json"]);
  assert.strictEqual(disabledCapabilities.status, 0, "disabled capabilities should succeed");
  const disabledCapabilitiesJson = parseJson(
    disabledCapabilities.stdout,
    "disabled capabilities"
  );
  assert(
    !String(disabledCapabilities.stdout || "").includes("experimental"),
    "default capabilities output should not expose experimental command surface"
  );
  assert(
    !(
      disabledCapabilitiesJson.surfaceDocs &&
      Array.isArray(disabledCapabilitiesJson.surfaceDocs.sections) &&
      disabledCapabilitiesJson.surfaceDocs.sections.some((section) => section.label === "Experimental")
    ),
    "default capabilities JSON should not expose an experimental section"
  );

  const disabledDiagnostics = runCli(["experimental", "diagnostics", "--json"]);
  assert.notStrictEqual(
    disabledDiagnostics.status,
    0,
    "experimental diagnostics should stay disabled when the gate is off"
  );
  assert(
    String(disabledDiagnostics.stderr || disabledDiagnostics.stdout || "").includes("unknown command"),
    "disabled experimental diagnostics should be rejected as an unknown command"
  );

  const enabledStatus = runCli(
    ["experimental", "status", "--json"],
    {
      MNAIPRO_EXPERIMENTAL: "1",
      MNAIPRO_EXPERIMENTAL_COMMANDS: "ui-probe,private-selector",
    }
  );
  assert.strictEqual(enabledStatus.status, 0, "enabled experimental status should succeed");
  const enabledStatusJson = parseJson(enabledStatus.stdout, "enabled experimental status");
  assert.strictEqual(
    enabledStatusJson.enabled,
    true,
    "enabled experimental status should report enabled"
  );
  assert.strictEqual(
    enabledStatusJson.mode,
    "experimental",
    "enabled experimental status should report experimental mode"
  );
  assert(
    Array.isArray(enabledStatusJson.commands) && enabledStatusJson.commands.includes("ui-probe"),
    "enabled experimental status should expose configured commands"
  );

  const enabledHelp = runCli(
    ["--help"],
    {
      MNAIPRO_EXPERIMENTAL: "1",
      MNAIPRO_EXPERIMENTAL_COMMANDS: "ui-probe,private-selector",
    }
  );
  assert.strictEqual(enabledHelp.status, 0, "enabled help should succeed");
  assert(
    String(enabledHelp.stdout || "").includes("mnaipro experimental status"),
    "enabled help should show the experimental command group"
  );
  assert(
    String(enabledHelp.stdout || "").includes("mnaipro experimental diagnostics"),
    "enabled help should show the experimental diagnostics command"
  );
  assert(
    String(enabledHelp.stdout || "").includes("mnaipro experimental registry"),
    "enabled help should show the experimental registry command"
  );

  const enabledCapabilities = runCli(
    ["capabilities", "--json"],
    {
      MNAIPRO_EXPERIMENTAL: "1",
      MNAIPRO_EXPERIMENTAL_COMMANDS: "ui-probe,private-selector",
    }
  );
  assert.strictEqual(enabledCapabilities.status, 0, "enabled capabilities should succeed");
  const enabledCapabilitiesJson = parseJson(enabledCapabilities.stdout, "enabled capabilities");
  assert(
    enabledCapabilitiesJson.surfaceDocs &&
      Array.isArray(enabledCapabilitiesJson.surfaceDocs.sections) &&
      enabledCapabilitiesJson.surfaceDocs.sections.some((section) => section.label === "Experimental"),
    "enabled capabilities JSON should expose an experimental section"
  );
  assert(
    enabledCapabilitiesJson.surfaceDocs.sections
      .find((section) => section.label === "Experimental")
      .commands.includes("diagnostics"),
    "enabled capabilities JSON should list the experimental diagnostics command"
  );
  assert(
    enabledCapabilitiesJson.surfaceDocs.sections
      .find((section) => section.label === "Experimental")
      .commands.includes("registry"),
    "enabled capabilities JSON should list the experimental registry command"
  );

  const enabledRegistry = runCli(
    ["experimental", "registry", "--json"],
    {
      MNAIPRO_EXPERIMENTAL: "1",
      MNAIPRO_EXPERIMENTAL_COMMANDS: "ui-probe,private-selector",
    }
  );
  assert.strictEqual(enabledRegistry.status, 0, "enabled experimental registry should succeed");
  const enabledRegistryJson = parseJson(enabledRegistry.stdout, "enabled experimental registry");
  assert.strictEqual(
    enabledRegistryJson.kind,
    "experimental_registry",
    "enabled registry should report its kind"
  );
  assert.strictEqual(
    enabledRegistryJson.gate && enabledRegistryJson.gate.enabled,
    true,
    "enabled registry should include the enabled gate state"
  );
  assert(
    Array.isArray(enabledRegistryJson.availableCommands) &&
      enabledRegistryJson.availableCommands.includes("diagnostics"),
    "enabled registry should expose the experimental diagnostics command"
  );
  assert(
    Array.isArray(enabledRegistryJson.configuredCommands) &&
      enabledRegistryJson.configuredCommands.includes("ui-probe"),
    "enabled registry should expose configured private command names"
  );

  const disabledRegistry = runCli(["experimental", "registry", "--json"]);
  assert.notStrictEqual(
    disabledRegistry.status,
    0,
    "experimental registry should stay disabled when the gate is off"
  );

  const enabledDiagnostics = runCli(
    ["experimental", "diagnostics", "--json"],
    {
      MNAIPRO_EXPERIMENTAL: "1",
      MNAIPRO_EXPERIMENTAL_COMMANDS: "ui-probe,private-selector",
    }
  );
  assert.strictEqual(enabledDiagnostics.status, 0, "enabled experimental diagnostics should succeed");
  const enabledDiagnosticsJson = parseJson(
    enabledDiagnostics.stdout,
    "enabled experimental diagnostics"
  );
  assert.strictEqual(
    enabledDiagnosticsJson.kind,
    "experimental_diagnostics",
    "enabled diagnostics should report its kind"
  );
  assert.strictEqual(
    enabledDiagnosticsJson.gate && enabledDiagnosticsJson.gate.enabled,
    true,
    "enabled diagnostics should include the enabled gate state"
  );
  assert(
    enabledDiagnosticsJson.latestDiagnostic &&
      (enabledDiagnosticsJson.latestDiagnostic.kind === "runtime_snapshot" ||
        enabledDiagnosticsJson.latestDiagnostic.kind === "derived_diagnostic"),
    "enabled diagnostics should expose the latest diagnostic evidence"
  );

  process.stdout.write("Experimental gate checks OK\n");
}

main();
