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

  return lines.join("\n");
}

function main() {
  const jsonMode = process.argv.includes("--json");
  const report = buildTemplateReport();
  process.stdout.write(
    jsonMode ? `${JSON.stringify(report, null, 2)}\n` : `${renderText(report)}\n`
  );
}

main();
