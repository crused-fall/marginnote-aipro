const assert = require("assert");
const {
  analyzeTemplates
} = require("../bridge/native-ai-template-governance");
const {
  buildTemplateReport,
  renderText
} = require("./inspect-native-ai-templates");

function sampleTemplates() {
  return [
    {
      index: 0,
      kind: "translation",
      deepMode: false,
      fieldCount: 3,
      enabledFieldCount: 1,
      enabledContentFieldCount: 1,
      fields: [
        { type: "title", enabled: false, prompt: "", cloze: false },
        { type: "content", enabled: true, prompt: "  翻译成英文  ", cloze: false },
        { type: "flashcard", enabled: false, prompt: "", cloze: true }
      ]
    },
    {
      index: 1,
      kind: "translation",
      deepMode: false,
      fieldCount: 3,
      enabledFieldCount: 1,
      enabledContentFieldCount: 1,
      fields: [
        { type: "title", enabled: false, prompt: "", cloze: false },
        { type: "content", enabled: true, prompt: "翻译成中文", cloze: false },
        { type: "flashcard", enabled: false, prompt: "", cloze: true }
      ]
    },
    {
      index: 2,
      kind: "review",
      deepMode: false,
      fieldCount: 3,
      enabledFieldCount: 3,
      enabledContentFieldCount: 1,
      fields: [
        { type: "title", enabled: true, prompt: "提取卡片标题", cloze: false },
        { type: "content", enabled: true, prompt: "整理和组织内容", cloze: false },
        { type: "flashcard", enabled: true, prompt: "生成复习问题", cloze: true }
      ]
    }
  ];
}

function cleanTemplates() {
  return [
    {
      index: 0,
      kind: "summary",
      deepMode: false,
      fieldCount: 2,
      enabledFieldCount: 1,
      enabledContentFieldCount: 1,
      fields: [
        { type: "title", enabled: false, prompt: "", cloze: false },
        { type: "content", enabled: true, prompt: "翻译成中文", cloze: false }
      ]
    }
  ];
}

function main() {
  const report = analyzeTemplates(sampleTemplates());

  assert(Array.isArray(report.normalizationSuggestions), "missing normalization suggestions");
  assert(Array.isArray(report.qualityFindings), "missing quality findings");
  assert(Array.isArray(report.templateDiffs), "missing template diffs");

  assert(
    report.normalizationSuggestions.some(
      (item) =>
        item.templateIndex === 0 &&
        item.fieldType === "content" &&
        item.suggestedPrompt === "翻译成英文"
    ),
    "expected whitespace normalization suggestion for template 0 content prompt"
  );

  assert(
    report.qualityFindings.some(
      (item) =>
        item.templateIndex === 2 &&
        item.fieldType === "content" &&
        item.code === "generic_content_prompt"
    ),
    "expected generic content prompt finding for template 2"
  );

  assert(
    report.templateDiffs.some(
      (item) =>
        item.leftTemplateIndex === 0 &&
        item.rightTemplateIndex === 1 &&
        item.sameKind === true &&
        item.changedFieldTypes.includes("content")
    ),
    "expected same-kind diff between translation templates"
  );

  assert(report.patchExport, "expected patch export to exist");
  assert.strictEqual(report.patchExport.format, "template-patch-proposal-v1");
  assert.strictEqual(report.patchExport.safeOnly, true);
  assert.strictEqual(report.patchExport.summary.proposalCount, 1);
  assert.strictEqual(report.patchExport.summary.affectedTemplateCount, 1);
  assert.deepStrictEqual(report.patchExport.summary.affectedTemplateIndexes, [0]);
  assert.strictEqual(report.patchExport.proposals.length, 1);
  assert.strictEqual(report.patchExport.proposals[0].op, "replace");
  assert.strictEqual(report.patchExport.proposals[0].path, "templates[0].fields[1].prompt");
  assert.strictEqual(report.patchExport.proposals[0].before, "  翻译成英文  ");
  assert.strictEqual(report.patchExport.proposals[0].after, "翻译成英文");
  assert.strictEqual(report.patchExport.proposals[0].safe, true);

  const cleanReport = analyzeTemplates(cleanTemplates());
  assert(cleanReport.patchExport, "expected clean patch export to exist");
  assert.strictEqual(cleanReport.patchExport.summary.proposalCount, 0);
  assert.deepStrictEqual(cleanReport.patchExport.proposals, []);

  const textReport = renderText(buildTemplateReport());
  assert(textReport.includes("Patch export:"), "expected text patch export section");
  assert(
    textReport.trimEnd().endsWith("Preview-only: this command does not write back to MarginNote."),
    "expected preview-only boundary text"
  );

  process.stdout.write(
    `Template governance checks OK: diffs=${report.templateDiffs.length}, quality=${report.qualityFindings.length}, normalize=${report.normalizationSuggestions.length}\n`
  );
}

main();
