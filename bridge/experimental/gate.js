const DEFAULT_EXPERIMENTAL_FLAG = "MNAIPRO_EXPERIMENTAL";
const DEFAULT_EXPERIMENTAL_COMMANDS_FLAG = "MNAIPRO_EXPERIMENTAL_COMMANDS";

function compactText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseExperimentalFlag(value) {
  if (typeof value === "boolean") return value;
  if (value == null) return false;
  const text = compactText(value).toLowerCase();
  if (!text) return false;
  return ["1", "true", "yes", "on", "enabled", "experimental"].includes(text);
}

function parseExperimentalCommands(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[,;\n]/)
        .map((item) => compactText(item))
        .filter(Boolean)
    )
  );
}

function buildExperimentalState(env = process.env) {
  const enabled = parseExperimentalFlag(env[DEFAULT_EXPERIMENTAL_FLAG] || env.MN_EXPERIMENTAL);
  const commands = enabled
    ? parseExperimentalCommands(env[DEFAULT_EXPERIMENTAL_COMMANDS_FLAG] || env.MN_EXPERIMENTAL_COMMANDS)
    : [];

  return {
    ok: true,
    kind: "experimental_gate",
    enabled,
    mode: enabled ? "experimental" : "stable",
    flagName: DEFAULT_EXPERIMENTAL_FLAG,
    commands,
    warnings: enabled ? [] : ["experimental_disabled"],
    summary: enabled
      ? commands.length
        ? `Experimental gate enabled for ${commands.length} configured command(s).`
        : "Experimental gate enabled; no private commands are configured yet."
      : "Experimental gate disabled; stable commands remain unchanged.",
    stableSurfaceOnly: !enabled || commands.length === 0,
    nextCommand: enabled
      ? "mnaipro experimental status --json"
      : `Set ${DEFAULT_EXPERIMENTAL_FLAG}=1 to expose gated commands.`,
  };
}

function formatExperimentalLines(state) {
  const lines = [
    `Experimental gate: ${state.enabled ? "enabled" : "disabled"}`,
    `Mode: ${state.mode}`,
    `Flag: ${state.flagName}`,
    `Stable surface only: ${state.stableSurfaceOnly ? "yes" : "no"}`,
    `Summary: ${state.summary}`,
  ];

  if (state.commands.length) {
    lines.push("", "Configured commands:");
    state.commands.forEach((command) => {
      lines.push(`- ${command}`);
    });
  }

  if (state.warnings.length) {
    lines.push("", "Warnings:");
    state.warnings.forEach((warning) => {
      lines.push(`- ${warning}`);
    });
  }

  if (state.nextCommand) {
    lines.push("", `Next: ${state.nextCommand}`);
  }

  return lines.join("\n");
}

function formatExperimentalCompact(state) {
  const bits = [
    `experimental=${state.enabled ? 1 : 0}`,
    `mode=${state.mode}`,
    `commands=${state.commands.length}`,
    `stable_only=${state.stableSurfaceOnly ? 1 : 0}`,
  ];
  if (state.warnings.length) {
    bits.push(`warnings=${state.warnings.join(",")}`);
  }
  return bits.join(" ");
}

module.exports = {
  DEFAULT_EXPERIMENTAL_FLAG,
  DEFAULT_EXPERIMENTAL_COMMANDS_FLAG,
  parseExperimentalFlag,
  parseExperimentalCommands,
  buildExperimentalState,
  formatExperimentalLines,
  formatExperimentalCompact,
};
