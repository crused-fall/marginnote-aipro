const { buildExperimentalState } = require("./gate");

const EXPERIMENTAL_COMMANDS = ["status", "diagnostics", "registry"];

function buildExperimentalRegistryReport(env = process.env) {
  const gate = buildExperimentalState(env);
  const configuredCommands = Array.isArray(gate.commands) ? gate.commands : [];
  const warnings = gate.enabled ? [] : ["experimental_disabled"];
  const summary = gate.enabled
    ? configuredCommands.length
      ? `Experimental registry exposes ${EXPERIMENTAL_COMMANDS.length} gated command(s) and ${configuredCommands.length} configured private name(s).`
      : `Experimental registry exposes ${EXPERIMENTAL_COMMANDS.length} gated command(s); no private command names are configured yet.`
    : "Experimental registry is disabled; stable commands remain unchanged.";

  return {
    ok: true,
    kind: "experimental_registry",
    gate,
    availableCommands: EXPERIMENTAL_COMMANDS.slice(),
    configuredCommands,
    warnings,
    summary,
    nextCommand: gate.enabled
      ? "mnaipro experimental diagnostics --json"
      : `Set ${gate.flagName}=1 to expose gated commands.`,
  };
}

function formatExperimentalRegistryLines(report) {
  const lines = [
    "Experimental registry",
    `Gate: ${report.gate && report.gate.enabled ? "enabled" : "disabled"}`,
    `Summary: ${report.summary || "(none)"}`,
    "",
    "Available commands:",
    ...report.availableCommands.map((command) => `- ${command}`),
  ];

  if (Array.isArray(report.configuredCommands)) {
    lines.push("", "Configured private names:");
    if (report.configuredCommands.length) {
      report.configuredCommands.forEach((command) => {
        lines.push(`- ${command}`);
      });
    } else {
      lines.push("- (none)");
    }
  }

  if (Array.isArray(report.warnings) && report.warnings.length) {
    lines.push("", "Warnings:");
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  if (report.nextCommand) {
    lines.push("", `Next: ${report.nextCommand}`);
  }

  return lines.join("\n");
}

function formatExperimentalRegistryCompact(report) {
  return [
    `experimental=${report.gate && report.gate.enabled ? 1 : 0}`,
    `kind=${report.kind}`,
    `available=${Array.isArray(report.availableCommands) ? report.availableCommands.length : 0}`,
    `configured=${Array.isArray(report.configuredCommands) ? report.configuredCommands.length : 0}`,
    `warnings=${Array.isArray(report.warnings) ? report.warnings.length : 0}`,
  ].join(" ");
}

module.exports = {
  EXPERIMENTAL_COMMANDS,
  buildExperimentalRegistryReport,
  formatExperimentalRegistryLines,
  formatExperimentalRegistryCompact,
};
