const { inspect } = require("./inspect-native-ai");
const { analyzeTemplates } = require("../bridge/native-ai-template-governance");

function summarizeKinds(templates) {
  const counts = {};
  templates.forEach((template) => {
    const key = template.kind || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function buildTemplateReport() {
  const inspection = inspect();
  const aiocr = inspection.preferences && inspection.preferences.aiocrTemplates
    ? inspection.preferences.aiocrTemplates
    : {};
  const templates = Array.isArray(aiocr.templates) ? aiocr.templates : [];
  const governance = analyzeTemplates(templates);

  return {
    generatedAt: new Date().toISOString(),
    appVersion: inspection.appInfo ? inspection.appInfo.version : null,
    appBuild: inspection.appInfo ? inspection.appInfo.build : null,
    configCount: aiocr.configCount || 0,
    deepModeCount: aiocr.deepModeCount || 0,
    kinds: summarizeKinds(templates),
    templates,
    warnings: governance.qualityFindings,
    normalizationSuggestions: governance.normalizationSuggestions,
    templateDiffs: governance.templateDiffs,
    patchExport: governance.patchExport,
    recommendations: governance.recommendations
  };
}

function renderText(report) {
  const lines = [
    "MarginNote 4 Native AI Template Mirror",
    `Generated: ${report.generatedAt}`,
    `App version: ${report.appVersion || "(unknown)"} (${report.appBuild || "unknown"})`,
    `Template configs: ${report.configCount}`,
    `Deep-mode templates: ${report.deepModeCount}`,
    "Kinds:"
  ];

  Object.keys(report.kinds)
    .sort()
    .forEach((key) => {
      lines.push(`- ${key}: ${report.kinds[key]}`);
    });

  if (report.warnings.length) {
    lines.push("", "Lint:");
    report.warnings.forEach((warning) => {
      lines.push(
        `- [${warning.severity}] template ${warning.templateIndex}: ${warning.message}`
      );
    });
  } else {
    lines.push("", "Lint:", "- No structural template warnings detected.");
  }

  if (report.normalizationSuggestions.length) {
    lines.push("", "Normalization:");
    report.normalizationSuggestions.forEach((item) => {
      lines.push(
        `- template ${item.templateIndex} field ${item.fieldType}: "${item.currentPrompt}" -> "${item.suggestedPrompt}"`
      );
    });
  }

  const sameKindDiffs = report.templateDiffs.filter((item) => item.sameKind);
  if (sameKindDiffs.length) {
    lines.push("", "Diffs:");
    sameKindDiffs.forEach((item) => {
      lines.push(
        `- template ${item.leftTemplateIndex} vs ${item.rightTemplateIndex}: changed=${item.changedFieldTypes.join(", ") || "(none)"}`
      );
    });
  }

  if (report.recommendations.length) {
    lines.push("", "Recommendations:");
    report.recommendations.forEach((item) => {
      lines.push(`- ${item}`);
    });
  }

  const patchExport = report.patchExport || { summary: { proposalCount: 0 }, proposals: [] };
  lines.push("", "Patch export:");
  lines.push(
    `- Format: ${patchExport.format || "template-patch-proposal-v1"} | safeOnly=${patchExport.safeOnly ? "yes" : "no"} | proposals=${patchExport.summary && typeof patchExport.summary.proposalCount === "number" ? patchExport.summary.proposalCount : 0}`
  );
  if (patchExport.summary && Array.isArray(patchExport.summary.affectedTemplateIndexes) && patchExport.summary.affectedTemplateIndexes.length) {
    lines.push(
      `- Affected templates: ${patchExport.summary.affectedTemplateIndexes.join(", ")}`
    );
  }
  if (Array.isArray(patchExport.proposals) && patchExport.proposals.length) {
    patchExport.proposals.forEach((proposal) => {
      lines.push(
        `- ${proposal.path}: "${proposal.before}" -> "${proposal.after}" [${proposal.reason}]`
      );
    });
  } else {
    lines.push("- No patch proposals generated.");
  }

  report.templates.forEach((template) => {
    lines.push("");
    lines.push(`Template ${template.index}`);
    lines.push(`- Kind: ${template.kind}`);
    lines.push(`- Deep mode: ${template.deepMode ? "yes" : "no"}`);
    lines.push(`- Enabled fields: ${template.enabledFieldCount}/${template.fieldCount}`);
    template.fields.forEach((field) => {
      lines.push(
        `- Field ${field.type} | enabled=${field.enabled ? 1 : 0} | cloze=${field.cloze ? 1 : 0} | prompt=${field.prompt || "(empty)"}`
      );
    });
  });

  lines.push("");
  lines.push("- Preview-only: this command does not write back to MarginNote.");

  return lines.join("\n");
}

function main() {
  const jsonMode = process.argv.includes("--json");
  const report = buildTemplateReport();
  process.stdout.write(
    jsonMode ? `${JSON.stringify(report, null, 2)}\n` : `${renderText(report)}\n`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  buildTemplateReport,
  renderText
};
