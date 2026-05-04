function normalizePrompt(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function enabledFields(template) {
  return (Array.isArray(template && template.fields) ? template.fields : []).filter(
    (field) => field && field.enabled
  );
}

function buildTemplateFingerprint(template) {
  return enabledFields(template)
    .map((field) => `${field.type}:${normalizePrompt(field.prompt).toLowerCase()}:${field.cloze ? 1 : 0}`)
    .sort()
    .join("|");
}

function genericContentPrompt(prompt) {
  const value = normalizePrompt(prompt).toLowerCase();
  if (!value) return false;
  return [
    "整理和组织内容",
    "process and organize the content clearly",
    "extract and format the main content",
    "add a brief summary or note"
  ].includes(value);
}

function hasDeepKeywords(prompt) {
  return /deep thinking|deep analysis|深度思考|深度分析/i.test(prompt || "");
}

function normalizationSuggestions(templates) {
  const suggestions = [];
  templates.forEach((template) => {
    (template.fields || []).forEach((field) => {
      const originalPrompt = typeof field.prompt === "string" ? field.prompt : "";
      const normalizedPrompt = normalizePrompt(originalPrompt);
      if (originalPrompt && normalizedPrompt !== originalPrompt) {
        suggestions.push({
          templateIndex: template.index,
          fieldType: field.type,
          currentPrompt: originalPrompt,
          suggestedPrompt: normalizedPrompt,
          reason: "normalize_whitespace"
        });
      }
    });
  });
  return suggestions;
}

function qualityFindings(templates) {
  const findings = [];

  templates.forEach((template) => {
    (template.fields || []).forEach((field) => {
      const prompt = normalizePrompt(field.prompt);
      if (!field.enabled) return;

      if (genericContentPrompt(prompt) && field.type === "content") {
        findings.push({
          code: "generic_content_prompt",
          severity: "info",
          templateIndex: template.index,
          fieldType: field.type,
          message: `Enabled content prompt is generic and may benefit from a more explicit output contract: "${prompt}".`
        });
      }

      if (!prompt) {
        findings.push({
          code: "enabled_field_missing_prompt",
          severity: "warning",
          templateIndex: template.index,
          fieldType: field.type,
          message: `Enabled field "${field.type}" has an empty prompt.`
        });
      }

      if (hasDeepKeywords(prompt) && !template.deepMode) {
        findings.push({
          code: "deep_keywords_without_deep_mode",
          severity: "info",
          templateIndex: template.index,
          fieldType: field.type,
          message: `Field "${field.type}" mentions deep-analysis keywords while deepMode is off.`
        });
      }
    });

    if (!template.enabledFieldCount) {
      findings.push({
        code: "no_enabled_fields",
        severity: "warning",
        templateIndex: template.index,
        fieldType: null,
        message: "Template has no enabled fields."
      });
    }

    if (!template.enabledContentFieldCount) {
      findings.push({
        code: "no_enabled_content_field",
        severity: "warning",
        templateIndex: template.index,
        fieldType: null,
        message: "Template has no enabled content field."
      });
    }
  });

  const duplicateGroups = {};
  templates.forEach((template) => {
    const fingerprint = buildTemplateFingerprint(template);
    if (!fingerprint) return;
    duplicateGroups[fingerprint] = duplicateGroups[fingerprint] || [];
    duplicateGroups[fingerprint].push(template.index);
  });
  Object.keys(duplicateGroups).forEach((fingerprint) => {
    const indexes = duplicateGroups[fingerprint];
    if (indexes.length > 1) {
      indexes.forEach((templateIndex) => {
        findings.push({
          code: "duplicate_template_fingerprint",
          severity: "info",
          templateIndex,
          fieldType: null,
          message: `Template duplicates enabled prompts with templates: ${indexes.filter((item) => item !== templateIndex).join(", ")}.`
        });
      });
    }
  });

  return findings.sort((left, right) => {
    if (left.templateIndex !== right.templateIndex) {
      return left.templateIndex - right.templateIndex;
    }
    return left.code.localeCompare(right.code);
  });
}

function diffTemplates(templates) {
  const diffs = [];
  for (let leftIndex = 0; leftIndex < templates.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < templates.length; rightIndex += 1) {
      const left = templates[leftIndex];
      const right = templates[rightIndex];
      const leftFields = {};
      const rightFields = {};
      enabledFields(left).forEach((field) => {
        leftFields[field.type] = normalizePrompt(field.prompt);
      });
      enabledFields(right).forEach((field) => {
        rightFields[field.type] = normalizePrompt(field.prompt);
      });
      const fieldTypes = Array.from(
        new Set(Object.keys(leftFields).concat(Object.keys(rightFields)))
      ).sort();
      const changedFieldTypes = fieldTypes.filter(
        (fieldType) => (leftFields[fieldType] || "") !== (rightFields[fieldType] || "")
      );
      diffs.push({
        leftTemplateIndex: left.index,
        rightTemplateIndex: right.index,
        sameKind: (left.kind || "unknown") === (right.kind || "unknown"),
        leftKind: left.kind || "unknown",
        rightKind: right.kind || "unknown",
        sharedEnabledFieldTypes: fieldTypes.filter(
          (fieldType) => leftFields[fieldType] && rightFields[fieldType]
        ),
        changedFieldTypes,
        sameFingerprint: buildTemplateFingerprint(left) === buildTemplateFingerprint(right)
      });
    }
  }
  return diffs.sort((left, right) => {
    if (left.sameKind !== right.sameKind) return left.sameKind ? -1 : 1;
    if (left.leftTemplateIndex !== right.leftTemplateIndex) {
      return left.leftTemplateIndex - right.leftTemplateIndex;
    }
    return left.rightTemplateIndex - right.rightTemplateIndex;
  });
}

function summarizeRecommendations(templates, findings, suggestions, diffs) {
  const recommendations = [];
  if (suggestions.length) {
    recommendations.push(
      `Normalize whitespace in ${suggestions.length} prompt field(s) so future template diffs stay stable.`
    );
  }
  const genericCount = findings.filter((item) => item.code === "generic_content_prompt").length;
  if (genericCount) {
    recommendations.push(
      `Rewrite ${genericCount} generic content prompt(s) with a clearer output contract, structure, or target format.`
    );
  }
  const sameKindPairs = diffs.filter((item) => item.sameKind);
  if (sameKindPairs.length) {
    recommendations.push(
      `Review ${sameKindPairs.length} same-kind template pair(s) to decide whether they should stay separate variants or be merged.`
    );
  }
  if (!recommendations.length && templates.length) {
    recommendations.push(
      "Current templates look structurally clean; the next useful step is adding semantic quality guidance rather than fixing lint."
    );
  }
  return recommendations;
}

function analyzeTemplates(templates) {
  const normalizedTemplates = Array.isArray(templates) ? templates : [];
  const normalization = normalizationSuggestions(normalizedTemplates);
  const quality = qualityFindings(normalizedTemplates);
  const diffs = diffTemplates(normalizedTemplates);
  return {
    normalizationSuggestions: normalization,
    qualityFindings: quality,
    templateDiffs: diffs,
    recommendations: summarizeRecommendations(
      normalizedTemplates,
      quality,
      normalization,
      diffs
    )
  };
}

module.exports = {
  analyzeTemplates,
  buildTemplateFingerprint,
  normalizePrompt
};
