#!/usr/bin/env node

const {
  buildBreakdownArtifactAudit,
  formatBreakdownArtifactAudit,
  formatBreakdownArtifactAuditCompact,
} = require("../bridge/breakdown-artifact-audit");

function parseArgs(argv) {
  const options = {
    help: false,
    json: false,
    compact: false,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--compact") {
      options.compact = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function outputText(text) {
  process.stdout.write(`${text}\n`);
}

function outputJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    outputText(
      [
        "Native AI Breakdown Artifact Audit",
        "Usage: inspect-native-ai-breakdown-artifacts [--json|--compact]",
        "",
        "Reads the local request/report cache and summarizes whether native_ai_breakdown",
        "request/plan/apply/followup artifacts exist as one coherent chain.",
      ].join("\n")
    );
    return;
  }

  const report = buildBreakdownArtifactAudit();

  if (options.json) {
    outputJson(report);
    return;
  }

  if (options.compact) {
    outputText(formatBreakdownArtifactAuditCompact(report));
    return;
  }

  outputText(formatBreakdownArtifactAudit(report));
}

main();
