const STRUCTURE_CHILD_THRESHOLD = 6;
const TARGET_CHILD_COUNT = 4;
const SHAPE_CHILD_TRIGGER_COUNT = 4;
const SHAPE_HORIZONTAL_SPAN_THRESHOLD = 900;
const SHAPE_VERTICAL_SPAN_THRESHOLD = 520;
const SHAPE_DEPTH_THRESHOLD = 4;
const SHAPE_COLLAPSED_THRESHOLD = 2;
const LONG_TITLE_THRESHOLD = 42;
const SUMMARY_LENGTH = 96;
const BRANCH_DIGEST_LENGTH = 160;
const MAX_PRIMARY_NON_SUMMARY_COLOR_ACTIONS = 3;
const COMMENT_PREFIX_ZH = "整理建议：";
const COMMENT_PREFIX_EN = "Organize note:";
const EN_STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "basic",
  "example",
  "first",
  "from",
  "into",
  "note",
  "proof",
  "section",
  "that",
  "their",
  "there",
  "these",
  "this",
  "using",
  "with",
]);
const TOPIC_LABELS = {
  comparison: { zh: "对比", en: "comparison" },
  definition: { zh: "定义", en: "definition" },
  example: { zh: "例题", en: "example" },
  formula: { zh: "公式", en: "formula" },
  proof: { zh: "证明", en: "proof" },
  question: { zh: "问题", en: "question" },
  summary: { zh: "总结", en: "summary" },
  theorem: { zh: "定理", en: "theorem" },
};
const VISUAL_ROLE_COLOR_INDEX = {
  summary_branch: 6,
  question: 2,
  theorem: 4,
  proof: 4,
  definition: 5,
  formula: 5,
  example: 3,
  comparison: 7,
};
const VISUAL_ROLE_PRIORITY = {
  summary_branch: 0,
  question: 1,
  definition: 2,
  formula: 2,
  theorem: 3,
  proof: 3,
  comparison: 4,
  example: 5,
};

function dedupe(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function compactText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function roundConfidence(value) {
  return Math.max(0, Math.min(1, Math.round(Number(value || 0) * 100) / 100));
}

function buildMeta(source, confidence, evidence) {
  return {
    source,
    confidence: roundConfidence(confidence),
    evidence: (evidence || []).map(compactText).filter(Boolean),
  };
}

function buildExecution(disposition, reason) {
  return {
    disposition,
    reason: compactText(reason),
  };
}

function classifyActionPhase(action) {
  const source = action && action.meta ? action.meta.source : "";
  if (source === "legacy_cleanup" || action.type === "remove_comments_by_text") {
    return "cleanup";
  }
  if (
    source === "weak_title_repair" ||
    source === "visual_role_coloring" ||
    source === "branch_group_organization" ||
    source === "duplicate_title_disambiguation" ||
    action.type === "set_title" ||
    action.type === "set_color_index"
  ) {
    return "normalize";
  }
  return "enrich";
}

function annotateActionPhase(action) {
  return Object.assign({}, action, {
    phase: classifyActionPhase(action),
  });
}

function actionPhasePriority(phase) {
  if (phase === "cleanup") return 0;
  if (phase === "normalize") return 1;
  return 2;
}

function actionTypePriority(type) {
  if (type === "remove_comments_by_text") return 0;
  if (type === "rewrite_excerpt") return 1;
  if (type === "set_title") return 2;
  if (type === "set_color_index") return 3;
  if (type === "organize_branch_groups") return 4;
  if (type === "append_tags") return 5;
  if (type === "append_comment") return 6;
  return 9;
}

function sortActions(actions, noteOrderMap) {
  return [...(actions || [])].sort((left, right) => {
    const phaseDelta = actionPhasePriority(left.phase) - actionPhasePriority(right.phase);
    if (phaseDelta !== 0) return phaseDelta;

    const noteDelta =
      (noteOrderMap.get(left.noteId) ?? Number.MAX_SAFE_INTEGER) -
      (noteOrderMap.get(right.noteId) ?? Number.MAX_SAFE_INTEGER);
    if (noteDelta !== 0) return noteDelta;

    const typeDelta = actionTypePriority(left.type) - actionTypePriority(right.type);
    if (typeDelta !== 0) return typeDelta;

    return String(left.noteId || "").localeCompare(String(right.noteId || ""));
  });
}

function classifyActionExecution(action, locale) {
  const source = action && action.meta ? action.meta.source : "";
  const confidence =
    action && action.meta && typeof action.meta.confidence === "number"
      ? action.meta.confidence
      : 0;

  if (
    source === "legacy_cleanup" &&
    confidence >= 0.9
  ) {
    return buildExecution(
      "safe_auto",
      locale === "zh"
        ? "高置信度清理动作，可在确认后直接安全执行。"
        : "High-confidence cleanup action that is safe to apply after confirmation."
    );
  }

  if (
    source === "duplicate_title_disambiguation" &&
    confidence >= 0.88
  ) {
    return buildExecution(
      "safe_auto",
      locale === "zh"
        ? "同级重名消歧结果足够明确，可作为安全改名动作执行。"
        : "Sibling-title disambiguation is specific enough to execute as a safe rename."
    );
  }

  if (
    confidence >= 0.75 &&
    [
      "set_title",
      "set_color_index",
      "append_tags",
      "rewrite_excerpt",
      "append_comment",
      "remove_comments_by_text",
      "organize_branch_groups",
    ].includes(action.type)
  ) {
    return buildExecution(
      "review_required",
      locale === "zh"
        ? "需要用户在预览中确认后执行。"
        : "Requires user confirmation from preview before execution."
    );
  }

  return buildExecution(
    "suggest_only",
    locale === "zh"
      ? "当前只作为建议展示，不进入自动执行。"
      : "Preview only for now; do not execute automatically."
  );
}

function annotateActionExecution(action, locale) {
  return Object.assign({}, action, {
    execution: classifyActionExecution(action, locale),
  });
}

function summarizeExecutionDispositions(actions) {
  const counts = {
    safe_auto: 0,
    review_required: 0,
    suggest_only: 0,
  };

  (actions || []).forEach((action) => {
    const key =
      action && action.execution && action.execution.disposition
        ? action.execution.disposition
        : "review_required";
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}

function summarizeActionPhases(actions) {
  const counts = {
    cleanup: 0,
    normalize: 0,
    enrich: 0,
  };

  (actions || []).forEach((action) => {
    const key = action && action.phase ? action.phase : "enrich";
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}

function assignActionKeys(actions, stage) {
  return [...(actions || [])].map((action, index) =>
    Object.assign({}, action, {
      actionKey: `${compactText(stage) || "primary"}-action-${index + 1}`,
    })
  );
}

function upsertAction(actions, nextAction) {
  const index = actions.findIndex(
    (action) => action.noteId === nextAction.noteId && action.type === nextAction.type
  );
  if (index >= 0) {
    actions[index] = nextAction;
    return;
  }
  actions.push(nextAction);
}

function localizeTopicLabel(tag, locale) {
  const labels = TOPIC_LABELS[tag];
  if (!labels) return tag;
  return labels[locale] || labels.en || tag;
}

function truncate(text, limit) {
  const value = compactText(text);
  if (!value) return "";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1)}…`;
}

function stripTitlePrefixes(text) {
  return compactText(text).replace(/^[\s\-*•>]+\s*/, "");
}

function extractFirstSentence(text) {
  const value = compactText(text);
  if (!value) return "";

  const pieces = value.split(/(?<=[。！？.!?;；])\s+/).filter(Boolean);
  return pieces[0] || value;
}

function isLegacyOrganizerComment(text) {
  const value = compactText(text);
  if (!value) return false;
  if (/^agent review:\s*checked during .* pass\.?$/i.test(value)) return true;
  return (
    value.startsWith(COMMENT_PREFIX_ZH) ||
    value.startsWith(COMMENT_PREFIX_EN) ||
    value.includes("已补全或规范标题") ||
    value.includes("已补充摘要摘录")
  );
}

function stripOrganizerText(text) {
  return String(text || "")
    .replace(/Agent review:\s*checked during "[^"]+" pass\.?/gi, "")
    .replace(/整理建议：[^\n]*/g, "")
    .replace(/Organize note:[^\n]*/gi, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !isLegacyOrganizerComment(line))
    .join("\n")
    .trim();
}

function extractLegacyOrganizerComments(node) {
  const found = new Set();
  const addIfLegacy = (text) => {
    const value = compactText(text);
    if (isLegacyOrganizerComment(value)) {
      found.add(value);
    }
  };

  (node.commentsText || []).forEach(addIfLegacy);

  const rawAllText = String(node.allText || "");
  const allText = compactText(rawAllText);
  if (allText) {
    const lines = rawAllText
      .split(/\n+/)
      .map((line) => compactText(line))
      .filter(Boolean);
    lines.forEach(addIfLegacy);

    const agentReviewMatches =
      allText.match(/Agent review:\s*checked during "[^"]+" pass\.?/gi) || [];
    agentReviewMatches.forEach(addIfLegacy);

    const zhSuggestionMatches = rawAllText.match(/整理建议：[^\n]*/g) || [];
    zhSuggestionMatches.forEach(addIfLegacy);

    const enSuggestionMatches = rawAllText.match(/Organize note:[^\n]*/gi) || [];
    enSuggestionMatches.forEach(addIfLegacy);
  }

  return [...found];
}

function inferLocale(nodes, objective) {
  const sample = `${compactText(objective)} ${nodes
    .slice(0, 4)
    .map((node) =>
      [node.title, node.mainExcerptText, ...(node.commentsText || [])].join(" ")
    )
    .join(" ")}`;
  return /[\u3400-\u9fff]/.test(sample) ? "zh" : "en";
}

function isWeakTitle(title) {
  const value = compactText(title).toLowerCase();
  if (!value) return true;
  return /^(untitled|new note|card \d+|note \d+|未命名|新建卡片)$/.test(value);
}

function buildTitle(node, index) {
  const source = stripTitlePrefixes(node.title);
  if (source && !isWeakTitle(source)) {
    return source;
  }

  const fallbackSource = stripTitlePrefixes(node.mainExcerptText || node.allText || "");
  if (!fallbackSource) {
    return `Card ${index + 1}`;
  }

  const summary = extractFirstSentence(fallbackSource);
  return truncate(summary, LONG_TITLE_THRESHOLD);
}

function buildExcerptSummary(node) {
  const currentExcerpt = compactText(node.mainExcerptText);
  if (currentExcerpt && !isLegacyOrganizerComment(currentExcerpt)) return "";

  let source = compactText(stripOrganizerText(node.allText || ""));
  const title = compactText(node.title);
  if (title && source.toLowerCase().startsWith(title.toLowerCase())) {
    source = compactText(source.slice(title.length));
  }

  const summary = truncate(extractFirstSentence(source), SUMMARY_LENGTH);
  if (!summary || summary.length < 12) return "";
  return summary;
}

function buildCleanExcerpt(node) {
  let source = compactText(stripOrganizerText(node.allText || ""));
  const title = compactText(node.title);
  if (title && source.toLowerCase().startsWith(title.toLowerCase())) {
    source = compactText(source.slice(title.length));
  }

  const summary = truncate(extractFirstSentence(source), SUMMARY_LENGTH);
  return summary || "";
}

function branchDigestChildPreview(node, nodeMap) {
  const childIds = Array.isArray(node.childNoteIds) ? node.childNoteIds : [];
  return dedupe(
    childIds
      .map((noteId) => nodeMap.get(noteId))
      .filter(Boolean)
      .map((child) => previewLabelForNode(child))
      .filter(Boolean)
  ).slice(0, 3);
}

function branchDigestOverviewGroups(node, nodeMap) {
  const childIds = Array.isArray(node.childNoteIds) ? node.childNoteIds : [];
  return childIds
    .map((noteId) => nodeMap.get(noteId))
    .filter(Boolean)
    .map((child) => {
      const descendantIds = Array.isArray(child.childNoteIds) ? child.childNoteIds : [];
      return {
        label: previewLabelForNode(child),
        count: descendantIds.length,
        representativeChildren: dedupe(
          descendantIds
            .map((descendantId) => nodeMap.get(descendantId))
            .filter(Boolean)
            .map((descendant) => previewLabelForNode(descendant))
            .filter(Boolean)
        ).slice(0, 2),
      };
    })
    .filter((group) => group.label && group.count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.label.localeCompare(right.label);
    });
}

function buildGroupedBranchDigest(node, nodeMap, locale, title) {
  const groups = branchDigestOverviewGroups(node, nodeMap);
  if (groups.length < 2) return null;

  const displayTitle = isGenericBranchOverviewTitle(title) ? "" : title;
  const selectedGroups = groups.slice(0, 3);
  const groupSummary = selectedGroups
    .map((group) => `${group.label} (${group.count})`)
    .join(locale === "zh" ? "、" : ", ");
  const representativeChildren = [];
  const seenRepresentativeChildren = new Set();
  for (let index = 0; representativeChildren.length < 3; index += 1) {
    let added = false;
    selectedGroups.forEach((group) => {
      const candidate = (group.representativeChildren || [])[index];
      if (!candidate || seenRepresentativeChildren.has(candidate) || representativeChildren.length >= 3) {
        return;
      }
      seenRepresentativeChildren.add(candidate);
      representativeChildren.push(candidate);
      added = true;
    });
    if (!added) break;
  }
  const representativeText = representativeChildren.join(locale === "zh" ? "、" : ", ");

  const text = displayTitle
    ? locale === "zh"
      ? representativeText
        ? `“${displayTitle}”当前主要包含 ${groupSummary} 等主题；代表内容包括：${representativeText}。`
        : `“${displayTitle}”当前主要包含 ${groupSummary} 等主题。`
      : representativeText
        ? `"${displayTitle}" currently covers ${groupSummary}, including ${representativeText}.`
        : `"${displayTitle}" currently covers ${groupSummary}.`
    : locale === "zh"
      ? representativeText
        ? `该分支当前主要包含 ${groupSummary} 等主题；代表内容包括：${representativeText}。`
        : `该分支当前主要包含 ${groupSummary} 等主题。`
      : representativeText
        ? `This branch currently covers ${groupSummary}, including ${representativeText}.`
        : `This branch currently covers ${groupSummary}.`;

  return {
    text: truncate(text, BRANCH_DIGEST_LENGTH),
    evidence: [
      locale === "zh"
        ? `检测到 ${selectedGroups.length} 个分组主题`
        : `Detected ${selectedGroups.length} grouped themes`,
      locale === "zh"
        ? `主要主题：${groupSummary}`
        : `Grouped themes: ${groupSummary}`,
      representativeText
        ? locale === "zh"
          ? `代表性子卡：${representativeText}`
          : `Representative descendants: ${representativeText}`
        : locale === "zh"
          ? "未提取到代表性子卡标题"
          : "No representative child titles extracted",
    ],
  };
}

function isGenericBranchOverviewTitle(text) {
  const value = compactText(text);
  if (!value) return false;
  if (isBranchDigestText(value)) return true;
  return /^(?:该分支当前收纳|该分支当前主要包含|该分支当前包含|分支概览|分支摘要|汇总节点|branch overview|summary node|this branch currently groups|this branch currently covers)$/i.test(
    value
  );
}

function buildBranchDigestExcerpt(node, nodeMap, locale) {
  const childCount = Array.isArray(node.childNoteIds) ? node.childNoteIds.length : 0;
  if (childCount < 2) return null;

  const excerpt = compactText(node.mainExcerptText);
  if (excerpt) return null;

  const title = compactText(node.title);
  const body = compactText(stripOrganizerText(node.allText || ""));
  const titleOnly =
    !body ||
    body.toLowerCase() === title.toLowerCase() ||
    body.toLowerCase() === `${title.toLowerCase()}.`;
  if (!titleOnly) return null;

  const groupedDigest = buildGroupedBranchDigest(node, nodeMap, locale, title);
  if (groupedDigest) {
    return groupedDigest;
  }

  const childPreview = branchDigestChildPreview(node, nodeMap);
  const childPreviewText = childPreview.join(locale === "zh" ? "、" : ", ");

  if (!title) {
    const message = locale === "zh"
      ? childPreviewText
        ? `该分支当前收纳 ${childCount} 张直属子卡片，例如：${childPreviewText}，适合作为汇总节点继续细化。`
        : `该分支当前收纳 ${childCount} 张直属子卡片，适合作为汇总节点继续细化。`
      : childPreviewText
        ? `This branch currently groups ${childCount} direct child notes, including ${childPreviewText}, and works as a summary node for further refinement.`
        : `This branch currently groups ${childCount} direct child notes and works as a summary node for further refinement.`;
    return {
      text: truncate(message, BRANCH_DIGEST_LENGTH),
      evidence: [
        locale === "zh"
          ? `直属子卡片数：${childCount}`
          : `Direct child count: ${childCount}`,
        childPreviewText
          ? locale === "zh"
            ? `代表子卡：${childPreviewText}`
            : `Representative children: ${childPreviewText}`
          : locale === "zh"
            ? "未提取到代表性子卡标题"
            : "No representative child titles extracted",
      ],
    };
  }

  const message = locale === "zh"
    ? childPreviewText
      ? `该分支当前收纳 ${childCount} 张直属子卡片，主要内容包括：${childPreviewText}。`
      : `该分支当前收纳 ${childCount} 张直属子卡片，适合作为继续细化的汇总节点。`
    : childPreviewText
      ? `This branch currently groups ${childCount} direct child notes, with key items like ${childPreviewText}.`
      : `This branch currently groups ${childCount} direct child notes and works as a summary node for further refinement.`;
  return {
    text: truncate(message, BRANCH_DIGEST_LENGTH),
    evidence: [
      locale === "zh"
        ? `直属子卡片数：${childCount}`
        : `Direct child count: ${childCount}`,
      childPreviewText
        ? locale === "zh"
          ? `代表子卡：${childPreviewText}`
          : `Representative children: ${childPreviewText}`
        : locale === "zh"
          ? "未提取到代表性子卡标题"
          : "No representative child titles extracted",
    ],
  };
}

function isBranchDigestText(text) {
  const value = compactText(text);
  if (!value) return false;
  if (/^该分支当前收纳\s*\d+\s*张直属子卡片/.test(value)) return true;
  if (/^(?:该分支当前主要包含|“.+”当前主要包含)/.test(value)) return true;
  if (/^This branch currently groups\s*\d+\s*direct child notes/i.test(value)) return true;
  if (/^(?:This branch currently covers|".+" currently covers)/i.test(value)) return true;
  return false;
}

function shouldSuppressSemanticTags(node, stage) {
  if (stage !== "followup") return false;
  if (isBranchDigestText(node.mainExcerptText)) return true;

  const allText = compactText(node.allText);
  if (!allText) return false;

  const lines = String(node.allText || "")
    .split(/\n+/)
    .map(compactText)
    .filter(Boolean);
  return lines.some((line) => isBranchDigestText(line));
}

function buildSemanticTagDeferredNote(actions, locale) {
  const noteCount = new Set(
    (actions || []).map((action) => compactText(action && action.noteId)).filter(Boolean)
  ).size;
  return {
    type: "semantic_tag_deferred",
    noteId: actions && actions[0] ? actions[0].noteId : null,
    deferredActionCount: (actions || []).length,
    message:
      locale === "zh"
        ? `已暂缓 ${actions.length} 条语义标签补充（覆盖 ${noteCount} 张卡片），因为“整理当前选中分支”当前优先输出可见的结构或摘要改动。若这一步没有可见动作，通常表示该分支已经基本整理完成。`
        : `Deferred ${actions.length} semantic tag enrichments across ${noteCount} notes because "Organize current selected branch" now prioritizes visible structure or summary changes. If this pass has no visible actions, the branch is likely already organized enough.`,
  };
}

function buildDeferredColorNote(actions, locale) {
  const noteCount = new Set(
    (actions || []).map((action) => compactText(action && action.noteId)).filter(Boolean)
  ).size;
  return {
    type: "visual_color_deferred",
    noteId: actions && actions[0] ? actions[0].noteId : null,
    deferredActionCount: (actions || []).length,
    message:
      locale === "zh"
        ? `已暂缓 ${actions.length} 条次优先颜色调整（覆盖 ${noteCount} 张卡片），以保持第一轮整理更克制、可读，并优先保留分支结构色与最明显的角色色。`
        : `Deferred ${actions.length} lower-priority color changes across ${noteCount} notes so the first pass stays conservative and keeps the most legible structural and role-based colors first.`,
  };
}

function inferTags(node) {
  const text = compactText(
    [node.title, node.mainExcerptText, node.allText, ...(node.commentsText || [])].join(" ")
  ).toLowerCase();

  const tagPatterns = [
    ["definition", /(definition|定义)/],
    ["theorem", /(theorem|lemma|corollary|定理|引理|推论)/],
    ["example", /(example|例题|例如|例)/],
    ["proof", /(proof|证明)/],
    ["formula", /(formula|equation|公式)/],
    ["question", /(question|exercise|problem|习题|问题)/],
    ["summary", /(summary|overview|总结|概述)/],
    ["comparison", /(compare|comparison|vs\.?|对比|比较)/],
  ];

  return tagPatterns.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
}

function previewLabelForNode(node) {
  const title = compactText(node.title);
  if (title) return truncate(title, 24);

  const fallback = truncate(extractFirstSentence(node.mainExcerptText || node.allText || ""), 24);
  if (fallback) return fallback;

  return `#${String(node.noteId || "").slice(-6)}`;
}

function extractTopicKeyword(text) {
  const value = compactText(text);
  if (!value) return "";

  const zhMatch = value.match(/[\u3400-\u9fff]{2,8}/);
  if (zhMatch) return zhMatch[0];

  const words = value.toLowerCase().match(/[a-z0-9]+/g) || [];
  for (const word of words) {
    if (word.length >= 4 && !EN_STOPWORDS.has(word)) {
      return word;
    }
  }

  return words[0] || "";
}

function inferPrimaryTopic(node, locale) {
  const tags = inferTags(node);
  if (tags.length) {
    return {
      key: `tag:${tags[0]}`,
      label: localizeTopicLabel(tags[0], locale),
    };
  }

  const titleKeyword = extractTopicKeyword(node.title);
  if (titleKeyword) {
    return {
      key: `keyword:${titleKeyword.toLowerCase()}`,
      label: titleKeyword,
    };
  }

  const excerptText = isBranchDigestText(node.mainExcerptText)
    ? ""
    : node.mainExcerptText;
  const cleanedAllTextLines = String(stripOrganizerText(node.allText || ""))
    .split(/\n+/)
    .map(compactText)
    .filter((line) => line && !isBranchDigestText(line));
  const keyword = extractTopicKeyword(
    [excerptText, cleanedAllTextLines.join(" ")]
      .filter(Boolean)
      .join(" ")
  );
  if (keyword) {
    return {
      key: `keyword:${keyword.toLowerCase()}`,
      label: keyword,
    };
  }

  return {
    key: locale === "zh" ? "other:其他" : "other:other",
    label: locale === "zh" ? "其他" : "other",
  };
}

function siblingDuplicateGroups(nodes) {
  const byParent = new Map();
  const groups = [];

  for (const node of nodes) {
    const key = node.parentNoteId || "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(node);
  }

  for (const [parentNoteId, siblings] of byParent.entries()) {
    const byTitle = new Map();
    for (const node of siblings) {
      const key = normalizeTitleKey(node.title);
      if (!key) continue;
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key).push(node);
    }

    for (const group of byTitle.values()) {
      if (group.length < 2) continue;
      groups.push({
        parentNoteId: parentNoteId === "__root__" ? null : parentNoteId,
        title: compactText(group[0].title),
        nodes: group,
      });
    }
  }

  return groups;
}

function summarizeNodeShape(nodes) {
  const items = Array.isArray(nodes) ? nodes : [];
  const visible = items.filter((node) => node && node.visibleInMindMap && node.visualFrame);
  const xValues = [];
  const yValues = [];

  visible.forEach((node) => {
    const frame = node.visualFrame || {};
    if (typeof frame.x === "number") xValues.push(frame.x);
    if (typeof frame.y === "number") yValues.push(frame.y);
    if (typeof frame.x === "number" && typeof frame.width === "number") {
      xValues.push(frame.x + frame.width);
    }
    if (typeof frame.y === "number" && typeof frame.height === "number") {
      yValues.push(frame.y + frame.height);
    }
  });

  return {
    visibleNodeCount: visible.length,
    collapsedBranchCount: items.filter((node) => node && node.branchClosed).length,
    hiddenNodeCount: items.filter((node) => node && node.hidden).length,
    maxVisibleDepth: visible.reduce((max, node) => {
      const depth = typeof node.visualDepth === "number" ? node.visualDepth : -1;
      return depth > max ? depth : max;
    }, -1),
    horizontalSpan:
      xValues.length >= 2 ? Math.round((Math.max(...xValues) - Math.min(...xValues)) * 100) / 100 : null,
    verticalSpan:
      yValues.length >= 2 ? Math.round((Math.max(...yValues) - Math.min(...yValues)) * 100) / 100 : null,
  };
}

function isShapeOverloaded(shape) {
  if (!shape) return false;
  if ((shape.collapsedBranchCount || 0) >= SHAPE_COLLAPSED_THRESHOLD) return true;
  if ((shape.maxVisibleDepth || 0) >= SHAPE_DEPTH_THRESHOLD) return true;
  if ((shape.horizontalSpan || 0) >= SHAPE_HORIZONTAL_SPAN_THRESHOLD) return true;
  if ((shape.verticalSpan || 0) >= SHAPE_VERTICAL_SPAN_THRESHOLD) return true;
  return false;
}

function branchShapeEvidenceLines(shape, locale) {
  if (!shape) return [];
  const lines = [];
  if (shape.horizontalSpan !== null && shape.horizontalSpan >= SHAPE_HORIZONTAL_SPAN_THRESHOLD) {
    lines.push(
      locale === "zh"
        ? `横向跨度约 ${shape.horizontalSpan}`
        : `Horizontal span is about ${shape.horizontalSpan}`
    );
  }
  if (shape.verticalSpan !== null && shape.verticalSpan >= SHAPE_VERTICAL_SPAN_THRESHOLD) {
    lines.push(
      locale === "zh"
        ? `纵向跨度约 ${shape.verticalSpan}`
        : `Vertical span is about ${shape.verticalSpan}`
    );
  }
  if ((shape.maxVisibleDepth || 0) >= SHAPE_DEPTH_THRESHOLD) {
    lines.push(
      locale === "zh"
        ? `可见层级达到 ${shape.maxVisibleDepth}`
        : `Visible depth reaches ${shape.maxVisibleDepth}`
    );
  }
  if ((shape.collapsedBranchCount || 0) >= SHAPE_COLLAPSED_THRESHOLD) {
    lines.push(
      locale === "zh"
        ? `折叠分支数 ${shape.collapsedBranchCount}`
        : `Collapsed branch count is ${shape.collapsedBranchCount}`
    );
  }
  return lines;
}

function buildNodeShapeMetrics(node, nodeMap) {
  const children = (node.childNoteIds || []).map((noteId) => nodeMap.get(noteId)).filter(Boolean);
  const childShape = summarizeNodeShape(children);
  return Object.assign(
    {
      childCount: children.length,
    },
    childShape
  );
}

function buildSelectionShapeNote(shapeSummary, locale) {
  if (!shapeSummary || !shapeSummary.captured) return null;
  const evidence = branchShapeEvidenceLines(shapeSummary, locale);
  if (!evidence.length) return null;

  return {
    type: "branch_shape_warning",
    noteId: null,
    message:
      locale === "zh"
        ? `AI 已读取当前脑图形态：${evidence.join("；")}。后续整理会把这些可见布局信号也纳入判断。`
        : `The AI also read the current mind-map shape: ${evidence.join("; ")}. Later organization decisions will use those visible layout signals too.`,
  };
}

function buildNativeBreakdownContextNote(origin, nodes, locale) {
  if (compactText(origin) !== "native_ai_breakdown") return null;
  const root = Array.isArray(nodes) && nodes.length ? nodes[0] : null;
  const rootChildCount = Array.isArray(root && root.childNoteIds) ? root.childNoteIds.length : 0;
  const summaryCandidateCount = (Array.isArray(nodes) ? nodes : []).filter((node) => {
    const childIds = Array.isArray(node && node.childNoteIds) ? node.childNoteIds : [];
    const excerpt = compactText(node && node.mainExcerptText);
    return childIds.length >= 2 && !excerpt;
  }).length;

  return {
    type: "native_ai_breakdown_context",
    noteId: root && root.noteId ? root.noteId : null,
    message:
      locale === "zh"
        ? `当前分支被视为 MarginNote 原生 AI Breakdown 的结果，本轮优先做可见分组、分支概览和样式整理，而不尝试接管原生私有流程。当前根分支有 ${rootChildCount} 个直属子分支，${summaryCandidateCount} 个节点适合后续补概览。`
        : `This branch is being treated as output from MarginNote's native AI Breakdown flow. This pass prioritizes visible regrouping, branch overviews, and styling cleanup without trying to drive the native private pipeline. The root currently has ${rootChildCount} direct child branches, and ${summaryCandidateCount} nodes look suitable for overview fills.`
  };
}

function nodeHasShapeSignals(node) {
  if (!node || typeof node !== "object") return false;
  return !!(
    node.visualFrame ||
    typeof node.visualDepth === "number" ||
    node.visibleInMindMap ||
    node.hidden ||
    node.branchClosed ||
    typeof node.zLevel === "number" ||
    compactText(node.groupMode)
  );
}

function buildColorShapeContext(node, nodeMap, locale) {
  const evidence = [];
  let salience = 0;

  if (nodeHasShapeSignals(node)) {
    if (node.hidden) {
      salience -= 3;
      evidence.push(
        locale === "zh" ? "当前节点位于隐藏区域" : "This note is currently hidden in the mind map"
      );
    } else if (node.visibleInMindMap) {
      salience += 3;
      evidence.push(
        locale === "zh" ? "当前节点在脑图中可见" : "This note is currently visible in the mind map"
      );
    } else {
      salience -= 1;
      evidence.push(
        locale === "zh"
          ? "当前节点不在可见脑图区域"
          : "This note is currently outside the visible mind-map area"
      );
    }
  }

  if (typeof node.visualDepth === "number") {
    evidence.push(
      locale === "zh"
        ? `当前可见层级 ${node.visualDepth}`
        : `Current visible depth ${node.visualDepth}`
    );
    if (node.visualDepth <= 2) {
      salience += 2;
    } else if (node.visualDepth >= SHAPE_DEPTH_THRESHOLD) {
      salience -= 1;
    }
  }

  const parent =
    node && node.parentNoteId && nodeMap instanceof Map ? nodeMap.get(node.parentNoteId) : null;
  if (parent) {
    const parentShape = buildNodeShapeMetrics(parent, nodeMap);
    if (isShapeOverloaded(parentShape)) {
      salience += 2;
      evidence.push(
        locale === "zh"
          ? "位于当前视觉过载分支下"
          : "Sits under a branch that is visually overloaded right now"
      );
    }
  }

  return {
    salience,
    evidence,
  };
}

function preferredVisualRole(node) {
  if ((node.childNoteIds || []).length >= 2 || node.branchClosed) {
    return "summary_branch";
  }

  const tags = inferTags(node);
  if (tags.includes("question")) return "question";
  if (tags.includes("theorem")) return "theorem";
  if (tags.includes("proof")) return "proof";
  if (tags.includes("definition")) return "definition";
  if (tags.includes("formula")) return "formula";
  if (tags.includes("example")) return "example";
  if (tags.includes("comparison")) return "comparison";
  return "";
}

function buildColorAction(node, nodeMap, locale) {
  const role = preferredVisualRole(node);
  if (!role) return null;

  const nextColorIndex = VISUAL_ROLE_COLOR_INDEX[role];
  if (typeof nextColorIndex !== "number") return null;
  const currentColor = typeof node.colorIndex === "number" ? node.colorIndex : null;
  if (currentColor === nextColorIndex) {
    return null;
  }
  const shapeContext = buildColorShapeContext(node, nodeMap, locale);
  const hasExistingColor = currentColor !== null && currentColor > 0;
  if (role !== "summary_branch" && !node.visibleInMindMap) {
    return null;
  }
  if (role !== "summary_branch" && !hasExistingColor && shapeContext.salience < 3) {
    return null;
  }
  if (hasExistingColor && role !== "summary_branch") {
    const shouldRecolor = !!node.visibleInMindMap && shapeContext.salience >= 2;
    if (!shouldRecolor) {
      return null;
    }
  }
  const localizedRole = localizeTopicLabel(
    role === "summary_branch" ? "summary" : role,
    locale
  );
  const evidence = [
    role === "summary_branch"
      ? locale === "zh"
        ? `当前节点有 ${(node.childNoteIds || []).length} 个直属子卡`
        : `This node currently has ${(node.childNoteIds || []).length} direct children`
      : locale === "zh"
        ? `内容角色识别为 ${localizedRole}`
        : `Detected content role: ${localizedRole}`,
    locale === "zh"
      ? `建议颜色索引 ${nextColorIndex}`
      : `Suggested color index ${nextColorIndex}`,
    ...shapeContext.evidence,
  ];
  if (currentColor !== null && currentColor !== nextColorIndex) {
    evidence.push(
      locale === "zh"
        ? `当前颜色索引 ${currentColor} 与建议颜色不同`
        : `Current color index ${currentColor} differs from the suggested role color`
    );
  }

  return {
    type: "set_color_index",
    noteId: node.noteId,
    visualRole: role,
    visualSalience: shapeContext.salience,
    currentColorIndex: currentColor,
    colorIndex: nextColorIndex,
    reason:
      locale === "zh"
        ? role === "summary_branch"
          ? "为汇总/分支节点补一个更易识别的颜色，方便在脑图中快速区分结构角色。"
          : "根据卡片内容角色补一个更清晰的颜色编码，方便脑图中快速扫读。"
        : role === "summary_branch"
          ? "Use a clearer color for summary or branch nodes so their structural role stands out in the mind map."
          : "Add a clearer color code for this note's role so the mind map is easier to scan.",
    meta: buildMeta("visual_role_coloring", role === "summary_branch" ? 0.8 : 0.76, evidence),
  };
}

function visualRolePriority(action) {
  const role = compactText(action && action.visualRole);
  if (Object.prototype.hasOwnProperty.call(VISUAL_ROLE_PRIORITY, role)) {
    return VISUAL_ROLE_PRIORITY[role];
  }
  return 99;
}

function visualColorCorrectionPriority(action) {
  return typeof action?.currentColorIndex === "number" && action.currentColorIndex > 0 ? 0 : 1;
}

function pruneExcessColorActions(actions, notes, stage, locale) {
  if (stage !== "primary") {
    return Array.isArray(actions) ? [...actions] : [];
  }

  const nextActions = Array.isArray(actions) ? [...actions] : [];
  const nonSummaryColorActions = nextActions.filter(
    (action) => action.type === "set_color_index" && action.visualRole !== "summary_branch"
  );
  if (nonSummaryColorActions.length <= MAX_PRIMARY_NON_SUMMARY_COLOR_ACTIONS) {
    return nextActions;
  }

  const keepKeys = new Set(
    [...nonSummaryColorActions]
      .sort((left, right) => {
        const correctionDelta =
          visualColorCorrectionPriority(left) - visualColorCorrectionPriority(right);
        if (correctionDelta !== 0) return correctionDelta;
        const salienceDelta = (right.visualSalience || 0) - (left.visualSalience || 0);
        if (salienceDelta !== 0) return salienceDelta;
        const priorityDelta = visualRolePriority(left) - visualRolePriority(right);
        if (priorityDelta !== 0) return priorityDelta;
        const confidenceDelta =
          (right?.meta?.confidence || 0) - (left?.meta?.confidence || 0);
        if (confidenceDelta !== 0) return confidenceDelta;
        return String(left.noteId || "").localeCompare(String(right.noteId || ""));
      })
      .slice(0, MAX_PRIMARY_NON_SUMMARY_COLOR_ACTIONS)
      .map((action) => `${action.noteId}::${action.colorIndex}`)
  );

  const deferredActions = nonSummaryColorActions.filter(
    (action) => !keepKeys.has(`${action.noteId}::${action.colorIndex}`)
  );
  if (deferredActions.length) {
    notes.push(buildDeferredColorNote(deferredActions, locale));
  }

  return nextActions.filter((action) => {
    if (action.type !== "set_color_index") return true;
    if (action.visualRole === "summary_branch") return true;
    return keepKeys.has(`${action.noteId}::${action.colorIndex}`);
  });
}

function buildSplitBranchSuggestion(node, nodeMap, locale) {
  const children = (node.childNoteIds || []).map((noteId) => nodeMap.get(noteId)).filter(Boolean);
  const shapeMetrics = buildNodeShapeMetrics(node, nodeMap);
  const triggeredByCount = children.length >= STRUCTURE_CHILD_THRESHOLD;
  const triggeredByShape =
    children.length >= SHAPE_CHILD_TRIGGER_COUNT && isShapeOverloaded(shapeMetrics);
  if (!triggeredByCount && !triggeredByShape) {
    return null;
  }

  const groups = new Map();
  children.forEach((child) => {
    const topic = inferPrimaryTopic(child, locale);
    if (!groups.has(topic.key)) {
      groups.set(topic.key, {
        label: topic.label,
        count: 0,
        noteIds: [],
        sampleTitles: [],
      });
    }

    const group = groups.get(topic.key);
    group.count += 1;
    group.noteIds.push(child.noteId);
    if (group.sampleTitles.length < 3) {
      group.sampleTitles.push(previewLabelForNode(child));
    }
  });

  const ranked = [...groups.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.label.localeCompare(right.label);
  });

  if (!ranked.some((group) => group.count >= 2)) {
    return null;
  }

  const meaningfulGroups = ranked.filter((group) => group.count >= 2);
  const selectedGroups = (meaningfulGroups.length >= 2 ? meaningfulGroups : ranked.slice(0, 3)).slice(0, 3);
  if (selectedGroups.length < 2) {
    return null;
  }

  const groupSummary = selectedGroups
    .map((group) => `${group.label} (${group.count})`)
    .join(locale === "zh" ? " / " : " / ");
  const evidence = [];
  if (triggeredByCount) {
    evidence.push(
      locale === "zh"
        ? `子卡片数 ${children.length} 超过阈值 ${STRUCTURE_CHILD_THRESHOLD}`
        : `Child count ${children.length} exceeds threshold ${STRUCTURE_CHILD_THRESHOLD}`
    );
  }
  branchShapeEvidenceLines(shapeMetrics, locale).forEach((line) => evidence.push(line));
  evidence.push(
    locale === "zh"
      ? `检测到 ${selectedGroups.length} 个可聚类主题`
      : `Detected ${selectedGroups.length} meaningful topic groups`
  );

  return {
    type: "suggest_split_branch",
    noteId: node.noteId,
    noteIds: children.map((child) => child.noteId),
    reason:
      locale === "zh"
        ? "属于结构级调整，当前版本只给建议，不自动改树结构。"
        : "This is a structure-level suggestion, so the current version only previews it.",
    summary:
      locale === "zh"
        ? `该分支下有 ${children.length} 个子卡片，建议优先按 ${groupSummary} 拆成更清晰的子主题。`
        : `This branch has ${children.length} children. Consider splitting it into clearer subtopics such as ${groupSummary}.`,
    groups: selectedGroups.map((group) => ({
      label: group.label,
      count: group.count,
      noteIds: group.noteIds,
      sampleTitles: group.sampleTitles,
    })),
    targetChildCount: TARGET_CHILD_COUNT,
    meta: buildMeta("branch_split_analysis", 0.72, [
      ...evidence,
    ]),
  };
}

function buildNodeShapeWarning(node, nodeMap, locale) {
  const children = (node.childNoteIds || []).map((noteId) => nodeMap.get(noteId)).filter(Boolean);
  if (children.length < SHAPE_CHILD_TRIGGER_COUNT) return null;
  const shapeMetrics = buildNodeShapeMetrics(node, nodeMap);
  if (!isShapeOverloaded(shapeMetrics)) return null;

  const evidence = branchShapeEvidenceLines(shapeMetrics, locale);
  if (!evidence.length) return null;
  const title = compactText(node.title) || `#${String(node.noteId || "").slice(-6)}`;

  return {
    type: "branch_shape_warning",
    noteId: node.noteId,
    message:
      locale === "zh"
        ? `分支“${title}”在当前脑图中已经呈现发散形态（${evidence.join("；")}），即使直属子卡数量不算很多，也建议补分组或汇总节点。`
        : `Branch "${title}" already looks visually spread in the current mind map (${evidence.join("; ")}). Even if the direct-child count is not huge yet, consider adding grouping or summary nodes.`,
  };
}

function buildSplitBranchAction(suggestion, locale) {
  const groups = Array.isArray(suggestion.groups) ? suggestion.groups : [];
  const groupSummary = groups
    .slice(0, 3)
    .map((group) => `${group.label} (${group.count})`)
    .join(locale === "zh" ? " / " : " / ");
  if (groups.length < 2) {
    return null;
  }

  return {
    type: "organize_branch_groups",
    noteId: suggestion.noteId,
    groups: groups.map((group) => ({
      label: group.label,
      count: group.count,
      noteIds: group.noteIds,
      sampleTitles: group.sampleTitles,
    })),
    targetChildCount: suggestion.targetChildCount,
    reason:
      locale === "zh"
        ? "为过载分支创建分组子卡，并把直属子卡移动到对应分组下。"
        : "Create grouping child notes for an overloaded branch and move direct children into them.",
    meta: buildMeta("branch_group_organization", 0.82, [
      locale === "zh"
        ? `建议分组：${groupSummary || "子主题拆分"}`
        : `Suggested groups: ${groupSummary || "subtopic split"}`,
      locale === "zh"
        ? `目标是把直属子卡收敛到约 ${suggestion.targetChildCount || TARGET_CHILD_COUNT} 个以内`
        : `Aim to reduce direct children to about ${suggestion.targetChildCount || TARGET_CHILD_COUNT}`,
    ]),
  };
}

function buildRenameDescriptor(node, locale, usedDescriptors, index) {
  const candidates = [];
  const tags = inferTags(node);
  if (tags.length) {
    candidates.push(localizeTopicLabel(tags[0], locale));
  }

  const cleaned = buildCleanExcerpt(node);
  if (cleaned) {
    candidates.push(truncate(cleaned, 18));
  }

  const keyword = extractTopicKeyword([node.title, node.mainExcerptText, node.allText].join(" "));
  if (keyword) {
    candidates.push(keyword);
  }

  let descriptor = candidates.find((candidate) => candidate && !usedDescriptors[candidate]);
  let usedFallback = false;
  if (!descriptor) {
    descriptor = locale === "zh" ? `区分 ${index + 1}` : `Variant ${index + 1}`;
    usedFallback = true;
  }
  usedDescriptors[descriptor] = true;
  return {
    descriptor,
    usedFallback,
  };
}

function buildDisambiguationSuggestion(group, locale) {
  const baseTitle = compactText(group.title) || (locale === "zh" ? "未命名卡片" : "Untitled note");
  const separator = /[\u3400-\u9fff]/.test(baseTitle) ? "｜" : " - ";
  const usedDescriptors = {};
  const proposals = group.nodes.map((node, index) => {
    const { descriptor, usedFallback } = buildRenameDescriptor(
      node,
      locale,
      usedDescriptors,
      index
    );
    return {
      noteId: node.noteId,
      currentTitle: compactText(node.title),
      suggestedTitle: truncate(`${baseTitle}${separator}${descriptor}`, LONG_TITLE_THRESHOLD),
      basis: descriptor,
      usedFallback,
    };
  });

  const previewTitles = proposals
    .slice(0, 3)
    .map((proposal) => proposal.suggestedTitle)
    .join(locale === "zh" ? " / " : " / ");

  return {
    type: "suggest_disambiguate_sibling_titles",
    noteId: group.parentNoteId || group.nodes[0].noteId,
    noteIds: group.nodes.map((node) => node.noteId),
    reason:
      locale === "zh"
        ? "需要结合上下文判断命名差异，先作为建议展示。"
        : "This needs contextual judgment, so it is shown as a suggestion first.",
    summary:
      locale === "zh"
        ? `发现 ${group.nodes.length} 张同级重名卡片，建议区分命名，例如：${previewTitles}`
        : `Found ${group.nodes.length} sibling notes with the same title. Consider disambiguating them, for example: ${previewTitles}`,
    proposals,
    meta: buildMeta("duplicate_title_disambiguation", 0.88, [
      locale === "zh"
        ? `同级重名卡片数 ${group.nodes.length}`
        : `Sibling duplicate count ${group.nodes.length}`,
      locale === "zh"
        ? "每张卡片都提取到了可区分的标题后缀"
        : "Each note produced a disambiguating title suffix",
    ]),
  };
}

function canAutoApplyDisambiguation(suggestion) {
  const proposals = Array.isArray(suggestion.proposals) ? suggestion.proposals : [];
  if (proposals.length < 2) return false;
  if (proposals.some((proposal) => proposal.usedFallback)) return false;

  const uniqueTitles = new Set();
  for (const proposal of proposals) {
    const suggestedTitle = compactText(proposal.suggestedTitle);
    const currentTitle = compactText(proposal.currentTitle);
    if (!suggestedTitle || suggestedTitle === currentTitle) {
      return false;
    }
    const key = normalizeTitleKey(suggestedTitle);
    if (!key || uniqueTitles.has(key)) {
      return false;
    }
    uniqueTitles.add(key);
  }

  return true;
}

function buildDisambiguationActions(suggestion, locale) {
  if (!canAutoApplyDisambiguation(suggestion)) {
    return [];
  }

  return suggestion.proposals.map((proposal) => ({
    type: "set_title",
    noteId: proposal.noteId,
    title: proposal.suggestedTitle,
    reason:
      locale === "zh"
        ? `同级存在重名卡片，使用更具体的标题后缀“${proposal.basis}”减少混淆。`
        : `Disambiguate duplicate sibling titles with the more specific suffix "${proposal.basis}".`,
    meta: buildMeta("duplicate_title_disambiguation", 0.9, [
      locale === "zh"
        ? `原标题：${proposal.currentTitle || "（空）"}`
        : `Original title: ${proposal.currentTitle || "(empty)"}`,
      locale === "zh"
        ? `建议后缀：${proposal.basis}`
        : `Suggested suffix: ${proposal.basis}`,
    ]),
  }));
}

function normalizeTitleKey(title) {
  return compactText(title)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function sanitizeNode(node) {
  return {
    noteId: node.noteId,
    title: compactText(node.title),
    tags: dedupe(Array.isArray(node.tags) ? node.tags.map(compactText) : []),
    mainExcerptText: compactText(node.mainExcerptText),
    allText: String(node.allText || ""),
    colorIndex:
      typeof node.colorIndex === "number" ? node.colorIndex : null,
    fillIndex:
      typeof node.fillIndex === "number" ? node.fillIndex : null,
    commentsText: Array.isArray(node.commentsText)
      ? node.commentsText.map(compactText).filter(Boolean)
      : [],
    childNoteIds: Array.isArray(node.childNoteIds) ? node.childNoteIds : [],
    parentNoteId: node.parentNoteId || null,
    visualFrame: sanitizeFrame(node.visualFrame),
    visualDepth:
      typeof node.visualDepth === "number" ? node.visualDepth : null,
    visibleInMindMap: !!node.visibleInMindMap,
    branchClosed: !!node.branchClosed,
    zLevel: typeof node.zLevel === "number" ? node.zLevel : null,
    hidden: !!node.hidden,
    groupMode: compactText(node.groupMode),
  };
}

function sanitizeFrame(frame) {
  if (!frame || typeof frame !== "object") return null;
  const x = Number(frame.x);
  const y = Number(frame.y);
  const width = Number(frame.width);
  const height = Number(frame.height);
  if (
    !Number.isFinite(x) &&
    !Number.isFinite(y) &&
    !Number.isFinite(width) &&
    !Number.isFinite(height)
  ) {
    return null;
  }
  return {
    x: Number.isFinite(x) ? x : null,
    y: Number.isFinite(y) ? y : null,
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
  };
}

function sanitizeShapeSummary(summary) {
  if (!summary || typeof summary !== "object") return null;
  const numberOrNull = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  return {
    captured: !!summary.captured,
    branchNodeCount: numberOrNull(summary.branchNodeCount),
    visibleNodeCount: numberOrNull(summary.visibleNodeCount),
    collapsedBranchCount: numberOrNull(summary.collapsedBranchCount),
    hiddenNodeCount: numberOrNull(summary.hiddenNodeCount),
    maxVisibleDepth: numberOrNull(summary.maxVisibleDepth),
    horizontalSpan: numberOrNull(summary.horizontalSpan),
    verticalSpan: numberOrNull(summary.verticalSpan),
  };
}

function sanitizePayload(payload) {
  const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  return {
    objective: compactText(payload.objective),
    stage: compactText(payload.stage) || "primary",
    origin: compactText(payload.origin),
    dryRun: payload.dryRun !== false,
    nodes: nodes.map(sanitizeNode),
    shapeSummary: sanitizeShapeSummary(payload.shapeSummary),
  };
}

function pruneLowValueActions(actions, notes, stage, locale) {
  let nextActions = Array.isArray(actions) ? [...actions] : [];

  nextActions = pruneExcessColorActions(nextActions, notes, stage, locale);

  if (stage === "primary") {
    const semanticTagActions = nextActions.filter((action) => action.type === "append_tags");
    if (semanticTagActions.length) {
      const visibleOrStructuralActions = nextActions.filter((action) => action.type !== "append_tags");
      if (!visibleOrStructuralActions.length) {
        notes.push(buildSemanticTagDeferredNote(semanticTagActions, locale));
      }
      nextActions = visibleOrStructuralActions;
    }
  }

  const hasStructuralOrganization = nextActions.some(
    (action) => action && action.type === "organize_branch_groups"
  );
  const hasVisibleBranchDigest = nextActions.some(
    (action) => action && action.meta && action.meta.source === "branch_structure_digest"
  );

  if (hasStructuralOrganization || hasVisibleBranchDigest) {
    nextActions = nextActions.filter((action) => action.type !== "append_tags");
  }

  return nextActions;
}

function isVisibleStrategyAction(action) {
  if (!action) return false;
  const disposition =
    action.execution && action.execution.disposition
      ? action.execution.disposition
      : "review_required";
  if (disposition === "suggest_only") return false;
  if (action.type === "set_color_index") return true;
  if (action.type === "organize_branch_groups") return true;
  if (
    action.type === "rewrite_excerpt" &&
    action.meta &&
    action.meta.source === "branch_structure_digest"
  ) {
    return true;
  }
  return false;
}

function visibleStrategyActionCounts(actions) {
  const counts = {
    set_color_index: 0,
    organize_branch_groups: 0,
    rewrite_excerpt: 0,
  };

  (actions || []).forEach((action) => {
    if (!isVisibleStrategyAction(action)) return;
    counts[action.type] = (counts[action.type] || 0) + 1;
  });

  return counts;
}

function summarizeVisibleStrategyActions(counts, locale) {
  const parts = [];
  if (counts.set_color_index) {
    parts.push(
      locale === "zh"
        ? `颜色 ${counts.set_color_index}`
        : `${counts.set_color_index} color changes`
    );
  }
  if (counts.organize_branch_groups) {
    parts.push(
      locale === "zh"
        ? `整理分组 ${counts.organize_branch_groups}`
        : `${counts.organize_branch_groups} branch regroupings`
    );
  }
  if (counts.rewrite_excerpt) {
    parts.push(
      locale === "zh"
        ? `分支概览 ${counts.rewrite_excerpt}`
        : `${counts.rewrite_excerpt} branch overview fills`
    );
  }
  return parts.join(locale === "zh" ? "、" : ", ");
}

function collectStrategyShapeEvidence(shapeSummary, notes, locale) {
  const evidence = [];
  branchShapeEvidenceLines(shapeSummary, locale).forEach((line) => evidence.push(line));
  (notes || [])
    .filter((item) => item && item.type === "branch_shape_warning" && item.noteId)
    .forEach((item) => {
      const message = compactText(item.message);
      if (message) evidence.push(message);
    });
  return dedupe(evidence).slice(0, 4);
}

function deferredVisualCount(notes) {
  return (notes || [])
    .filter((item) => item && item.type === "visual_color_deferred")
    .reduce((sum, item) => {
      if (typeof item.deferredActionCount === "number") {
        return sum + item.deferredActionCount;
      }
      const value = compactText(item.message);
      const matched = value.match(/(\d+)/);
      return sum + (matched ? Number(matched[1]) : 0);
    }, 0);
}

function deferredSemanticCount(notes) {
  return (notes || [])
    .filter((item) => item && item.type === "semantic_tag_deferred")
    .reduce((sum, item) => {
      if (typeof item.deferredActionCount === "number") {
        return sum + item.deferredActionCount;
      }
      const value = compactText(item.message);
      const matched = value.match(/(\d+)/);
      return sum + (matched ? Number(matched[1]) : 0);
    }, 0);
}

function zeroVisibleStrategyCounts() {
  return {
    set_color_index: 0,
    organize_branch_groups: 0,
    rewrite_excerpt: 0,
  };
}

function hasBlockingOrganizedEnoughSignals(notes, unsupportedActions) {
  if (Array.isArray(unsupportedActions) && unsupportedActions.length) return true;
  return (notes || []).some((item) => {
    if (!item) return false;
    if (item.type === "structure_warning") return true;
    if (item.type === "duplicate_title_warning") return true;
    if (item.type === "branch_shape_warning" && item.noteId) return true;
    return false;
  });
}

function collectOrganizedEnoughEvidence(shapeSummary, notes, locale) {
  const evidence = [];
  branchShapeEvidenceLines(shapeSummary, locale).forEach((line) => evidence.push(line));
  (notes || [])
    .filter(
      (item) =>
        item &&
        (item.type === "semantic_tag_deferred" || item.type === "visual_color_deferred")
    )
    .forEach((item) => {
      const message = compactText(item.message);
      if (message) evidence.push(message);
    });
  return dedupe(evidence).slice(0, 4);
}

function buildOrganizedEnoughReason(deferredSemantic, deferredVisual, locale) {
  if (deferredSemantic || deferredVisual) {
    const parts = [];
    if (deferredSemantic) {
      parts.push(
        locale === "zh"
          ? `${deferredSemantic} 条语义补充`
          : `${deferredSemantic} semantic enrichments`
      );
    }
    if (deferredVisual) {
      parts.push(
        locale === "zh"
          ? `${deferredVisual} 条次优先视觉改色`
          : `${deferredVisual} lower-priority visual recolors`
      );
    }
    return locale === "zh"
      ? `本轮保守跳过了 ${parts.join("和")}，因为当前分支暂时没有需要直接执行的可见整理动作。`
      : `This pass conservatively deferred ${parts.join(" and ")} because the branch does not currently need new visible organization changes.`;
  }

  return locale === "zh"
    ? "当前没有检测到需要本轮处理的可见整理变化，因此先保持现状。"
    : "No visible organization changes were detected for this pass, so the branch is left as-is for now.";
}

function buildStrategyPacks(actions, notes, unsupportedActions, stage, nodes, shapeSummary, locale) {
  const visibleActions = (actions || []).filter((action) => isVisibleStrategyAction(action));
  const rootNoteId = nodes && nodes[0] ? nodes[0].noteId || null : null;

  if (!visibleActions.length) {
    if ((actions || []).length) return [];
    if (hasBlockingOrganizedEnoughSignals(notes, unsupportedActions)) return [];

    const deferredVisual = deferredVisualCount(notes);
    const deferredSemantic = deferredSemanticCount(notes);
    const shapeEvidence = collectOrganizedEnoughEvidence(shapeSummary, notes, locale);

    return [
      {
        key: `${compactText(stage) || "primary"}-organized-enough-strategy`,
        type: "branch_already_organized_strategy",
        stage: compactText(stage) || "primary",
        rootNoteId,
        summary:
          locale === "zh"
            ? "本轮未安排新的可见整理动作：当前分支已基本整理完成。"
            : "No new visible organization actions are planned for this pass: this branch already looks organized enough.",
        reason: buildOrganizedEnoughReason(deferredSemantic, deferredVisual, locale),
        shapeEvidence,
        actionKeys: [],
        visibleActionCounts: zeroVisibleStrategyCounts(),
        deferredVisualCount: deferredVisual,
        deferredSemanticCount: deferredSemantic,
        executionDisposition: "suggest_only",
      },
    ];
  }

  const counts = visibleStrategyActionCounts(visibleActions);
  const actionSummary = summarizeVisibleStrategyActions(counts, locale);
  const shapeEvidence = collectStrategyShapeEvidence(shapeSummary, notes, locale);
  const deferredCount = deferredVisualCount(notes);

  return [
    {
      key: `${compactText(stage) || "primary"}-visual-branch-strategy`,
      type: "visual_branch_strategy",
      stage: compactText(stage) || "primary",
      rootNoteId,
      summary:
        locale === "zh"
          ? `本轮将优先处理可见整理：${actionSummary || "当前没有可见整理动作"}。`
          : `This pass will prioritize visible organization actions: ${actionSummary || "no visible actions"}.`,
      reason:
        shapeEvidence.length
          ? locale === "zh"
            ? "当前脑图已经显露可见的结构或布局压力，因此先把颜色、分组和摘要补强合并成一轮统一的视觉整理预览。"
            : "The current mind map already shows visible structural or layout pressure, so color, regrouping, and summary actions are bundled into one visual organization pass first."
          : locale === "zh"
            ? "当前分支已经累积出一组可见整理动作，因此先以统一视觉策略来解释这些改动。"
            : "This branch already has a coherent set of visible organization actions, so they are explained first as one visual strategy.",
      shapeEvidence,
      actionKeys: visibleActions.map((action) => action.actionKey).filter(Boolean),
      visibleActionCounts: counts,
      deferredVisualCount: deferredCount,
      executionDisposition: "review_required",
    },
  ];
}

function buildPlan(payload) {
  const objective = compactText(payload.objective);
  const stage = compactText(payload.stage) || "primary";
  const origin = compactText(payload.origin);
  const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  const shapeSummary = payload && payload.shapeSummary ? payload.shapeSummary : null;
  const dryRun = payload.dryRun !== false;
  const locale = inferLocale(nodes, objective);
  const nodeMap = new Map(nodes.map((node) => [node.noteId, node]));
  const noteOrderMap = new Map(nodes.map((node, index) => [node.noteId, index]));
  const duplicateGroups = siblingDuplicateGroups(nodes);

  const actions = [];
  const notes = [];
  const unsupportedActions = [];

  const breakdownContextNote = buildNativeBreakdownContextNote(origin, nodes, locale);
  if (breakdownContextNote) {
    notes.push(breakdownContextNote);
  }

  const selectionShapeNote = buildSelectionShapeNote(shapeSummary, locale);
  if (selectionShapeNote) {
    notes.push(selectionShapeNote);
  }

  nodes.forEach((node, index) => {
    const nextTitle = buildTitle(node, index);
    const generatedTitle = compactText(nextTitle);
    const existingTitle = compactText(node.title);
    const inferredTags = inferTags(node);
    const currentTags = Array.isArray(node.tags) ? node.tags : [];
    const missingTags = inferredTags.filter((tag) => !currentTags.includes(tag));
    const legacyExcerpt = compactText(node.mainExcerptText);
    const legacyExcerptDetected = legacyExcerpt && isLegacyOrganizerComment(legacyExcerpt);
    const branchDigestExcerpt = legacyExcerptDetected
      ? null
      : buildBranchDigestExcerpt(node, nodeMap, locale);
    const excerptSummary = legacyExcerptDetected ? "" : buildExcerptSummary(node);
    const legacyComments = extractLegacyOrganizerComments(node);

    if (legacyComments.length) {
      actions.push({
        type: "remove_comments_by_text",
        noteId: node.noteId,
        comments: legacyComments,
        reason:
          locale === "zh"
            ? "删除旧版本留下的整理痕迹评论。"
            : "Remove legacy organizer trace comments left by older plugin versions.",
        meta: buildMeta("legacy_cleanup", 0.97, [
          locale === "zh"
            ? `命中 ${legacyComments.length} 条旧整理评论`
            : `Matched ${legacyComments.length} legacy organizer comments`,
        ]),
      });
    }

    if (legacyExcerptDetected) {
      const cleanedExcerpt = buildCleanExcerpt(node);
      actions.push({
        type: "rewrite_excerpt",
        noteId: node.noteId,
        text: cleanedExcerpt,
        reason:
          locale === "zh"
            ? "清理旧版本遗留到摘录区的整理痕迹文本。"
            : "Clean legacy organizer trace text that ended up in the main excerpt.",
        meta: buildMeta("legacy_cleanup", 0.95, [
          locale === "zh" ? "主摘录命中旧整理痕迹模式" : "Main excerpt matched legacy organizer pattern",
        ]),
      });
    }

    if (generatedTitle && generatedTitle !== existingTitle) {
      upsertAction(actions, {
        type: "set_title",
        noteId: node.noteId,
        title: generatedTitle,
        reason:
          locale === "zh"
            ? "补全空标题或替换过弱标题，方便在脑图中快速识别。"
            : "Fill an empty or weak title so the branch is easier to scan.",
        meta: buildMeta("weak_title_repair", 0.84, [
          locale === "zh"
            ? `原标题：${existingTitle || "（空）"}`
            : `Original title: ${existingTitle || "(empty)"}`,
          locale === "zh"
            ? `候选标题来自摘录/正文首句`
            : "Candidate title came from the excerpt or first sentence",
        ]),
      });
    }

    const colorAction = buildColorAction(node, nodeMap, locale);
    if (colorAction) {
      upsertAction(actions, colorAction);
    }

    if (missingTags.length && !shouldSuppressSemanticTags(node, stage)) {
      actions.push({
        type: "append_tags",
        noteId: node.noteId,
        tags: missingTags,
        reason:
          locale === "zh"
            ? "根据卡片内容补充轻量语义标签。"
            : "Add lightweight semantic tags inferred from the note content.",
        meta: buildMeta("semantic_tag_inference", 0.76, [
          locale === "zh"
            ? `新增标签：${missingTags.join("、")}`
            : `Added tags: ${missingTags.join(", ")}`,
        ]),
      });
    }

    if (branchDigestExcerpt) {
      actions.push({
        type: "rewrite_excerpt",
        noteId: node.noteId,
        text: branchDigestExcerpt.text,
        reason:
          locale === "zh"
            ? "为新的分支汇总节点补一条可见概览，方便在脑图中快速理解这一组内容。"
            : "Add a visible branch overview so the regrouped subtree is easier to scan.",
        meta: buildMeta("branch_structure_digest", 0.81, [
          ...(Array.isArray(branchDigestExcerpt.evidence) ? branchDigestExcerpt.evidence : []),
          locale === "zh"
            ? "当前节点只有标题，缺少可见摘要"
            : "This node currently has only a title and no visible summary",
        ]),
      });
    } else if (excerptSummary) {
      actions.push({
        type: "rewrite_excerpt",
        noteId: node.noteId,
        text: excerptSummary,
        reason:
          locale === "zh"
            ? "当前没有主摘录，补一条便于后续回顾。"
            : "Add a short main excerpt because the note currently has none.",
        meta: buildMeta("missing_excerpt_fill", 0.78, [
          locale === "zh"
            ? "当前主摘录为空或只有旧整理痕迹"
            : "Main excerpt was empty or contained only legacy organizer text",
        ]),
      });
    }
  });

  nodes.forEach((node) => {
    const suggestion = buildSplitBranchSuggestion(node, nodeMap, locale);
    if (!suggestion) {
      const shapeWarning = buildNodeShapeWarning(node, nodeMap, locale);
      if (shapeWarning) {
        notes.push(shapeWarning);
      }
      return;
    }

    notes.push({
      type: "structure_warning",
      noteId: node.noteId,
      message: suggestion.summary,
    });
    const action = buildSplitBranchAction(suggestion, locale);
    if (action) {
      upsertAction(actions, action);
    } else {
      unsupportedActions.push(suggestion);
    }
  });

  duplicateGroups.forEach((group) => {
    const suggestion = buildDisambiguationSuggestion(group, locale);
    notes.push({
      type: "duplicate_title_warning",
      noteId: suggestion.noteId,
      message: suggestion.summary,
    });
    unsupportedActions.push(suggestion);

    buildDisambiguationActions(suggestion, locale).forEach((action) => {
      upsertAction(actions, action);
    });
  });

  const prunedActions = pruneLowValueActions(actions, notes, stage, locale);

  const annotatedActions = sortActions(
    prunedActions.map((action) => annotateActionPhase(annotateActionExecution(action, locale))),
    noteOrderMap
  );
  const keyedActions = assignActionKeys(annotatedActions, stage);
  const strategyPacks = buildStrategyPacks(
    keyedActions,
    notes,
    unsupportedActions,
    stage,
    nodes,
    shapeSummary,
    locale
  );

  return {
    objective,
    stage,
    origin,
    dryRun,
    shapeSummary,
    actions: keyedActions,
    strategyPacks,
    notes,
    unsupportedActions,
    actionDispositionCounts: summarizeExecutionDispositions(keyedActions),
    actionPhaseCounts: summarizeActionPhases(keyedActions),
  };
}

function planResponse(payload) {
  return {
    ok: true,
    plan: buildPlan(sanitizePayload(payload)),
  };
}

module.exports = {
  planResponse,
  buildPlan,
  sanitizePayload,
  sanitizeNode,
  compactText,
  isLegacyOrganizerComment,
  extractLegacyOrganizerComments,
  classifyActionExecution,
  summarizeExecutionDispositions,
  summarizeActionPhases,
  buildStrategyPacks,
};
