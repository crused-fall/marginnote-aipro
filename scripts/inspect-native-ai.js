const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const APP_PATH = process.env.MN4_APP_PATH || "/Applications/MarginNote 4.app";
const BUNDLE_ID = "QReader.MarginStudy.easy";
const RESOURCES_DIR = path.join(APP_PATH, "Contents", "Resources");
const BINARY_PATH = path.join(APP_PATH, "Contents", "MacOS", "MarginNote 4");
const CONTAINER_DIR = path.join(
  os.homedir(),
  "Library",
  "Containers",
  BUNDLE_ID,
  "Data",
  "Documents"
);
const SQLITE_PATH = path.join(
  CONTAINER_DIR,
  ".MN4NotebookDatabase",
  "MarginNotes.sqlite"
);

const STRING_SIGNAL_GROUPS = {
  chat: [
    "Chat with AI",
    "AI Chat",
    "Inline Chat",
    "Add to Chat"
  ],
  studyModes: [
    "Guide Mode",
    "Quiz Mode",
    "Explain Mode"
  ],
  toolConfirmation: [
    "AI Function Call",
    "Accept Function Call",
    "Accept All Function Calls",
    "All Tools Warning"
  ],
  ocr: [
    "AI OCR Prompt",
    "AI OCR Prompts",
    "AI OCR Field Config",
    "AIOCR Field Title",
    "AIOCR Field Content",
    "AIOCR Field Cloze",
    "AIOCR Field Comment",
    "AIOCR Field Flashcard"
  ],
  breakdown: [
    "AI Breakdown",
    "AI Breakdown Running",
    "AIBreakdownGeneratingStructure",
    "AIBreakdownParsingStructure",
    "AIBreakdownCreatingCards",
    "AIBreakdownCollectingNotes",
    "AIBreakdownOrganizing",
    "AIBreakdownCompletedWithCredits"
  ],
  styleLearning: [
    "AI learns your mind map style",
    "Based on Few-shot learning",
    "Generate Template from Branch"
  ],
  credits: [
    "AI Credits",
    "Subscribe to MAX",
    "Access to advanced AI models"
  ]
};

const BINARY_SIGNAL_TOKENS = [
  "Inline Chat",
  "Guide Mode",
  "Quiz Mode",
  "Explain Mode",
  "OpenAgent",
  "StopAgent",
  "AI Chat",
  "Function call confirmation enabled",
  "AIBreakdown",
  "AIBreakdownProgress"
];

function run(command, args, options) {
  const result = spawnSync(command, args, Object.assign(
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024
    },
    options || {}
  ));
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function runShell(command, options) {
  return run("/bin/sh", ["-lc", command], options);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function fileExists(targetPath) {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch (error) {
    return false;
  }
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function plutilExtract(plistPath, key, format) {
  const result = run("plutil", [
    "-extract",
    key,
    format || "raw",
    "-o",
    "-",
    plistPath
  ]);
  if (!result.ok) return null;
  const text = result.stdout.trim();
  if (!text) return null;
  if ((format || "raw") === "json") {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }
  return text;
}

function parseBoolean(value) {
  if (value === true || value === false) return value;
  if (typeof value !== "string") return null;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function normalizePromptText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function extractToolNames(promptText) {
  const text = typeof promptText === "string" ? promptText : "";
  const matches = [];
  const regex = /-\s+\*\*([a-z0-9_]+)\*\*/gi;
  let match;
  while ((match = regex.exec(text))) {
    matches.push(match[1]);
  }
  return unique(matches);
}

function moduleSummary(modulesFile) {
  if (!fileExists(modulesFile)) {
    return {
      file: modulesFile,
      exists: false,
      moduleCount: 0,
      categoryCounts: {},
      toolNames: []
    };
  }

  const data = readJsonFile(modulesFile);
  const modules = Array.isArray(data.modules) ? data.modules : [];
  const categoryCounts = {};
  const promptsText = modules
    .map((item) => `${item.tag || ""}\n${item.prompt || ""}\n${item.description || ""}`)
    .join("\n");
  const fullTools = modules.find((item) => item && item.tag === "Full Tools");

  modules.forEach((item) => {
    const category = item && item.category ? item.category : "unknown";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return {
    file: modulesFile,
    exists: true,
    moduleCount: modules.length,
    categoryCounts,
    toolContract: !!fullTools,
    toolConfirmationRequired: /explain first|user confirms|explicit user confirmation/i.test(
      fullTools && fullTools.prompt ? fullTools.prompt : ""
    ),
    toolNames: extractToolNames(fullTools && fullTools.prompt ? fullTools.prompt : ""),
    documentQa: /get_document_toc/.test(promptsText) && /get_page_content/.test(promptsText),
    mindMapQa:
      /get_studyset_structure/.test(promptsText) &&
      /get_card_meta/.test(promptsText) &&
      /get_card_content/.test(promptsText),
    databaseQa: /search_in_database/.test(promptsText),
    webFetch: /fetch_url/.test(promptsText),
    cardCreation:
      /create_card/.test(promptsText) ||
      /create_card_tree/.test(promptsText) ||
      /create_summary_card/.test(promptsText),
    hierarchyMutation:
      /move_cards_in_hierarchy/.test(promptsText) ||
      /merge_cards/.test(promptsText) ||
      /duplicate_or_link_card/.test(promptsText) ||
      /delete_cards/.test(promptsText)
  };
}

function readStringsMap(stringsPath) {
  if (!fileExists(stringsPath)) return {};
  const result = run("plutil", ["-convert", "json", "-o", "-", stringsPath]);
  if (!result.ok || !result.stdout.trim()) return {};
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    return {};
  }
}

function findStringSignals(stringsMap) {
  const entries = Object.entries(stringsMap || {});
  const haystacks = entries.map(([key, value]) => `${key}\n${value || ""}`);
  const result = {};

  Object.keys(STRING_SIGNAL_GROUPS).forEach((group) => {
    const tokens = STRING_SIGNAL_GROUPS[group];
    result[group] = tokens.filter((token) => {
      const lowerToken = token.toLowerCase();
      return haystacks.some((item) => String(item).toLowerCase().includes(lowerToken));
    });
  });

  return result;
}

function scanBinarySignals(binaryPath) {
  if (!fileExists(binaryPath)) {
    return {
      exists: false,
      matched: []
    };
  }

  const pattern = BINARY_SIGNAL_TOKENS
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const result = runShell(
    `strings -a ${shellQuote(binaryPath)} | rg -o ${shellQuote(pattern)}`,
    {}
  );

  return {
    exists: true,
    matched: unique(result.stdout.split(/\r?\n/).map((item) => item.trim()))
  };
}

function exportDefaultsToTempFile() {
  const tempFile = path.join(
    os.tmpdir(),
    `mn4-native-ai-${process.pid}-${Date.now()}.plist`
  );
  const result = run("defaults", ["export", BUNDLE_ID, tempFile]);
  if (!result.ok) return null;
  return tempFile;
}

function parseAIOcrConfig(rawConfig) {
  if (typeof rawConfig !== "string") return null;
  const jsonText = rawConfig.replace(/^#AIOCR_CONFIG#\s*/, "");
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    return null;
  }
}

function classifyTemplateKind(fields) {
  const prompts = (Array.isArray(fields) ? fields : [])
    .map((field) => normalizePromptText(field.prompt).toLowerCase())
    .filter(Boolean)
    .join(" | ");

  if (/mermaid|流程图|可视化流程|visualize the process/.test(prompts)) {
    return "mermaid";
  }
  if (/翻译|translate/.test(prompts)) {
    return "translation";
  }
  if (/总结|summarize|核心内容|key concepts/.test(prompts)) {
    return "summary";
  }
  if (/复习|flashcard|挖空|memorization|review questions/.test(prompts)) {
    return "review";
  }
  return "custom";
}

function summarizeAIOcrPrompts(rawPrompts) {
  const configs = (Array.isArray(rawPrompts) ? rawPrompts : [])
    .map((rawConfig, index) => ({ index, config: parseAIOcrConfig(rawConfig) }))
    .filter((item) => item.config)
    .map((item) => Object.assign({ index: item.index }, item.config))
    .filter(Boolean);
  const promptSamples = [];
  const templates = [];

  configs.forEach((config) => {
    const fields = Array.isArray(config.fields) ? config.fields : [];
    const normalizedFields = fields.map((field) => ({
      type: field && field.type ? field.type : "unknown",
      enabled: !!(field && field.enabled),
      prompt: normalizePromptText(field && field.prompt ? field.prompt : ""),
      format:
        field && typeof field.format === "number" ? field.format : null,
      cloze: !!(field && field.cloze)
    }));
    const enabledFields = normalizedFields.filter((field) => field.enabled);
    fields.forEach((field) => {
      const prompt = typeof field.prompt === "string" ? field.prompt.trim() : "";
      if (prompt) promptSamples.push(prompt);
    });
    templates.push({
      index: config.index,
      deepMode: !!config.deepMode,
      kind: classifyTemplateKind(normalizedFields),
      fieldCount: normalizedFields.length,
      enabledFieldCount: enabledFields.length,
      enabledContentFieldCount: enabledFields.filter((field) => field.type === "content").length,
      fields: normalizedFields
    });
  });

  return {
    configCount: configs.length,
    deepModeCount: configs.filter((item) => item.deepMode).length,
    promptSamples: unique(promptSamples).slice(0, 8),
    templates
  };
}

function readPreferencesEvidence() {
  const tempPlist = exportDefaultsToTempFile();
  if (!tempPlist) {
    return {
      exported: false
    };
  }

  try {
    const aiocrRaw = plutilExtract(tempPlist, "mindbooks_aiocr_prompts1", "json");
    return {
      exported: true,
      mindbooksToolName: plutilExtract(tempPlist, "mindbooks_toolname", "raw"),
      useAiOcr: parseBoolean(plutilExtract(tempPlist, "mindbooks_use_ai_ocr", "raw")),
      aiServiceRegion: plutilExtract(tempPlist, "mindbooks_ai_service_region", "raw"),
      aiServiceType1: plutilExtract(tempPlist, "mindbooks_ai_service_type1", "raw"),
      aiBreakdownWorkflowType: plutilExtract(
        tempPlist,
        "AIBreakdownLastSelectedWorkflowType",
        "raw"
      ),
      aiBreakdownMode: plutilExtract(tempPlist, "AIBreakdownLastSelectedMode", "raw"),
      aiBreakdownCustomInstructions: plutilExtract(
        tempPlist,
        "AIBreakdown_CustomInstructions_2",
        "raw"
      ),
      aiocrTemplates: summarizeAIOcrPrompts(aiocrRaw)
    };
  } finally {
    fs.rmSync(tempPlist, { force: true });
  }
}

function directorySnapshot(targetPath) {
  if (!fileExists(targetPath)) {
    return {
      path: targetPath,
      exists: false,
      entries: []
    };
  }

  let entries = [];
  try {
    entries = fs.readdirSync(targetPath);
  } catch (error) {
    entries = [];
  }

  return {
    path: targetPath,
    exists: true,
    entryCount: entries.length,
    entries: entries.slice(0, 12)
  };
}

function sqliteSnapshot(targetPath) {
  if (!fileExists(targetPath)) {
    return {
      path: targetPath,
      exists: false
    };
  }

  const stat = fs.statSync(targetPath);
  return {
    path: targetPath,
    exists: true,
    sizeBytes: stat.size
  };
}

function inspect() {
  const infoPlist = path.join(APP_PATH, "Contents", "Info.plist");
  const appInfo = {
    appPath: APP_PATH,
    exists: fileExists(APP_PATH),
    bundleId: fileExists(infoPlist)
      ? plutilExtract(infoPlist, "CFBundleIdentifier", "raw")
      : null,
    version: fileExists(infoPlist)
      ? plutilExtract(infoPlist, "CFBundleShortVersionString", "raw")
      : null,
    build: fileExists(infoPlist)
      ? plutilExtract(infoPlist, "CFBundleVersion", "raw")
      : null
  };

  const promptModulesEn = moduleSummary(path.join(RESOURCES_DIR, "PromptModules-en.json"));
  const promptModulesZh = moduleSummary(path.join(RESOURCES_DIR, "PromptModules-zh-Hans.json"));
  const toolNames = unique(
    []
      .concat(promptModulesEn.toolNames || [])
      .concat(promptModulesZh.toolNames || [])
  );
  const stringsMap = readStringsMap(
    path.join(RESOURCES_DIR, "en.lproj", "Localizable.strings")
  );
  const stringSignals = findStringSignals(stringsMap);
  const prefs = readPreferencesEvidence();
  const binarySignals = scanBinarySignals(BINARY_PATH);
  const chatMemories = directorySnapshot(path.join(CONTAINER_DIR, "ChatMemories"));
  const aiBreakdownProgress = directorySnapshot(
    path.join(CONTAINER_DIR, "AIBreakdownProgress")
  );
  const sqlite = sqliteSnapshot(SQLITE_PATH);

  const conclusions = {
    nativeAiPresent:
      appInfo.exists &&
      toolNames.length > 0 &&
      (stringSignals.chat || []).length > 0,
    toolCallContractPresent: toolNames.length > 0,
    studyModesPresent: (stringSignals.studyModes || []).length >= 3,
    aiOcrPresent:
      !!prefs.mindbooksToolName ||
      (stringSignals.ocr || []).length > 0 ||
      (prefs.aiocrTemplates && prefs.aiocrTemplates.configCount > 0),
    aiBreakdownPresent:
      (stringSignals.breakdown || []).length > 0 ||
      aiBreakdownProgress.exists,
    internalStatePersists:
      chatMemories.exists || aiBreakdownProgress.exists || sqlite.exists,
    publicPluginAccessVerified: false,
    emptySqlitePlaceholder: sqlite.exists && sqlite.sizeBytes === 0
  };

  return {
    generatedAt: new Date().toISOString(),
    appInfo,
    promptModules: {
      en: promptModulesEn,
      zhHans: promptModulesZh,
      toolNames
    },
    stringSignals,
    binarySignals,
    preferences: prefs,
    containerState: {
      root: CONTAINER_DIR,
      chatMemories,
      aiBreakdownProgress,
      sqlite
    },
    conclusions
  };
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function formatList(items) {
  return (items || []).length ? items.join(", ") : "(none)";
}

function renderText(report) {
  const lines = [
    "MarginNote 4 Native AI Inspection",
    `Generated: ${report.generatedAt}`,
    "",
    "Environment:",
    `- App: ${report.appInfo.appPath}`,
    `- Present: ${yesNo(report.appInfo.exists)}`,
    `- Bundle ID: ${report.appInfo.bundleId || "(unknown)"}`,
    `- Version: ${report.appInfo.version || "(unknown)"}`,
    `- Build: ${report.appInfo.build || "(unknown)"}`,
    "",
    "Prompt modules:",
    `- en modules: ${report.promptModules.en.moduleCount || 0}`,
    `- zh-Hans modules: ${report.promptModules.zhHans.moduleCount || 0}`,
    `- Tool-call contract present: ${yesNo(report.conclusions.toolCallContractPresent)}`,
    `- Tool confirmation wording present: ${yesNo(
      report.promptModules.en.toolConfirmationRequired ||
        report.promptModules.zhHans.toolConfirmationRequired
    )}`,
    `- Internal tools (${report.promptModules.toolNames.length}): ${formatList(
      report.promptModules.toolNames
    )}`,
    `- Document QA: ${yesNo(
      report.promptModules.en.documentQa || report.promptModules.zhHans.documentQa
    )}`,
    `- Mind map QA: ${yesNo(
      report.promptModules.en.mindMapQa || report.promptModules.zhHans.mindMapQa
    )}`,
    `- Database QA: ${yesNo(
      report.promptModules.en.databaseQa || report.promptModules.zhHans.databaseQa
    )}`,
    `- Card creation: ${yesNo(
      report.promptModules.en.cardCreation || report.promptModules.zhHans.cardCreation
    )}`,
    `- Hierarchy mutation tools: ${yesNo(
      report.promptModules.en.hierarchyMutation ||
        report.promptModules.zhHans.hierarchyMutation
    )}`,
    "",
    "Localized UI signals:",
    `- Chat: ${formatList(report.stringSignals.chat)}`,
    `- Study modes: ${formatList(report.stringSignals.studyModes)}`,
    `- Tool confirmation: ${formatList(report.stringSignals.toolConfirmation)}`,
    `- AI OCR: ${formatList(report.stringSignals.ocr)}`,
    `- AI Breakdown: ${formatList(report.stringSignals.breakdown)}`,
    `- Style learning: ${formatList(report.stringSignals.styleLearning)}`,
    `- Credits / MAX: ${formatList(report.stringSignals.credits)}`,
    "",
    "Binary signals:",
    `- Matched: ${formatList(report.binarySignals.matched)}`,
    "",
    "Local user-state evidence:",
    `- mindbooks_toolname: ${report.preferences.mindbooksToolName || "(missing)"}`,
    `- mindbooks_use_ai_ocr: ${String(report.preferences.useAiOcr)}`,
    `- mindbooks_ai_service_region: ${report.preferences.aiServiceRegion || "(missing)"}`,
    `- mindbooks_ai_service_type1: ${report.preferences.aiServiceType1 || "(missing)"}`,
    `- AI OCR template configs: ${
      report.preferences.aiocrTemplates
        ? report.preferences.aiocrTemplates.configCount
        : 0
    }`,
    `- AI OCR prompt samples: ${
      report.preferences.aiocrTemplates
        ? formatList(report.preferences.aiocrTemplates.promptSamples)
        : "(none)"
    }`,
    `- AI Breakdown last workflow: ${report.preferences.aiBreakdownWorkflowType || "(missing)"}`,
    `- AI Breakdown last mode: ${report.preferences.aiBreakdownMode || "(missing)"}`,
    `- AI Breakdown custom instructions present: ${yesNo(
      !!report.preferences.aiBreakdownCustomInstructions
    )}`,
    "",
    "Container traces:",
    `- ChatMemories: ${yesNo(report.containerState.chatMemories.exists)} (${report.containerState.chatMemories.entryCount || 0} entries)`,
    `- AIBreakdownProgress: ${yesNo(
      report.containerState.aiBreakdownProgress.exists
    )} (${report.containerState.aiBreakdownProgress.entryCount || 0} entries)`,
    `- MarginNotes.sqlite present: ${yesNo(report.containerState.sqlite.exists)}`,
    `- MarginNotes.sqlite size: ${
      typeof report.containerState.sqlite.sizeBytes === "number"
        ? `${report.containerState.sqlite.sizeBytes} bytes`
        : "(missing)"
    }`,
    "",
    "Conclusion:",
    `- Native AI present on this machine: ${yesNo(report.conclusions.nativeAiPresent)}`,
    `- Broader than chat only: ${yesNo(
      report.conclusions.toolCallContractPresent &&
        report.conclusions.studyModesPresent &&
        report.conclusions.aiOcrPresent &&
        report.conclusions.aiBreakdownPresent
    )}`,
    `- Internal state traces exist: ${yesNo(report.conclusions.internalStatePersists)}`,
    `- Stable public plugin access to the internal tool engine is proven: ${yesNo(
      report.conclusions.publicPluginAccessVerified
    )}`,
    `- Empty local sqlite placeholder detected: ${yesNo(
      report.conclusions.emptySqlitePlaceholder
    )}`,
    "",
    "Recommendation:",
    "- Treat MarginNote native AI as an adjacent internal agent system to augment and supervise, not a blank slate to replace.",
    "- Use this script for repeatable local evidence before relying on any specific native AI workflow in the plugin."
  ];

  return lines.join("\n");
}

function main() {
  const jsonMode = process.argv.includes("--json");
  const report = inspect();
  process.stdout.write(
    jsonMode ? `${JSON.stringify(report, null, 2)}\n` : `${renderText(report)}\n`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  inspect,
  renderText
};
