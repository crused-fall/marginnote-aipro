const assert = require("assert");
const {
  analyzeTemplates
} = require("../bridge/native-ai-template-governance");

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

  process.stdout.write(
    `Template governance checks OK: diffs=${report.templateDiffs.length}, quality=${report.qualityFindings.length}, normalize=${report.normalizationSuggestions.length}\n`
  );
}

main();
