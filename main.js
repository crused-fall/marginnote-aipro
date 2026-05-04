;(function () {
  const Addon = {
    name: "MNAIPro",
    key: "mnaipro",
    title: "整理当前选中分支",
    bridgeBaseUrl: "http://127.0.0.1:8765",
    bridgeDirName: "MNAIProBridge",
    reportsDirName: "reports",
    diagnosticsDirName: "diagnostics"
  }
  const UTF8_ENCODING = 4
  const JSON_PRETTY_PRINTED = 0
  const JSON_MUTABLE_CONTAINERS = 1
  const TOPIC_LABELS = {
    comparison: { zh: "对比", en: "comparison" },
    definition: { zh: "定义", en: "definition" },
    example: { zh: "例题", en: "example" },
    formula: { zh: "公式", en: "formula" },
    proof: { zh: "证明", en: "proof" },
    question: { zh: "问题", en: "question" },
    summary: { zh: "总结", en: "summary" },
    theorem: { zh: "定理", en: "theorem" }
  }

  const zh = {
    commandTitle: "整理当前选中分支",
    loaded: "MNAIPro 已加载",
    loadedTitle: "MNAIPro 测试加载成功",
    loadedMessage:
      "如果你看到了这个提示，说明插件壳已经被 MarginNote 成功加载。",
    commandHitTitle: "MNAIPro 命令已命中",
    commandHitMessage:
      "如果你看到了这个提示，说明你已经成功点中了插件命令。接下来会继续进入预览流程。",
    confirm: "确定",
    cancel: "取消",
    preview: "预览计划",
    apply: "执行安全动作",
    noFocusNote: "未找到当前焦点卡片，请先选中一个分支根卡片。",
    collecting: "正在收集当前分支...",
    requestingPlan: "正在生成整理计划...",
    planSummary: "计划摘要",
    summarySaved: "完整计划已保存到文件",
    summaryFolder: "保存目录",
    summaryJson: "完整 JSON",
    summaryText: "摘要文本",
    diagnosticsLabel: "诊断",
    diagnosticSessionLabel: "会话",
    diagnosticStatusLabel: "诊断状态",
    diagnosticJsonLabel: "诊断 JSON",
    diagnosticTextLabel: "诊断摘要",
    lastErrorLabel: "最近错误",
    requestIdLabel: "请求 ID",
    latestPlanLabel: "最新预览",
    latestApplyLabel: "最新执行",
    latestFollowupLabel: "最新后续",
    latestFollowupApplyLabel: "最新后续执行",
    branchNodesLabel: "分支节点",
    plannedActionsLabel: "计划动作",
    applyActionsLabel: "执行动作",
    summaryCounts: "动作统计",
    summaryNext:
      "建议先阅读摘要，再决定是否执行安全动作。",
    previewSavedTitle: "预览文件已生成",
    previewSavedMessage:
      "这次仅做了预览，没有修改卡片内容。完整预览文件已经生成，可到下面位置查看：",
    previewCancelHint: "点取消即可退出预览且不做修改。",
    commandLabel: "命令",
    modeLabel: "模式",
    originLabel: "来源",
    primaryModeLabel: "主整理",
    breakdownModeLabel: "AI Breakdown",
    modeChooserTitle: "选择处理模式",
    modeChooserMessage: "这次要走普通整理，还是 AI Breakdown 分支处理？",
    modeChooserPrimary: "整理当前选中分支",
    modeChooserBreakdown: "整理 AI Breakdown 分支",
    nextPage: "下一页",
    prevPage: "上一页",
    pageLabel: "页",
    noteLabel: "卡片",
    idLabel: "ID",
    reasonLabel: "理由",
    sourceLabel: "来源",
    confidenceLabel: "置信度",
    evidenceLabel: "依据",
    executionLabel: "执行等级",
    phaseLabel: "阶段",
    roleLabel: "角色",
    priorityLabel: "视觉优先级",
    cleanupLabel: "清理",
    normalizeLabel: "规范",
    enrichLabel: "补充",
    safeAutoLabel: "可安全执行",
    reviewRequiredLabel: "需确认",
    suggestOnlyLabel: "仅建议",
    selectionStatusLabel: "执行状态",
    selectedState: "已包含",
    excludedState: "已排除",
    includeCurrent: "包含当前卡片",
    excludeCurrent: "排除当前卡片",
    applySelected: "执行已选动作",
    selectedNotesLabel: "已选卡片",
    selectedActionsLabel: "已选动作",
    selectionHint:
      "可逐页查看卡片，并把不想执行的卡片排除。最后执行已选动作。",
    noSelectedActions: "当前没有选中任何可执行动作。",
    titleActionLabel: "标题",
    colorActionLabel: "颜色",
    excerptActionLabel: "摘录",
    branchOverviewActionLabel: "分支概览",
    tagsActionLabel: "标签",
    commentActionLabel: "评论",
    removeCommentActionLabel: "清理评论",
    organizeBranchActionLabel: "整理分组",
    emptyValue: "(空)",
    warningsLabel: "提醒",
    unsupportedLabel: "暂不支持",
    noActionsPlanned: "这次没有生成可执行动作。",
    branchAlreadyOrganizedTitle: "当前分支已基本整理完成",
    branchAlreadyOrganizedBody:
      "这一轮没有检测到值得直接执行的可见结构或摘要改动，因此主阶段先停在这里。",
    semanticDeferredLabel: "已延后语义补充",
    visualDeferredLabel: "已延后视觉改色",
    strategyLabel: "视觉策略包",
    strategySummaryLabel: "策略摘要",
    visibleActionSummaryLabel: "本轮可见整理",
    previewPolicyLabel: "策略说明",
    conservativePreviewPolicy: "仍为保守预览先行，不新增自动执行。",
    shapeLabel: "脑图形态",
    visibleNodesLabel: "可见节点",
    collapsedBranchesLabel: "折叠分支",
    hiddenNodesLabel: "隐藏节点",
    spanLabel: "画布跨度",
    planUnavailable: "无法获取规划结果，请确认本地 bridge 已启动。",
    applyDone: "已执行可安全应用的动作",
    applySkipped: "部分动作在稳定 helper 壳下暂不支持执行，已跳过。",
    applyFiltered:
      "部分动作因当前 helper 壳能力限制，已在执行前拦截，未进入实际执行阶段。",
    applyReportSaved: "执行结果已保存到文件",
    applyReportJson: "执行 JSON",
    applyReportText: "执行摘要",
    visibleChanges: "可见变更",
    changedNotes: "变更卡片",
    helperBlocked: "预先拦截",
    noHelperExecutableActions:
      "当前选中的动作在此 helper 壳下都不可执行，未开始实际执行。",
    haltedAt: "已在错误处停止后续执行",
    helperShellNotice:
      "当前是稳定 helper 壳。预览会完整生成计划文件；自动执行会优先应用标题、摘录、评论、标签和首批结构分组动作，仍不支持的动作会明确跳过。",
    unsupportedAction: "未执行动作",
    bridgeMissing:
      "未连接到本地 agent bridge。请先在电脑上启动 bridge，再重试。",
    previewOnly: "仅预览",
    skipped: "已跳过",
    applied: "已执行",
    focusMissing: "没有焦点卡片",
    branchReady: "分支已收集",
    planReady: "整理计划已生成"
    ,
    followupPlanning: "正在分析下一阶段...",
    followupApplying: "正在执行下一阶段中的分支概览补强...",
    nextStageLabel: "下一阶段",
    nextStageActions: "后续动作",
    nextStageSaved: "后续计划已保存到文件",
    nextStageJson: "后续 JSON",
    nextStageText: "后续摘要",
    followupApplied: "后续已自动执行",
    followupDeferred: "后续仍待确认",
    followupApplySaved: "后续执行结果已保存到文件",
    followupApplyJson: "后续执行 JSON",
    followupApplyText: "后续执行摘要",
    nextStageNone: "当前分支的结构整理已完成，暂时没有新的后续动作。",
    nextStagePending: "结构整理已完成，下一阶段建议已生成。"
  }

  const en = {
    commandTitle: "Organize Current Selected Branch",
    loaded: "MNAIPro loaded",
    loadedTitle: "MNAIPro Loaded",
    loadedMessage:
      "If you can see this message, the addon shell has been loaded by MarginNote.",
    commandHitTitle: "MNAIPro Command Hit",
    commandHitMessage:
      "If you can see this message, you successfully clicked the addon command. Preview will continue next.",
    confirm: "OK",
    cancel: "Cancel",
    preview: "Preview Plan",
    apply: "Apply Safe Actions",
    noFocusNote: "No focused note found. Please select a branch root first.",
    collecting: "Collecting branch...",
    requestingPlan: "Generating plan...",
    planSummary: "Plan Summary",
    summarySaved: "The full plan was saved to files",
    summaryFolder: "Saved folder",
    summaryJson: "Full JSON",
    summaryText: "Summary text",
    diagnosticsLabel: "Diagnostics",
    diagnosticSessionLabel: "Session",
    diagnosticStatusLabel: "Diagnostic status",
    diagnosticJsonLabel: "Diagnostic JSON",
    diagnosticTextLabel: "Diagnostic summary",
    lastErrorLabel: "Last error",
    requestIdLabel: "Request ID",
    latestPlanLabel: "Latest plan",
    latestApplyLabel: "Latest apply",
    latestFollowupLabel: "Latest follow-up",
    latestFollowupApplyLabel: "Latest follow-up apply",
    branchNodesLabel: "Branch nodes",
    plannedActionsLabel: "Planned actions",
    applyActionsLabel: "Apply actions",
    summaryCounts: "Action counts",
    summaryNext:
      "Review the summary first, then decide whether to apply safe actions.",
    previewSavedTitle: "Preview Files Generated",
    previewSavedMessage:
      "This was a preview only. No note content was changed. Full preview files were generated here:",
    previewCancelHint: "Press Cancel to exit preview without applying changes.",
    commandLabel: "Command",
    modeLabel: "Mode",
    originLabel: "Origin",
    primaryModeLabel: "Primary",
    breakdownModeLabel: "AI Breakdown",
    modeChooserTitle: "Choose a mode",
    modeChooserMessage: "Use normal branch organization or the AI Breakdown branch helper?",
    modeChooserPrimary: "Organize current selected branch",
    modeChooserBreakdown: "Organize AI Breakdown branch",
    nextPage: "Next",
    prevPage: "Previous",
    pageLabel: "Page",
    noteLabel: "Note",
    idLabel: "ID",
    reasonLabel: "Reason",
    sourceLabel: "Source",
    confidenceLabel: "Confidence",
    evidenceLabel: "Evidence",
    executionLabel: "Execution",
    phaseLabel: "Phase",
    roleLabel: "Role",
    priorityLabel: "Visual priority",
    cleanupLabel: "Cleanup",
    normalizeLabel: "Normalize",
    enrichLabel: "Enrich",
    safeAutoLabel: "Safe auto",
    reviewRequiredLabel: "Needs review",
    suggestOnlyLabel: "Suggest only",
    selectionStatusLabel: "Selection",
    selectedState: "Included",
    excludedState: "Excluded",
    includeCurrent: "Include This Note",
    excludeCurrent: "Exclude This Note",
    applySelected: "Apply Selected",
    selectedNotesLabel: "Selected notes",
    selectedActionsLabel: "Selected actions",
    selectionHint:
      "Review note pages and exclude anything you do not want to apply. Then apply the selected actions.",
    noSelectedActions: "No executable actions are currently selected.",
    titleActionLabel: "Title",
    colorActionLabel: "Color",
    excerptActionLabel: "Excerpt",
    branchOverviewActionLabel: "Branch overview",
    tagsActionLabel: "Tags",
    commentActionLabel: "Comment",
    removeCommentActionLabel: "Remove comments",
    organizeBranchActionLabel: "Organize branch",
    emptyValue: "(empty)",
    warningsLabel: "Warnings",
    unsupportedLabel: "Unsupported",
    noActionsPlanned: "No executable actions were generated this time.",
    branchAlreadyOrganizedTitle: "This branch already looks organized enough",
    branchAlreadyOrganizedBody:
      "This pass did not find visible structure or summary edits worth applying directly, so the primary stage stops here.",
    semanticDeferredLabel: "Semantic enrichments deferred",
    visualDeferredLabel: "Visual recolors deferred",
    strategyLabel: "Visual strategy pack",
    strategySummaryLabel: "Strategy summary",
    visibleActionSummaryLabel: "Visible actions this pass",
    previewPolicyLabel: "Policy",
    conservativePreviewPolicy: "Still preview-first and conservative; this does not expand auto-apply.",
    shapeLabel: "Mind-map shape",
    visibleNodesLabel: "Visible nodes",
    collapsedBranchesLabel: "Collapsed branches",
    hiddenNodesLabel: "Hidden nodes",
    spanLabel: "Canvas span",
    planUnavailable:
      "Unable to fetch a plan. Make sure the local bridge is running.",
    applyDone: "Applied safe actions",
    applySkipped:
      "Some actions are not yet executable in the stable helper shell and were skipped.",
    applyFiltered:
      "Some actions were blocked before execution because the current helper shell cannot execute them.",
    applyReportSaved: "Apply results were saved to files",
    applyReportJson: "Apply JSON",
    applyReportText: "Apply summary",
    visibleChanges: "Visible changes",
    changedNotes: "Changed notes",
    helperBlocked: "Preflight blocked",
    noHelperExecutableActions:
      "None of the selected actions are executable in the current helper shell, so nothing was applied.",
    haltedAt: "Stopped remaining actions after an execution error",
    helperShellNotice:
      "This uses the stable helper shell. Preview writes full plan files, and automatic apply now tries title, excerpt, comment, tag, and first-pass branch-grouping edits. Any still-unsupported actions are explicitly skipped.",
    unsupportedAction: "Skipped action",
    bridgeMissing:
      "Local agent bridge is not reachable. Start the bridge and try again.",
    previewOnly: "Preview only",
    skipped: "Skipped",
    applied: "Applied",
    focusMissing: "No focus note",
    branchReady: "Branch collected",
    planReady: "Plan ready"
    ,
    followupPlanning: "Analyzing next stage...",
    followupApplying: "Applying follow-up branch overviews...",
    nextStageLabel: "Next stage",
    nextStageActions: "Follow-up actions",
    nextStageSaved: "Follow-up plan saved to files",
    nextStageJson: "Follow-up JSON",
    nextStageText: "Follow-up summary",
    followupApplied: "Follow-up auto-applied",
    followupDeferred: "Follow-up still pending review",
    followupApplySaved: "Follow-up apply results saved to files",
    followupApplyJson: "Follow-up apply JSON",
    followupApplyText: "Follow-up apply summary",
    nextStageNone: "Structural organization is complete and there are no follow-up actions right now.",
    nextStagePending: "Structural organization is complete and a follow-up stage has been generated."
  }

  const lang = isZH() ? zh : en

  function commandTitleText(source, fallback) {
    const value = noteText(source && (source.command || source.objective))
    if (value) return value
    return noteText(fallback) || lang.commandTitle
  }

  function commandModeText(source) {
    const origin = noteText(source && (source.origin || source.commandOrigin))
    const mode = noteText(source && (source.commandMode || source.mode))
    if (mode === "breakdown" || origin === "native_ai_breakdown") {
      return lang.breakdownModeLabel
    }
    return lang.primaryModeLabel
  }

  function commandOriginText(source) {
    return noteText(source && (source.origin || source.commandOrigin))
  }

  function commandContextLines(source) {
    const lines = [
      `${lang.commandLabel}: ${commandTitleText(source)}`,
      `${lang.modeLabel}: ${commandModeText(source)}`
    ]
    const origin = commandOriginText(source)
    if (origin) {
      lines.push(`${lang.originLabel}: ${origin}`)
    }
    return lines
  }

  function isZH() {
    return (
      NSLocale.preferredLanguages().length &&
      NSLocale.preferredLanguages()[0].startsWith("zh")
    )
  }

  const console = {
    log(obj) {
      JSB.log(`${Addon.key} %@`, obj)
    }
  }

  function popup(title, message, buttons) {
    return new Promise(resolve =>
      UIAlertView.showWithTitleMessageStyleCancelButtonTitleOtherButtonTitlesTapBlock(
        title,
        message,
        0,
        lang.cancel,
        buttons || [lang.confirm],
        (alert, buttonIndex) => {
          resolve({
            option: buttonIndex - 1
          })
        }
      )
    )
  }

  async function chooseCommandVariant() {
    const { option } = await popup(lang.modeChooserTitle, lang.modeChooserMessage, [
      lang.modeChooserPrimary,
      lang.modeChooserBreakdown
    ])
    if (option === 0) {
      return {
        modeKey: "primary",
        commandLabel: lang.commandTitle,
        objective: lang.commandTitle,
        origin: "",
      }
    }
    if (option === 1) {
      return {
        modeKey: "breakdown",
        commandLabel: lang.modeChooserBreakdown,
        objective: lang.modeChooserBreakdown,
        origin: "native_ai_breakdown",
      }
    }
    return null
  }

  function app() {
    return Application.sharedInstance()
  }

  function showHUD(message, duration) {
    app().showHUD(message, self.window, duration || 2)
  }

  function waitHUD(message) {
    if (typeof app().waitHUDOnView === "function") {
      app().waitHUDOnView(message, self.window)
      return
    }
    showHUD(message, 2)
  }

  function stopWaitHUD() {
    if (typeof app().stopWaitHUDOnView === "function") {
      app().stopWaitHUDOnView(self.window)
    }
  }

  function readerController() {
    return self.studyController.readerController
  }

  function notebookController() {
    return self.studyController.notebookController
  }

  function currentDocumentController() {
    const reader = readerController()
    return reader ? reader.currentDocumentController : null
  }

  function databaseModel() {
    if (typeof Database === "undefined" || !Database) return null
    if (typeof Database.sharedInstance !== "function") return null
    try {
      return Database.sharedInstance()
    } catch (error) {
      return null
    }
  }

  function getFocusNote() {
    const notebook = notebookController()
    if (notebook && notebook.focusNote) return notebook.focusNote
    const doc = currentDocumentController()
    if (doc && doc.focusNote) return doc.focusNote
    return null
  }

  function arrayFromObjC(value) {
    if (!value) return []
    try {
      if (Array.isArray(value)) return value
      if (typeof value.count === "function" && typeof value.objectAtIndex === "function") {
        const items = []
        const count = value.count()
        for (let i = 0; i < count; i++) {
          items.push(value.objectAtIndex(i))
        }
        return items
      }
    } catch (error) {
      console.log(error)
    }
    return value.length ? Array.prototype.slice.call(value) : []
  }

  function noteText(value) {
    return value ? String(value) : ""
  }

  function uniqueStrings(values) {
    const seen = {}
    const items = []
    ;(values || []).forEach(value => {
      const text = noteText(value).trim()
      if (!text || seen[text]) return
      seen[text] = true
      items.push(text)
    })
    return items
  }

  function legacyCommentPatterns() {
    return [
      "Agent review:",
      "整理建议：已补全或规范标题",
      "整理建议：已补充摘要摘录"
    ]
  }

  function noteCommentText(comment) {
    if (!comment) return ""
    return noteText(comment.text || comment.q_htext || "")
  }

  function shouldRemoveLegacyComment(text, explicitComments) {
    const value = noteText(text).trim()
    if (!value) return false

    if (uniqueStrings(explicitComments).some(comment => value.indexOf(comment) >= 0)) {
      return true
    }

    return legacyCommentPatterns().some(pattern => value.indexOf(pattern) >= 0)
  }

  function truncateText(text, limit) {
    const value = noteText(text).replace(/\s+/g, " ").trim()
    if (!value) return ""
    if (value.length <= limit) return value
    return `${value.slice(0, limit - 1)}…`
  }

  function cachePath() {
    return noteText(app().cachePath || "")
  }

  function bridgeBaseDir() {
    return `${cachePath()}/${Addon.bridgeDirName}`
  }

  function bridgeRequestsDir() {
    return `${bridgeBaseDir()}/requests`
  }

  function bridgeResponsesDir() {
    return `${bridgeBaseDir()}/responses`
  }

  function bridgeReportsDir() {
    return `${bridgeBaseDir()}/${Addon.reportsDirName}`
  }

  function bridgeDiagnosticsDir() {
    return `${bridgeBaseDir()}/${Addon.diagnosticsDirName}`
  }

  function ensureDir(path) {
    const fm = NSFileManager.defaultManager()
    if (!fm.fileExistsAtPath(path)) {
      fm.createDirectoryAtPathAttributes(path, {})
    }
  }

  function ensureBridgeDirs() {
    ensureDir(bridgeBaseDir())
    ensureDir(bridgeRequestsDir())
    ensureDir(bridgeResponsesDir())
    ensureDir(bridgeReportsDir())
    ensureDir(bridgeDiagnosticsDir())
  }

  function nowIso() {
    return new Date().toISOString()
  }

  function diagnosticSessionJsonPath(sessionId) {
    return `${bridgeDiagnosticsDir()}/${sessionId}.json`
  }

  function diagnosticSessionTextPath(sessionId) {
    return `${bridgeDiagnosticsDir()}/${sessionId}-summary.txt`
  }

  function reportDiagnosticMirrorJsonPath(sessionId) {
    return `${bridgeReportsDir()}/${sessionId}-diagnostic.json`
  }

  function reportDiagnosticMirrorTextPath(sessionId) {
    return `${bridgeReportsDir()}/${sessionId}-diagnostic-summary.txt`
  }

  function reportDiagnosticLatestJsonPath() {
    return `${bridgeReportsDir()}/${Addon.key}-diagnostic-latest.json`
  }

  function reportDiagnosticLatestTextPath() {
    return `${bridgeReportsDir()}/${Addon.key}-diagnostic-latest-summary.txt`
  }

  function sanitizeForJSON(value, depth) {
    const level = typeof depth === "number" ? depth : 0
    if (level > 5) return "[max_depth]"
    if (value === null || value === undefined) return value == null ? null : value

    const type = typeof value
    if (type === "string" || type === "number" || type === "boolean") {
      return value
    }

    if (Object.prototype.toString.call(value) === "[object Date]") {
      try {
        return value.toISOString()
      } catch (error) {
        return String(value)
      }
    }

    if (Array.isArray(value)) {
      return value.slice(0, 80).map(item => sanitizeForJSON(item, level + 1))
    }

    if (type === "object") {
      const result = {}
      Object.keys(value)
        .slice(0, 80)
        .forEach(key => {
          try {
            result[key] = sanitizeForJSON(value[key], level + 1)
          } catch (error) {
            result[key] = `[unserializable:${noteText(error && error.message ? error.message : error)}]`
          }
        })
      return result
    }

    return String(value)
  }

  function diagnosticCounts(session) {
    const events = Array.isArray(session && session.events) ? session.events : []
    const counts = {}
    events.forEach(item => {
      const key = noteText(item && item.type) || "unknown"
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }

  function fileNameOnly(value) {
    const text = noteText(value)
    if (!text) return ""
    const parts = text.split("/")
    return parts[parts.length - 1] || text
  }

  function diagnosticArtifactName(artifact, fallbackPath) {
    if (artifact && artifact.jsonName) return noteText(artifact.jsonName)
    if (artifact && artifact.file) return noteText(artifact.file)
    if (artifact && artifact.fullPath) return fileNameOnly(artifact.fullPath)
    if (artifact && artifact.jsonPath) return fileNameOnly(artifact.jsonPath)
    if (fallbackPath) return fileNameOnly(fallbackPath)
    return ""
  }

  function latestDiagnosticErrorText(session) {
    const data = session || {}
    const latestError = data.lastFollowupError || data.lastError
    return noteText(latestError && latestError.message ? latestError.message : latestError)
  }

  function compactDiagnosticLines(session, options) {
    const data = session || {}
    const opts = options || {}
    const metrics = data.metrics || {}
    const lines = []
    const sessionId = noteText(data.sessionId)
    const status = noteText(data.status) || "unknown"
    const latestErrorText = latestDiagnosticErrorText(data)

    if (opts.includeHeading !== false) {
      lines.push(`${lang.diagnosticsLabel}:`)
    }
    if (sessionId) {
      lines.push(`- ${lang.diagnosticSessionLabel}: ${truncateText(sessionId, 44)}`)
    }
    lines.push(`- ${lang.diagnosticStatusLabel}: ${status}`)
    commandContextLines(data).forEach(line => {
      lines.push(`- ${line}`)
    })

    if (opts.includeRequestId && data.lastRequestId) {
      lines.push(`- ${lang.requestIdLabel}: ${noteText(data.lastRequestId)}`)
    }
    if (typeof metrics.branchNodeCount === "number") {
      lines.push(`- ${lang.branchNodesLabel}: ${metrics.branchNodeCount}`)
    }
    if (typeof metrics.plannedActionCount === "number") {
      lines.push(`- ${lang.plannedActionsLabel}: ${metrics.plannedActionCount}`)
    }
    if (typeof metrics.applyActionCount === "number") {
      lines.push(`- ${lang.applyActionsLabel}: ${metrics.applyActionCount}`)
    }
    if (typeof metrics.followupPlannedActionCount === "number") {
      lines.push(`- ${lang.nextStageActions}: ${metrics.followupPlannedActionCount}`)
    }
    if (typeof metrics.followupAppliedCount === "number") {
      lines.push(`- ${lang.followupApplied}: ${metrics.followupAppliedCount}`)
    }
    if (typeof metrics.followupDeferredActionCount === "number") {
      lines.push(`- ${lang.followupDeferred}: ${metrics.followupDeferredActionCount}`)
    }
    if (typeof metrics.helperBlockedCount === "number" && metrics.helperBlockedCount > 0) {
      lines.push(`- ${lang.helperBlocked}: ${metrics.helperBlockedCount}`)
    }

    if (opts.includePlanArtifact && data.latestPlanArtifact) {
      lines.push(`- ${lang.latestPlanLabel}: ${diagnosticArtifactName(data.latestPlanArtifact)}`)
    }
    if (opts.includeApplyArtifact && data.latestApplyArtifact) {
      lines.push(`- ${lang.latestApplyLabel}: ${diagnosticArtifactName(data.latestApplyArtifact)}`)
    }
    if (opts.includeFollowupArtifact && data.latestFollowupPlanArtifact) {
      lines.push(`- ${lang.latestFollowupLabel}: ${diagnosticArtifactName(data.latestFollowupPlanArtifact)}`)
    }
    if (opts.includeFollowupApplyArtifact && data.latestFollowupApplyArtifact) {
      lines.push(
        `- ${lang.latestFollowupApplyLabel}: ${diagnosticArtifactName(data.latestFollowupApplyArtifact)}`
      )
    }
    if (opts.includeDiagnosticArtifacts && sessionId) {
      lines.push(`- ${lang.diagnosticJsonLabel}: ${diagnosticArtifactName(null, reportDiagnosticMirrorJsonPath(sessionId))}`)
      lines.push(`- ${lang.diagnosticTextLabel}: ${diagnosticArtifactName(null, reportDiagnosticMirrorTextPath(sessionId))}`)
    }
    if (latestErrorText) {
      lines.push(
        `- ${lang.lastErrorLabel}: ${truncateText(
          latestErrorText,
          84
        )}`
      )
    }

    return lines
  }

  function summarizeDiagnosticSession(session) {
    const data = session || {}
    const lines = [
      `${commandTitleText(data)}`,
      "",
      ...compactDiagnosticLines(data, {
        includeHeading: false,
        includeRequestId: true,
        includePlanArtifact: true,
        includeApplyArtifact: true,
        includeFollowupArtifact: true,
        includeFollowupApplyArtifact: true,
        includeDiagnosticArtifacts: true
      }),
      `Started: ${noteText(data.startedAt)}`,
      `Updated: ${noteText(data.updatedAt)}`,
      `Root note: ${noteText(data.rootNoteId) || "(unknown)"}`,
      `Notebook: ${noteText(data.notebookId) || "(unknown)"}`,
      `Bridge: ${noteText(data.bridgeBaseUrl) || Addon.bridgeBaseUrl}`
    ]

    const counts = diagnosticCounts(data)
    const countKeys = Object.keys(counts)
    if (countKeys.length) {
      lines.push("", "Events:")
      countKeys.forEach(key => {
        lines.push(`- ${key}: ${counts[key]}`)
      })
    }

    const recentEvents = (data.events || []).slice(-8)
    if (recentEvents.length) {
      lines.push("", "Recent:")
      recentEvents.forEach(item => {
        lines.push(`- ${noteText(item.at)} | ${noteText(item.type)}`)
      })
    }

    return lines.join("\n")
  }

  function writeDiagnosticSession(session) {
    ensureBridgeDirs()
    const safeSession = sanitizeForJSON(session)
    const summaryText = summarizeDiagnosticSession(safeSession)
    const writeErrors = []
    let wroteAnyArtifact = false

    ;[
      {
        jsonPath: reportDiagnosticMirrorJsonPath(safeSession.sessionId),
        textPath: reportDiagnosticMirrorTextPath(safeSession.sessionId)
      },
      {
        jsonPath: reportDiagnosticLatestJsonPath(),
        textPath: reportDiagnosticLatestTextPath()
      },
      {
        jsonPath: diagnosticSessionJsonPath(safeSession.sessionId),
        textPath: diagnosticSessionTextPath(safeSession.sessionId)
      }
    ].forEach(target => {
      try {
        writeJSONFile(target.jsonPath, safeSession)
        writeTextFile(target.textPath, summaryText)
        wroteAnyArtifact = true
      } catch (error) {
        writeErrors.push(noteText(error && error.message ? error.message : error))
      }
    })

    if (!wroteAnyArtifact && writeErrors.length) {
      throw new Error(writeErrors[0])
    }
    return safeSession
  }

  function readDiagnosticSession(sessionId) {
    if (!sessionId) return null
    return (
      readJSONFromFile(diagnosticSessionJsonPath(sessionId)) ||
      readJSONFromFile(reportDiagnosticMirrorJsonPath(sessionId))
    )
  }

  function beginDiagnosticSession(seed) {
    const sessionId = `${Addon.key}-diag-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    const session = Object.assign(
      {
        sessionId: sessionId,
        command: Addon.title,
        bridgeBaseUrl: Addon.bridgeBaseUrl,
        startedAt: nowIso(),
        updatedAt: nowIso(),
        status: "running",
        rootNoteId: "",
        notebookId: "",
        events: [],
        metrics: {}
      },
      sanitizeForJSON(seed || {})
    )
    writeDiagnosticSession(session)
    return sessionId
  }

  function updateDiagnosticSession(sessionId, patch) {
    if (!sessionId) return null
    const current =
      readDiagnosticSession(sessionId) ||
      {
        sessionId: sessionId,
        command: Addon.title,
        bridgeBaseUrl: Addon.bridgeBaseUrl,
        startedAt: nowIso(),
        events: [],
        metrics: {}
      }
    const next = Object.assign({}, current, sanitizeForJSON(patch || {}), {
      updatedAt: nowIso()
    })
    if (!next.events) next.events = []
    if (!next.metrics) next.metrics = {}
    return writeDiagnosticSession(next)
  }

  function appendDiagnosticEvent(sessionId, type, payload) {
    if (!sessionId) return null
    const current = readDiagnosticSession(sessionId)
    const next = Object.assign(
      {
        sessionId: sessionId,
        command: Addon.title,
        bridgeBaseUrl: Addon.bridgeBaseUrl,
        startedAt: nowIso(),
        updatedAt: nowIso(),
        status: "running",
        events: [],
        metrics: {}
      },
      current || {}
    )
    if (!Array.isArray(next.events)) next.events = []
    next.events.push({
      at: nowIso(),
      type: noteText(type),
      payload: sanitizeForJSON(payload || {})
    })
    next.updatedAt = nowIso()
    return writeDiagnosticSession(next)
  }

  function collectFocusSource() {
    const notebook = notebookController()
    if (notebook && notebook.focusNote) {
      return {
        source: "notebook",
        note: notebook.focusNote
      }
    }
    const doc = currentDocumentController()
    if (doc && doc.focusNote) {
      return {
        source: "document",
        note: doc.focusNote
      }
    }
    return {
      source: "none",
      note: null
    }
  }

  function collectNoteCapabilitySnapshot(note) {
    if (!note) return null
    const anchor = branchGroupAnchor(note)
    const detachedContext = detachedGroupingCreateContext(note)
    const db = databaseModel()
    return {
      noteId: noteText(note.noteId),
      title: truncateText(noteText(note.noteTitle), 80),
      notebookId: noteText(note.notebookId),
      docMd5: noteText(note.docMd5),
      childCount: directChildNotes(note).length,
      commentCount: uniqueStrings(arrayFromObjC(note.commentsText)).length,
      hasCreateChildNote: typeof note.createChildNote === "function",
      hasCreateBrotherNote: typeof note.createBrotherNote === "function",
      hasAddChild: typeof note.addChild === "function",
      hasAddAsChildNote: typeof note.addAsChildNote === "function",
      hasAddAsBrotherNote: typeof note.addAsBrotherNote === "function",
      hasAppendTextComments: typeof note.appendTextComments === "function",
      hasAppendTextComment: typeof note.appendTextComment === "function",
      hasAppendMarkdownComment: typeof note.appendMarkdownComment === "function",
      hasAppendTags: typeof note.appendTags === "function",
      hasTidyupTags: typeof note.tidyupTags === "function",
      hasRemoveCommentByIndex: typeof note.removeCommentByIndex === "function",
      hasRemoveCommentByCondition: typeof note.removeCommentByCondition === "function",
      dbHasGetNotebookById: !!(db && typeof db.getNotebookById === "function"),
      dbHasGetDocumentById: !!(db && typeof db.getDocumentById === "function"),
      anchorNoteId: noteText(anchor && anchor.noteId),
      anchorHasCreateBrotherNote: !!(anchor && typeof anchor.createBrotherNote === "function"),
      anchorHasAddAsChildNote: !!(anchor && typeof anchor.addAsChildNote === "function"),
      supportsCommentRemoval: noteSupportsCommentRemoval(note),
      supportsBranchOrganization: noteSupportsBranchOrganization(note),
      canCreateGroupingChild: canCreateGroupingChild(note),
      canMoveExistingChild: canMoveExistingChild(note),
      canCreateDetachedGroupingChild: canCreateDetachedGroupingChild(note),
      detachedCreateContextReady: !!detachedContext,
      detachedCreateContextSource: noteText(detachedContext && detachedContext.source)
    }
  }

  function collectRuntimeSnapshot(origin, extra) {
    const focus = collectFocusSource()
    const currentDoc = currentDocumentController()
    const notebook = notebookController()
    return sanitizeForJSON(
      Object.assign(
        {
          kind: "runtime_snapshot",
          origin: origin,
          capturedAt: nowIso(),
          addon: Addon.name,
          bridgeBaseUrl: Addon.bridgeBaseUrl,
          app: {
            hasSharedInstance:
              typeof Application !== "undefined" &&
              !!Application &&
              typeof Application.sharedInstance === "function",
            hasShowHUD:
              !!app() &&
              typeof app().showHUD === "function",
            hasWaitHUDOnView:
              !!app() &&
              typeof app().waitHUDOnView === "function",
            hasStopWaitHUDOnView:
              !!app() &&
              typeof app().stopWaitHUDOnView === "function",
            hasAlert:
              !!app() &&
              typeof app().alert === "function",
            hasRefreshAfterDBChanged:
              !!app() &&
              typeof app().refreshAfterDBChanged === "function"
          },
          globals: {
            hasDatabaseSharedInstance:
              typeof Database !== "undefined" &&
              !!Database &&
              typeof Database.sharedInstance === "function",
            dbHasGetNotebookById:
              !!databaseModel() &&
              typeof databaseModel().getNotebookById === "function",
            dbHasGetDocumentById:
              !!databaseModel() &&
              typeof databaseModel().getDocumentById === "function",
            hasNoteCreateWithTitleNotebookDocument:
              typeof Note !== "undefined" &&
              !!Note &&
              typeof Note.createWithTitleNotebookDocument === "function",
            hasApplicationGetNoteBookById:
              typeof Application !== "undefined" &&
              !!Application &&
              typeof Application.getNoteBookById === "function",
            hasApplicationGetNotebookById:
              typeof Application !== "undefined" &&
              !!Application &&
              typeof Application.getNotebookById === "function",
            hasApplicationGetDocById:
              typeof Application !== "undefined" &&
              !!Application &&
              typeof Application.getDocById === "function",
            hasApplicationGetDocumentById:
              typeof Application !== "undefined" &&
              !!Application &&
              typeof Application.getDocumentById === "function"
          },
          controllers: {
            hasStudyController: !!self.studyController,
            studyMode:
              self.studyController && typeof self.studyController.studyMode !== "undefined"
                ? self.studyController.studyMode
                : null,
            hasNotebookController: !!notebook,
            hasReaderController: !!readerController(),
            hasCurrentDocumentController: !!currentDoc,
            notebookFocusNoteId: noteText(notebook && notebook.focusNote && notebook.focusNote.noteId),
            documentFocusNoteId: noteText(currentDoc && currentDoc.focusNote && currentDoc.focusNote.noteId)
          },
          focus: {
            source: focus.source,
            note: collectNoteCapabilitySnapshot(focus.note)
          }
        },
        extra || {}
      )
    )
  }

  function summarizeRuntimeSnapshot(snapshot) {
    const data = snapshot || {}
    const focus = data.focus || {}
    const note = focus.note || {}
    const lines = [
      `${lang.commandTitle}`,
      "",
      `Diagnostic kind: ${noteText(data.kind) || "runtime_snapshot"}`,
      `Origin: ${noteText(data.origin) || "unknown"}`,
      `Captured: ${noteText(data.capturedAt) || "unknown"}`,
      `Focus source: ${noteText(focus.source) || "none"}`,
      `Bridge: ${noteText(data.bridgeBaseUrl) || Addon.bridgeBaseUrl}`,
      `HUD wait support: ${data.app && data.app.hasWaitHUDOnView ? "1" : "0"}`,
      `HUD stop support: ${data.app && data.app.hasStopWaitHUDOnView ? "1" : "0"}`,
      `Global detached create: ${
        data.globals && data.globals.hasNoteCreateWithTitleNotebookDocument ? "1" : "0"
      }`
    ]

    if (note && note.noteId) {
      lines.push(
        `Focus note: ${note.noteId}`,
        `Comment removal: ${note.supportsCommentRemoval ? "1" : "0"}`,
        `Branch organization: ${note.supportsBranchOrganization ? "1" : "0"}`,
        `Create grouping: ${note.canCreateGroupingChild ? "1" : "0"}`,
        `Move child: ${note.canMoveExistingChild ? "1" : "0"}`,
        `Detached create ready: ${note.detachedCreateContextReady ? "1" : "0"}`
      )
      if (note.detachedCreateContextSource) {
        lines.push(`Detached source: ${note.detachedCreateContextSource}`)
      }
    }

    return lines.join("\n")
  }

  function writeRuntimeSnapshot(origin, extra) {
    ensureBridgeDirs()
    const snapshot = collectRuntimeSnapshot(origin, extra)
    const baseName = `${Addon.key}-runtime-${origin}-${Date.now()}`
    const jsonPath = `${bridgeDiagnosticsDir()}/${baseName}.json`
    const textPath = `${bridgeDiagnosticsDir()}/${baseName}-summary.txt`
    const latestJsonPath = `${bridgeDiagnosticsDir()}/${Addon.key}-runtime-latest.json`
    const latestTextPath = `${bridgeDiagnosticsDir()}/${Addon.key}-runtime-latest-summary.txt`
    const reportJsonPath = `${bridgeReportsDir()}/${baseName}.json`
    const reportTextPath = `${bridgeReportsDir()}/${baseName}-summary.txt`
    const reportLatestJsonPath = `${bridgeReportsDir()}/${Addon.key}-runtime-latest.json`
    const reportLatestTextPath = `${bridgeReportsDir()}/${Addon.key}-runtime-latest-summary.txt`
    const summaryText = summarizeRuntimeSnapshot(snapshot)

    const writeErrors = []
    let wroteAnyArtifact = false
    ;[
      { jsonPath: reportJsonPath, textPath: reportTextPath },
      { jsonPath: reportLatestJsonPath, textPath: reportLatestTextPath },
      { jsonPath: jsonPath, textPath: textPath },
      { jsonPath: latestJsonPath, textPath: latestTextPath }
    ].forEach(target => {
      try {
        writeJSONFile(target.jsonPath, snapshot)
        writeTextFile(target.textPath, summaryText)
        wroteAnyArtifact = true
      } catch (error) {
        writeErrors.push(noteText(error && error.message ? error.message : error))
      }
    })
    if (!wroteAnyArtifact && writeErrors.length) {
      throw new Error(writeErrors[0])
    }

    return {
      kind: "runtime_snapshot",
      origin: origin,
      jsonPath: jsonPath,
      textPath: textPath,
      latestJsonPath: latestJsonPath,
      latestTextPath: latestTextPath,
      reportJsonPath: reportJsonPath,
      reportTextPath: reportTextPath,
      reportLatestJsonPath: reportLatestJsonPath,
      reportLatestTextPath: reportLatestTextPath,
      capturedAt: snapshot.capturedAt,
      focusSource: snapshot.focus ? snapshot.focus.source : "none",
      focusNoteId:
        snapshot.focus && snapshot.focus.note ? noteText(snapshot.focus.note.noteId) : ""
    }
  }

  function collectBranch(rootNote) {
    const layoutIndex = collectMindMapNodeIndex()
    const seen = {}
    const nodes = []

    function walk(note) {
      if (!note || !note.noteId || seen[note.noteId]) return
      seen[note.noteId] = true

      const childNotes = arrayFromObjC(note.childNotes)
      nodes.push(enrichShapeContext({
        noteId: noteText(note.noteId),
        title: noteText(note.noteTitle),
        colorIndex:
          typeof note.colorIndex === "number" ? note.colorIndex : null,
        fillIndex:
          typeof note.fillIndex === "number" ? note.fillIndex : null,
        tags: uniqueStrings(arrayFromObjC(note.tags)),
        mainExcerptText: noteText(note.excerptText),
        allText: [noteText(note.noteTitle), noteText(note.excerptText), noteText(note.notesText)]
          .filter(Boolean)
          .join("\n"),
        commentsText: uniqueStrings(arrayFromObjC(note.commentsText)),
        childNoteIds: childNotes.map(child => noteText(child.noteId)).filter(Boolean),
        parentNoteId: note.parentNote ? noteText(note.parentNote.noteId) : null
      }, note, layoutIndex))

      childNotes.forEach(walk)
    }

    walk(rootNote)
    return {
      nodes: nodes,
      shapeSummary: summarizeBranchShape(nodes)
    }
  }

  function numericValue(value) {
    const number = Number(value)
    return Number.isFinite(number) ? Math.round(number * 100) / 100 : null
  }

  function frameSnapshot(frame) {
    if (!frame) return null
    const x = numericValue(frame.x != null ? frame.x : frame.origin && frame.origin.x)
    const y = numericValue(frame.y != null ? frame.y : frame.origin && frame.origin.y)
    const width = numericValue(
      frame.width != null ? frame.width : frame.size && frame.size.width
    )
    const height = numericValue(
      frame.height != null ? frame.height : frame.size && frame.size.height
    )
    if (x === null && y === null && width === null && height === null) return null
    return {
      x: x,
      y: y,
      width: width,
      height: height
    }
  }

  function walkMindMapNodes(list, visit, depth, seen) {
    arrayFromObjC(list).forEach(node => {
      const noteId = noteText(node && node.note && node.note.noteId)
      if (!noteId || seen[noteId]) return
      seen[noteId] = true
      visit(node, depth || 0)
      walkMindMapNodes(node && node.childNodes, visit, (depth || 0) + 1, seen)
    })
  }

  function collectMindMapNodeIndex() {
    const controller = notebookController()
    const view = controller && controller.mindmapView ? controller.mindmapView : null
    const index = {}
    const seen = {}
    if (!view) return index

    walkMindMapNodes(view.mindmapNodes, (node, depth) => {
      const note = node && node.note ? node.note : null
      const noteId = noteText(note && note.noteId)
      if (!noteId) return
      index[noteId] = {
        depth: depth,
        frame: frameSnapshot(node && node.frame),
        parentNoteId: noteText(
          node && node.parentNode && node.parentNode.note
            ? node.parentNode.note.noteId
            : note && note.parentNote
              ? note.parentNote.noteId
              : ""
        ),
        childNoteIds: uniqueStrings(
          arrayFromObjC(node && node.childNodes).map(child =>
            noteText(child && child.note ? child.note.noteId : "")
          )
        )
      }
    }, 0, seen)

    return index
  }

  function enrichShapeContext(base, note, layoutIndex) {
    const noteId = noteText(base && base.noteId)
    const layout = layoutIndex && noteId ? layoutIndex[noteId] : null
    return Object.assign({}, base, {
      visualFrame: layout && layout.frame ? layout.frame : null,
      visualDepth:
        layout && typeof layout.depth === "number" ? layout.depth : null,
      visibleInMindMap: !!(layout && layout.frame),
      branchClosed: !!Number(note && note.mindmapBranchClose),
      zLevel: numericValue(note && note.zLevel),
      hidden: !!(note && note.hidden),
      groupMode:
        note && note.groupMode !== undefined && note.groupMode !== null
          ? String(note.groupMode)
          : ""
    })
  }

  function summarizeBranchShape(nodes) {
    const items = Array.isArray(nodes) ? nodes : []
    const frames = items.map(node => node && node.visualFrame).filter(Boolean)
    const xValues = []
    const yValues = []
    frames.forEach(frame => {
      if (frame.x !== null) xValues.push(frame.x)
      if (frame.y !== null) yValues.push(frame.y)
      if (frame.x !== null && frame.width !== null) xValues.push(frame.x + frame.width)
      if (frame.y !== null && frame.height !== null) yValues.push(frame.y + frame.height)
    })

    return {
      captured: !!frames.length,
      branchNodeCount: items.length,
      visibleNodeCount: items.filter(node => node && node.visibleInMindMap).length,
      collapsedBranchCount: items.filter(node => node && node.branchClosed).length,
      hiddenNodeCount: items.filter(node => node && node.hidden).length,
      maxVisibleDepth: items.reduce((max, node) => {
        const depth = node && typeof node.visualDepth === "number" ? node.visualDepth : -1
        return depth > max ? depth : max
      }, -1),
      horizontalSpan:
        xValues.length >= 2 ? numericValue(Math.max.apply(null, xValues) - Math.min.apply(null, xValues)) : null,
      verticalSpan:
        yValues.length >= 2 ? numericValue(Math.max.apply(null, yValues) - Math.min.apply(null, yValues)) : null
    }
  }

  function stringifyJSON(obj) {
    const data = NSJSONSerialization.dataWithJSONObjectOptions(
      obj,
      JSON_PRETTY_PRINTED
    )
    return NSString.alloc().initWithDataEncoding(data, UTF8_ENCODING)
  }

  function writeJSONFile(path, obj) {
    const text = JSON.stringify(obj, null, 2)
    const data = NSData.dataWithStringEncoding(text, UTF8_ENCODING)
    data.writeToFileAtomically(path, true)
    return path
  }

  function readJSONFromFile(path) {
    const data = NSData.dataWithContentsOfFile(path)
    if (!data) return null
    return NSJSONSerialization.JSONObjectWithDataOptions(
      data,
      JSON_MUTABLE_CONTAINERS
    )
  }

  function readJSONFromURL(url) {
    const data = NSData.dataWithContentsOfURL(NSURL.URLWithString(encodeURI(url)))
    if (!data) return null
    return NSJSONSerialization.JSONObjectWithDataOptions(
      data,
      JSON_MUTABLE_CONTAINERS
    )
  }

  function summarizePlan(plan) {
    const affected = {}
    const typeCounts = {}
    ;(plan.actions || []).forEach(action => {
      affected[action.noteId] = true
      typeCounts[action.type] = (typeCounts[action.type] || 0) + 1
    })
    const lines = [
      `${commandTitleText(plan)}`,
      "",
      `${lang.helperShellNotice}`
    ]

    const strategyBlocks = strategyPackBlocks(plan)
    if (strategyBlocks.length) {
      strategyBlocks.forEach(block => {
        lines.push("", block)
      })
    }

    lines.push(
      "",
      `Actions: ${(plan.actions || []).length}`,
      `Affected notes: ${Object.keys(affected).length}`,
      `Warnings: ${(plan.notes || []).length}`,
      `Unsupported: ${(plan.unsupportedActions || []).length}`
    )

    const countKeys = Object.keys(typeCounts)
    if (countKeys.length) {
      lines.push("", `${lang.summaryCounts}:`)
      countKeys.forEach(key => {
        lines.push(`- ${key}: ${typeCounts[key]}`)
      })
    }

    const dispositionLines = executionDispositionLines(plan)
    if (dispositionLines.length) {
      lines.push("", `${lang.executionLabel}:`)
      dispositionLines.forEach(line => lines.push(line))
    }

    const phaseLines = actionPhaseLines(plan)
    if (phaseLines.length) {
      lines.push("", `${lang.phaseLabel}:`)
      phaseLines.forEach(line => lines.push(line))
    }

    const previewItems = (plan.actions || []).slice(0, 8)
    if (previewItems.length) {
      lines.push("", "Preview:")
      previewItems.forEach(action => {
        lines.push(`- ${action.type} -> ${action.noteId}`)
      })
    }

    if ((plan.unsupportedActions || []).length) {
      lines.push("", "Unsupported:")
      plan.unsupportedActions.forEach(action => {
        const detail = unsupportedActionSummary(action)
        lines.push(detail ? `- ${action.type}: ${detail}` : `- ${action.type}`)
      })
    }

    const statusLines = primaryPlanStatusLines(plan)
    if (statusLines.length) {
      lines.push("", ...statusLines)
    }

    const shapeLines = planShapeSummaryLines(plan)
    if (shapeLines.length) {
      lines.push("", `${lang.shapeLabel}:`)
      shapeLines.forEach(line => lines.push(line))
    }

    return lines.join("\n")
  }

  function shortPlanSummary(plan, artifactInfo) {
    const affected = {}
    const typeCounts = {}
    ;(plan.actions || []).forEach(action => {
      affected[action.noteId] = true
      typeCounts[action.type] = (typeCounts[action.type] || 0) + 1
    })

    const lines = [
      `${commandTitleText(plan)}`,
      ""
    ]

    const strategyBlocks = strategyPackBlocks(plan)
    if (strategyBlocks.length) {
      strategyBlocks.forEach(block => {
        lines.push(block, "")
      })
    }

    lines.push(
      `Actions: ${(plan.actions || []).length}`,
      `Affected notes: ${Object.keys(affected).length}`,
      `Warnings: ${(plan.notes || []).length}`,
      `Unsupported: ${(plan.unsupportedActions || []).length}`
    )

    const countKeys = Object.keys(typeCounts)
    if (countKeys.length) {
      lines.push("", `${lang.summaryCounts}:`)
      countKeys.slice(0, 4).forEach(key => {
        lines.push(`- ${key}: ${typeCounts[key]}`)
      })
    }

    const dispositionLines = executionDispositionLines(plan)
    if (dispositionLines.length) {
      lines.push("", `${lang.executionLabel}:`)
      dispositionLines.forEach(line => lines.push(line))
    }

    const phaseLines = actionPhaseLines(plan)
    if (phaseLines.length) {
      lines.push("", `${lang.phaseLabel}:`)
      phaseLines.forEach(line => lines.push(line))
    }

    if (artifactInfo) {
      lines.push("")
      lines.push(lang.summarySaved)
      lines.push(`${lang.summaryFolder}: ${artifactInfo.dir}`)
      lines.push(`${lang.summaryJson}: ${artifactInfo.jsonName}`)
      lines.push(`${lang.summaryText}: ${artifactInfo.textName}`)
    }

    const statusLines = primaryPlanStatusLines(plan)
    if (statusLines.length) {
      lines.push("")
      statusLines.forEach(line => lines.push(line))
    }

    const shapeLines = planShapeSummaryLines(plan)
    if (shapeLines.length) {
      lines.push("")
      lines.push(`${lang.shapeLabel}:`)
      shapeLines.forEach(line => lines.push(line))
    }

    lines.push("")
    lines.push(lang.summaryNext)
    return lines.join("\n")
  }

  function actionNoteOrder(plan, nodes) {
    const order = []
    const seen = {}
    const actionMap = {}

    ;(plan.actions || []).forEach(action => {
      actionMap[action.noteId] = true
    })

    ;(nodes || []).forEach(node => {
      const noteId = noteText(node.noteId)
      if (!noteId || !actionMap[noteId] || seen[noteId]) return
      seen[noteId] = true
      order.push(noteId)
    })

    ;(plan.actions || []).forEach(action => {
      const noteId = noteText(action.noteId)
      if (!noteId || seen[noteId]) return
      seen[noteId] = true
      order.push(noteId)
    })

    return order
  }

  function formatActionPreview(action, node) {
    const lines = []

    if (action.type === "set_title") {
      lines.push(
        `- ${lang.titleActionLabel}: ${truncateText(node && node.title, 28) || lang.emptyValue} -> ${truncateText(
          action.title,
          28
        )}`
      )
    } else if (action.type === "set_color_index") {
      const currentColor =
        node && typeof node.colorIndex === "number" ? node.colorIndex : "?"
      lines.push(`- ${lang.colorActionLabel}: ${currentColor} -> ${action.colorIndex}`)
      if (action.visualRole) {
        lines.push(`  ${lang.roleLabel}: ${localizeTopicLabel(action.visualRole)}`)
      }
      if (typeof action.visualSalience === "number") {
        lines.push(`  ${lang.priorityLabel}: ${action.visualSalience}`)
      }
    } else if (action.type === "rewrite_excerpt") {
      lines.push(
        `- ${
          isBranchOverviewAction(action)
            ? lang.branchOverviewActionLabel
            : lang.excerptActionLabel
        }: ${truncateText(action.text, 42)}`
      )
    } else if (action.type === "append_tags") {
      lines.push(`- ${lang.tagsActionLabel}: +${uniqueStrings(action.tags).join(", ")}`)
    } else if (action.type === "append_comment") {
      lines.push(`- ${lang.commentActionLabel}: +${truncateText(action.comment, 42)}`)
    } else if (action.type === "remove_comments_by_text") {
      lines.push(
        `- ${lang.removeCommentActionLabel}: ${((action.comments && action.comments.length) || 0)}`
      )
    } else if (action.type === "organize_branch_groups") {
      const groupSummary = ((action.groups && action.groups.length) ? action.groups : [])
        .slice(0, 3)
        .map(group => `${group.label} (${((group.noteIds && group.noteIds.length) || group.count || 0)})`)
        .join(" / ")
      lines.push(`- ${lang.organizeBranchActionLabel}: ${truncateText(groupSummary, 42) || action.type}`)
    } else {
      lines.push(`- ${action.type}`)
    }

    if (action.reason) {
      lines.push(`  ${lang.reasonLabel}: ${truncateText(action.reason, 72)}`)
    }
    if (action.meta && action.meta.source) {
      lines.push(`  ${lang.sourceLabel}: ${truncateText(action.meta.source, 36)}`)
    }
    if (action.meta && typeof action.meta.confidence === "number") {
      lines.push(`  ${lang.confidenceLabel}: ${Math.round(action.meta.confidence * 100)}%`)
    }
    if (action.execution && action.execution.disposition) {
      lines.push(`  ${lang.executionLabel}: ${executionDispositionLabel(action.execution.disposition)}`)
    }
    if (action.phase) {
      lines.push(`  ${lang.phaseLabel}: ${actionPhaseLabel(action.phase)}`)
    }
    const evidence = action && action.meta && Array.isArray(action.meta.evidence)
      ? action.meta.evidence.filter(Boolean).slice(0, 2)
      : []
    if (evidence.length) {
      lines.push(`  ${lang.evidenceLabel}: ${truncateText(evidence[0], 72)}`)
      evidence.slice(1).forEach(item => {
        lines.push(`    - ${truncateText(item, 72)}`)
      })
    }

    return lines.join("\n")
  }

  function buildNotePreviewBlocks(plan, nodes) {
    const nodeMap = {}
    ;(nodes || []).forEach(node => {
      nodeMap[noteText(node.noteId)] = node
    })

    const grouped = {}
    ;(plan.actions || []).forEach(action => {
      const noteId = noteText(action.noteId)
      if (!grouped[noteId]) grouped[noteId] = []
      grouped[noteId].push(action)
    })

    return actionNoteOrder(plan, nodes).map(noteId => {
      const node = nodeMap[noteId] || {}
      const title = truncateText(node.title, 28) || `(${lang.noteLabel} ${noteId.slice(-6)})`
      const lines = [`${title}`, `${lang.idLabel}: ${noteId}`]

      ;(grouped[noteId] || []).forEach(action => {
        lines.push(formatActionPreview(action, node))
      })

      return lines.join("\n")
    })
  }

  function buildNoteReviewEntries(plan, nodes) {
    const nodeMap = {}
    ;(nodes || []).forEach(node => {
      nodeMap[noteText(node.noteId)] = node
    })

    const grouped = {}
    ;(plan.actions || []).forEach(action => {
      const noteId = noteText(action.noteId)
      if (!grouped[noteId]) grouped[noteId] = []
      grouped[noteId].push(action)
    })

    return actionNoteOrder(plan, nodes).map(noteId => {
      const node = nodeMap[noteId] || {}
      const title = truncateText(node.title, 28) || `(${lang.noteLabel} ${noteId.slice(-6)})`
      const lines = [`${title}`, `${lang.idLabel}: ${noteId}`]

      ;(grouped[noteId] || []).forEach(action => {
        lines.push(formatActionPreview(action, node))
      })

      return {
        noteId: noteId,
        title: title,
        text: lines.join("\n"),
        actions: grouped[noteId] || [],
        selected: true
      }
    })
  }

  function isBranchOverviewAction(action) {
    return (
      action &&
      action.type === "rewrite_excerpt" &&
      noteText(action && action.meta ? action.meta.source : "") === "branch_structure_digest"
    )
  }

  function strategyPackVisibleActionSummary(pack) {
    const counts = pack && pack.visibleActionCounts ? pack.visibleActionCounts : {}
    const parts = []
    if (counts.set_color_index) {
      parts.push(`${lang.colorActionLabel}: ${counts.set_color_index}`)
    }
    if (counts.organize_branch_groups) {
      parts.push(`${lang.organizeBranchActionLabel}: ${counts.organize_branch_groups}`)
    }
    if (counts.rewrite_excerpt) {
      parts.push(`${lang.branchOverviewActionLabel}: ${counts.rewrite_excerpt}`)
    }
    return parts.join(" / ")
  }

  function strategyPackType(pack) {
    return noteText(pack && pack.type)
  }

  function strategyPackBlocks(plan) {
    const packs = Array.isArray(plan && plan.strategyPacks) ? plan.strategyPacks : []
    return packs.map(pack => {
      const lines = [`${lang.strategyLabel}:`]
      if (pack.summary) {
        lines.push(`- ${lang.strategySummaryLabel}: ${truncateText(pack.summary, 140)}`)
      }
      if (pack.reason) {
        lines.push(`- ${lang.reasonLabel}: ${truncateText(pack.reason, 140)}`)
      }
      const visibleSummary = strategyPackVisibleActionSummary(pack)
      if (visibleSummary) {
        lines.push(`- ${lang.visibleActionSummaryLabel}: ${visibleSummary}`)
      }
      if (
        typeof pack.deferredSemanticCount === "number" &&
        pack.deferredSemanticCount > 0
      ) {
        lines.push(`- ${lang.semanticDeferredLabel}: ${pack.deferredSemanticCount}`)
      }
      if (typeof pack.deferredVisualCount === "number" && pack.deferredVisualCount > 0) {
        lines.push(`- ${lang.visualDeferredLabel}: ${pack.deferredVisualCount}`)
      }
      if (pack.executionDisposition) {
        lines.push(`- ${lang.executionLabel}: ${executionDispositionLabel(pack.executionDisposition)}`)
      }
      const evidence = Array.isArray(pack.shapeEvidence)
        ? pack.shapeEvidence.filter(Boolean).slice(0, 2)
        : []
      if (evidence.length) {
        lines.push(`- ${lang.evidenceLabel}: ${truncateText(evidence[0], 110)}`)
        evidence.slice(1).forEach(item => {
          lines.push(`  - ${truncateText(item, 110)}`)
        })
      }
      lines.push(`- ${lang.previewPolicyLabel}: ${lang.conservativePreviewPolicy}`)
      return lines.join("\n")
    })
  }

  function buildMetaPreviewBlocks(plan) {
    const blocks = []

    if ((plan.notes || []).length) {
      const warningLines = [`${lang.warningsLabel}:`]
      ;(plan.notes || []).slice(0, 8).forEach(item => {
        const noteSuffix = item.noteId ? ` [${String(item.noteId).slice(-6)}]` : ""
        warningLines.push(`- ${truncateText(item.message || item.type, 56)}${noteSuffix}`)
      })
      if ((plan.notes || []).length > 8) {
        warningLines.push(`- ... +${plan.notes.length - 8}`)
      }
      blocks.push(warningLines.join("\n"))
    }

    if ((plan.unsupportedActions || []).length) {
      const unsupportedLines = [`${lang.unsupportedLabel}:`]
      ;(plan.unsupportedActions || []).slice(0, 8).forEach(item => {
        const header = truncateText(item.type, 24)
        const detail = truncateText(unsupportedActionDetail(item), 140)
        unsupportedLines.push(detail ? `- ${header}: ${detail}` : `- ${header}`)
      })
      if ((plan.unsupportedActions || []).length > 8) {
        unsupportedLines.push(`- ... +${plan.unsupportedActions.length - 8}`)
      }
      blocks.push(unsupportedLines.join("\n"))
    }

    return blocks
  }

  function paginatePreviewBlocks(intro, blocks) {
    const pages = []
    let current = intro
    let blockCount = 0
    const maxChars = 1450
    const maxBlocks = 4

    ;(blocks || []).forEach(block => {
      const next = `${current}\n\n${block}`
      if (blockCount >= maxBlocks || next.length > maxChars) {
        pages.push(current)
        current = block
        blockCount = 1
        return
      }
      current = next
      blockCount += 1
    })

    if (current) {
      pages.push(current)
    }

    return pages.filter(Boolean)
  }

  function unsupportedActionSummary(item) {
    if (!item) return ""

    const summary = truncateText(item.summary, 84)
    if (summary) return summary

    if (item.groups && item.groups.length) {
      return truncateText(
        item.groups
          .slice(0, 3)
          .map(group => `${group.label} (${group.count})`)
          .join(" / "),
        84
      )
    }

    if (item.proposals && item.proposals.length) {
      return truncateText(
        item.proposals
          .slice(0, 3)
          .map(proposal => proposal.suggestedTitle || proposal.basis || proposal.noteId)
          .join(" / "),
        84
      )
    }

    return truncateText(item.reason || item.noteId || "", 84)
  }

  function unsupportedActionDetail(item) {
    const lines = []
    const summary = unsupportedActionSummary(item)
    if (summary) {
      lines.push(summary)
    }
    if (item && item.meta && item.meta.source) {
      lines.push(`${lang.sourceLabel}: ${truncateText(item.meta.source, 36)}`)
    }
    if (item && item.meta && typeof item.meta.confidence === "number") {
      lines.push(`${lang.confidenceLabel}: ${Math.round(item.meta.confidence * 100)}%`)
    }
    return lines.join("\n")
  }

  function buildDetailedPreviewPages(plan, nodes, artifactInfo) {
    const affected = {}
    const typeCounts = {}
    ;(plan.actions || []).forEach(action => {
      affected[action.noteId] = true
      typeCounts[action.type] = (typeCounts[action.type] || 0) + 1
    })

    const introLines = [
      `${commandTitleText(plan)}`,
      "",
      `${lang.summaryFolder}: ${artifactInfo.dir}`,
      `${lang.summaryJson}: ${artifactInfo.jsonName}`,
      `${lang.summaryText}: ${artifactInfo.textName}`
    ]

    const strategyBlocks = strategyPackBlocks(plan)
    if (strategyBlocks.length) {
      strategyBlocks.forEach(block => {
        introLines.push("", block)
      })
    }

    introLines.push(
      "",
      `Actions: ${(plan.actions || []).length}`,
      `Affected notes: ${Object.keys(affected).length}`,
      `Warnings: ${(plan.notes || []).length}`,
      `Unsupported: ${(plan.unsupportedActions || []).length}`
    )

    const countKeys = Object.keys(typeCounts)
    if (countKeys.length) {
      introLines.push("", `${lang.summaryCounts}:`)
      countKeys.forEach(key => {
        introLines.push(`- ${key}: ${typeCounts[key]}`)
      })
    } else {
      introLines.push("", lang.noActionsPlanned)
    }

    const statusLines = primaryPlanStatusLines(plan)
    if (statusLines.length) {
      introLines.push("", ...statusLines)
    }

    const shapeLines = planShapeSummaryLines(plan)
    if (shapeLines.length) {
      introLines.push("", `${lang.shapeLabel}:`)
      shapeLines.forEach(line => introLines.push(line))
    }

    introLines.push("", lang.previewCancelHint)

    const blocks = buildNotePreviewBlocks(plan, nodes).concat(buildMetaPreviewBlocks(plan))
    return paginatePreviewBlocks(introLines.join("\n"), blocks)
  }

  function currentDiagnosticLines(sessionId, options) {
    const session = readDiagnosticSession(sessionId)
    if (!session) return []
    return compactDiagnosticLines(session, options)
  }

  function selectedCounts(entries) {
    const noteCount = entries.filter(entry => entry.selected).length
    const actionCount = entries.reduce(
      (total, entry) => total + (entry.selected ? entry.actions.length : 0),
      0
    )
    return {
      noteCount: noteCount,
      actionCount: actionCount
    }
  }

  function buildSelectionSummaryPage(plan, artifactInfo, entries, sessionId) {
    const affected = {}
    const typeCounts = {}
    ;(plan.actions || []).forEach(action => {
      affected[action.noteId] = true
      typeCounts[action.type] = (typeCounts[action.type] || 0) + 1
    })
    const counts = selectedCounts(entries)

    const lines = [
      `${commandTitleText(plan)}`,
      "",
      `${lang.summaryFolder}: ${artifactInfo.dir}`,
      `${lang.summaryJson}: ${artifactInfo.jsonName}`,
      `${lang.summaryText}: ${artifactInfo.textName}`
    ]

    const strategyBlocks = strategyPackBlocks(plan)
    if (strategyBlocks.length) {
      strategyBlocks.forEach(block => {
        lines.push("", block)
      })
    }

    lines.push(
      "",
      `Actions: ${(plan.actions || []).length}`,
      `Affected notes: ${Object.keys(affected).length}`,
      `${lang.selectedNotesLabel}: ${counts.noteCount}`,
      `${lang.selectedActionsLabel}: ${counts.actionCount}`,
      `Warnings: ${(plan.notes || []).length}`,
      `Unsupported: ${(plan.unsupportedActions || []).length}`
    )

    const countKeys = Object.keys(typeCounts)
    if (countKeys.length) {
      lines.push("", `${lang.summaryCounts}:`)
      countKeys.forEach(key => {
        lines.push(`- ${key}: ${typeCounts[key]}`)
      })
    } else {
      lines.push("", lang.noActionsPlanned)
    }

    const dispositionLines = executionDispositionLines(plan)
    if (dispositionLines.length) {
      lines.push("", `${lang.executionLabel}:`)
      dispositionLines.forEach(line => lines.push(line))
    }

    const phaseLines = actionPhaseLines(plan)
    if (phaseLines.length) {
      lines.push("", `${lang.phaseLabel}:`)
      phaseLines.forEach(line => lines.push(line))
    }

    const statusLines = primaryPlanStatusLines(plan)
    if (statusLines.length) {
      lines.push("")
      statusLines.forEach(line => lines.push(line))
    }

    const shapeLines = planShapeSummaryLines(plan)
    if (shapeLines.length) {
      lines.push("")
      lines.push(`${lang.shapeLabel}:`)
      shapeLines.forEach(line => lines.push(line))
    }

    const metaBlocks = buildMetaPreviewBlocks(plan)
    if (metaBlocks.length) {
      metaBlocks.forEach(block => {
        lines.push("", block)
      })
    }

    const diagnosticLines = currentDiagnosticLines(sessionId, {
      includeHeading: true,
      includeRequestId: true,
      includePlanArtifact: true,
      includeDiagnosticArtifacts: true
    })
    if (diagnosticLines.length) {
      lines.push("")
      diagnosticLines.forEach(line => lines.push(line))
    }

    lines.push("", lang.selectionHint)
    lines.push(lang.previewCancelHint)
    return lines.join("\n")
  }

  function buildNoteSelectionPage(entry, pageIndex, totalPages) {
    return [
      `${entry.text}`,
      "",
      `${lang.selectionStatusLabel}: ${entry.selected ? lang.selectedState : lang.excludedState}`,
      `${lang.pageLabel}: ${pageIndex}/${totalPages}`
    ].join("\n")
  }

  function filterPlanBySelectedEntries(plan, entries) {
    const selectedNotes = {}
    entries.forEach(entry => {
      if (entry.selected) {
        selectedNotes[entry.noteId] = true
      }
    })

    const selectedActions = (plan.actions || []).filter(action => selectedNotes[action.noteId])
    const stats = summarizeExecutionStats(selectedActions)

    return Object.assign({}, plan, stats, {
      actions: selectedActions,
      strategyPacks: synchronizeStrategyPacks(plan, selectedActions)
    })
  }

  function synchronizeStrategyPacks(plan, actions) {
    const packs = Array.isArray(plan && plan.strategyPacks) ? plan.strategyPacks : []
    if (!packs.length) return []
    const originalActions = Array.isArray(plan && plan.actions) ? plan.actions : []
    const originalActionCount = originalActions.length

    const actionKeys = {}
    ;(actions || []).forEach(action => {
      const key = noteText(action && action.actionKey)
      if (key) actionKeys[key] = true
    })

    return packs
      .map(pack => {
        if (strategyPackType(pack) === "branch_already_organized_strategy") {
          return originalActionCount === 0 ? Object.assign({}, pack) : null
        }
        const keptActionKeys = (pack.actionKeys || []).filter(key => actionKeys[noteText(key)])
        if (!keptActionKeys.length) return null
        const visibleActionCounts = {
          set_color_index: 0,
          organize_branch_groups: 0,
          rewrite_excerpt: 0
        }
        ;(actions || []).forEach(action => {
          if (!actionKeys[noteText(action && action.actionKey)]) return
          if (keptActionKeys.indexOf(noteText(action && action.actionKey)) < 0) return
          if (action.type === "set_color_index") {
            visibleActionCounts.set_color_index += 1
          } else if (action.type === "organize_branch_groups") {
            visibleActionCounts.organize_branch_groups += 1
          } else if (
            action.type === "rewrite_excerpt" &&
            noteText(action && action.meta ? action.meta.source : "") === "branch_structure_digest"
          ) {
            visibleActionCounts.rewrite_excerpt += 1
          }
        })
        return Object.assign({}, pack, {
          actionKeys: keptActionKeys,
          visibleActionCounts: visibleActionCounts
        })
      })
      .filter(Boolean)
  }

  function summarizeExecutionStats(actions) {
    const items = Array.isArray(actions) ? actions : []
    const dispositionCounts = {
      safe_auto: 0,
      review_required: 0,
      suggest_only: 0
    }
    const phaseCounts = {
      cleanup: 0,
      normalize: 0,
      enrich: 0
    }
    items.forEach(action => {
      const key =
        action && action.execution && action.execution.disposition
          ? action.execution.disposition
          : "review_required"
      dispositionCounts[key] = (dispositionCounts[key] || 0) + 1
      const phaseKey = action && action.phase ? action.phase : "enrich"
      phaseCounts[phaseKey] = (phaseCounts[phaseKey] || 0) + 1
    })

    return {
      actionCount: items.length,
      actionDispositionCounts: dispositionCounts,
      actionPhaseCounts: phaseCounts
    }
  }

  function noteSupportsCommentRemoval(note) {
    if (!note) return false
    if (typeof note.removeCommentByIndex === "function") return true
    if (typeof note.removeCommentByCondition === "function") return true
    return false
  }

  function canExecuteActionInCurrentShell(action) {
    if (
      !action ||
      (action.type !== "remove_comments_by_text" && action.type !== "organize_branch_groups")
    ) {
      return {
        supported: true,
        reason: "",
        apiPath: ""
      }
    }

    const note = Database.sharedInstance().getNoteById(action.noteId)
    if (!note) {
      return {
        supported: true,
        reason: "",
        apiPath: "getNoteById",
        detail: null
      }
    }

    if (action.type === "remove_comments_by_text" && noteSupportsCommentRemoval(note)) {
      return {
        supported: true,
        reason: "",
        apiPath: "remove_comment_supported",
        detail: null
      }
    }

    if (action.type === "organize_branch_groups" && noteSupportsBranchOrganization(note)) {
      return {
        supported: true,
        reason: "",
        apiPath: "branch_group_supported",
        detail: null
      }
    }

    const anchor = branchGroupAnchor(note)
    const createCap = canCreateGroupingChild(note)
    const moveCap = canMoveExistingChild(note)
    const detachedCreateContext = detachedGroupingCreateContext(note)
    const detail =
      action.type === "organize_branch_groups"
        ? {
            createGroupingChild: createCap,
            moveExistingChild: moveCap,
            rootHasCreateChildNote: typeof note.createChildNote === "function",
            rootHasAddChild: typeof note.addChild === "function",
            rootHasNotebookId: !!noteText(note.notebookId),
            rootHasDocMd5: !!noteText(note.docMd5),
            anchorNoteId: anchor ? noteText(anchor.noteId) : "",
            anchorHasCreateBrotherNote: !!(
              anchor && typeof anchor.createBrotherNote === "function"
            ),
            anchorHasAddAsChildNote: !!(
              anchor && typeof anchor.addAsChildNote === "function"
            ),
            globalHasDetachedCreate:
              typeof Note !== "undefined" &&
              !!Note &&
              typeof Note.createWithTitleNotebookDocument === "function",
            dbHasGetNotebookById:
              !!databaseModel() &&
              typeof databaseModel().getNotebookById === "function",
            dbHasGetDocumentById:
              !!databaseModel() &&
              typeof databaseModel().getDocumentById === "function",
            applicationHasGetNotebookById:
              typeof Application !== "undefined" &&
              !!Application &&
              typeof Application.getNotebookById === "function",
            applicationHasGetNoteBookById:
              typeof Application !== "undefined" &&
              !!Application &&
              typeof Application.getNoteBookById === "function",
            applicationHasGetDocumentById:
              typeof Application !== "undefined" &&
              !!Application &&
              typeof Application.getDocumentById === "function",
            applicationHasGetDocById:
              typeof Application !== "undefined" &&
              !!Application &&
              typeof Application.getDocById === "function",
            detachedCreateContextReady: !!detachedCreateContext,
            detachedCreateContextSource: noteText(
              detachedCreateContext && detachedCreateContext.source
            )
          }
        : null

    return {
      supported: false,
      reason:
        action.type === "organize_branch_groups"
          ? "helper_shell_structure_blocked"
          : "helper_shell_capability_blocked",
      apiPath:
        action.type === "organize_branch_groups"
          ? `branch_group_unavailable_preflight:create_${createCap ? 1 : 0}_move_${moveCap ? 1 : 0}`
          : "remove_comment_unavailable_preflight",
      detail: detail
    }
  }

  function buildApplyablePlanForCurrentShell(plan) {
    const applyableActions = []
    const helperBlockedActions = []

    ;(plan.actions || []).forEach(action => {
      const capability = canExecuteActionInCurrentShell(action)
      if (capability.supported) {
        applyableActions.push(action)
        return
      }

      helperBlockedActions.push({
        type: action.type,
        noteId: action.noteId,
        planReason: noteText(action.reason),
        planSource: noteText(action && action.meta ? action.meta.source : ""),
        planConfidence:
          action && action.meta && typeof action.meta.confidence === "number"
            ? action.meta.confidence
            : null,
        executionDisposition:
          action && action.execution && action.execution.disposition
            ? action.execution.disposition
            : "review_required",
        actionPhase: action && action.phase ? action.phase : "enrich",
        reason: capability.reason,
        apiPath: capability.apiPath,
        capabilityDetail: capability.detail || null
      })
    })

    const stats = summarizeExecutionStats(applyableActions)

    return Object.assign({}, plan, stats, {
      originalActionCount:
        typeof plan.originalActionCount === "number"
          ? plan.originalActionCount
          : (plan.actions || []).length,
      actions: applyableActions,
      helperBlockedActions: helperBlockedActions
    })
  }

  function buildBlockedExecution(plan, rootNote) {
    const helperBlockedActions = Array.isArray(plan.helperBlockedActions)
      ? plan.helperBlockedActions
      : []
    const noteIds = uniqueStrings(helperBlockedActions.map(action => noteText(action.noteId)))
    const beforeBranch = snapshotBranchStateByNoteIds(noteIds)
    const execution = {
      command: commandTitleText(plan, Addon.title),
      objective: noteText(plan && plan.objective) || Addon.title,
      origin: noteText(plan && plan.origin) || "",
      rootNoteId: noteText(rootNote && rootNote.noteId),
      notebookId: noteText(rootNote && rootNote.notebookId),
      noteIds: noteIds,
      plannedActionCount:
        typeof plan.originalActionCount === "number"
          ? plan.originalActionCount
          : helperBlockedActions.length,
      actionCount: 0,
      helperBlockedActions: helperBlockedActions,
      appliedAt: new Date().toISOString(),
      beforeBranch: beforeBranch,
      results: [],
      refresh: { ok: true, skipped: true, reason: "no_executable_actions" }
    }
    execution.afterBranch = beforeBranch
    execution.branchDiff = buildBranchDiff(beforeBranch, beforeBranch)
    execution.halted = null
    return execution
  }

  function executionDispositionLabel(disposition) {
    if (disposition === "safe_auto") return lang.safeAutoLabel
    if (disposition === "suggest_only") return lang.suggestOnlyLabel
    return lang.reviewRequiredLabel
  }

  function executionDispositionLines(plan) {
    const counts = plan && plan.actionDispositionCounts ? plan.actionDispositionCounts : null
    if (!counts) return []

    const lines = []
    if (counts.safe_auto) {
      lines.push(`- ${lang.safeAutoLabel}: ${counts.safe_auto}`)
    }
    if (counts.review_required) {
      lines.push(`- ${lang.reviewRequiredLabel}: ${counts.review_required}`)
    }
    if (counts.suggest_only) {
      lines.push(`- ${lang.suggestOnlyLabel}: ${counts.suggest_only}`)
    }
    return lines
  }

  function actionPhaseLabel(phase) {
    if (phase === "cleanup") return lang.cleanupLabel
    if (phase === "normalize") return lang.normalizeLabel
    return lang.enrichLabel
  }

  function localizeTopicLabel(topic) {
    const key = noteText(topic)
    if (key === "summary_branch") return TOPIC_LABELS.summary[lang === zh ? "zh" : "en"]
    const entry = TOPIC_LABELS[key]
    if (!entry) return key
    return entry[lang === zh ? "zh" : "en"]
  }

  function actionPhaseLines(plan) {
    const counts = plan && plan.actionPhaseCounts ? plan.actionPhaseCounts : null
    if (!counts) return []

    const lines = []
    if (counts.cleanup) {
      lines.push(`- ${lang.cleanupLabel}: ${counts.cleanup}`)
    }
    if (counts.normalize) {
      lines.push(`- ${lang.normalizeLabel}: ${counts.normalize}`)
    }
    if (counts.enrich) {
      lines.push(`- ${lang.enrichLabel}: ${counts.enrich}`)
    }
    return lines
  }

  async function reviewPlanInApp(plan, nodes, artifactInfo, sessionId) {
    const entries = buildNoteReviewEntries(plan, nodes)
    const totalPages = 1 + entries.length
    let pageIndex = 0
    const hasExecutableEntries = entries.length > 0

    while (pageIndex < totalPages) {
      const isSummaryPage = pageIndex === 0
      const currentEntry = isSummaryPage ? null : entries[pageIndex - 1]
      const buttonLabels = []
      const actions = []

      if (pageIndex > 0) {
        buttonLabels.push(lang.prevPage)
        actions.push("prev")
      }

      if (pageIndex < totalPages - 1) {
        buttonLabels.push(lang.nextPage)
        actions.push("next")
      }

      if (currentEntry && currentEntry.actions.length) {
        buttonLabels.push(
          currentEntry.selected ? lang.excludeCurrent : lang.includeCurrent
        )
        actions.push("toggle")
      }

      buttonLabels.push(hasExecutableEntries ? lang.applySelected : lang.confirm)
      actions.push(hasExecutableEntries ? "apply" : "done")

      const title = `${lang.planSummary} (${lang.pageLabel} ${pageIndex + 1}/${totalPages})`
      const message = isSummaryPage
        ? buildSelectionSummaryPage(plan, artifactInfo, entries, sessionId)
        : buildNoteSelectionPage(currentEntry, pageIndex, totalPages - 1)
      const { option } = await popup(title, message, buttonLabels)

      if (option < 0) {
        return { shouldApply: false }
      }

      const action = actions[option]
      if (action === "prev") {
        pageIndex -= 1
        continue
      }
      if (action === "next") {
        pageIndex += 1
        continue
      }
      if (action === "toggle") {
        currentEntry.selected = !currentEntry.selected
        continue
      }
      if (action === "apply") {
        const planToApply = filterPlanBySelectedEntries(plan, entries)
        return {
          shouldApply: true,
          planToApply: planToApply,
          selectedActionCount: selectedCounts(entries).actionCount
        }
      }
      if (action === "done") {
        return { shouldApply: false }
      }
    }

    return { shouldApply: false }
  }

  function writeTextFile(path, text) {
    const data = NSData.dataWithStringEncoding(text, UTF8_ENCODING)
    data.writeToFileAtomically(path, true)
    return path
  }

  function writePlanArtifacts(plan, requestId, options) {
    ensureBridgeDirs()
    const opts = options || {}
    const kind = noteText(opts.kind).trim()
    const jsonName = kind ? `${requestId}-${kind}.json` : `${requestId}-plan.json`
    const textName = kind ? `${requestId}-${kind}-summary.txt` : `${requestId}-summary.txt`
    const jsonPath = `${bridgeReportsDir()}/${jsonName}`
    const textPath = `${bridgeReportsDir()}/${textName}`

    writeJSONFile(jsonPath, plan)
    writeTextFile(textPath, summarizePlan(plan))

    return {
      dir: bridgeReportsDir(),
      jsonPath: jsonPath,
      textPath: textPath,
      jsonName: jsonName,
      textName: textName,
      kind: kind || "plan"
    }
  }

  function normalizeBranchSnapshotNodes(branchState) {
    const notes = branchState && Array.isArray(branchState.notes) ? branchState.notes : []
    return notes.map(note => ({
      noteId: noteText(note && note.noteId),
      title: noteText(note && note.title),
      colorIndex:
        note && typeof note.colorIndex === "number" ? note.colorIndex : null,
      fillIndex:
        note && typeof note.fillIndex === "number" ? note.fillIndex : null,
      tags: uniqueStrings(note && note.tags),
      mainExcerptText: noteText(note && note.excerptText),
      allText: noteText(note && note.allText),
      commentsText: uniqueStrings(note && note.commentsText),
      childNoteIds: uniqueStrings(note && note.childNoteIds),
      parentNoteId: noteText(note && note.parentNoteId),
      visualFrame: note && note.visualFrame ? note.visualFrame : null,
      visualDepth:
        note && typeof note.visualDepth === "number" ? note.visualDepth : null,
      visibleInMindMap: !!(note && note.visibleInMindMap),
      branchClosed: !!(note && note.branchClosed),
      zLevel:
        note && note.zLevel !== undefined && note.zLevel !== null
          ? numericValue(note.zLevel)
          : null,
      hidden: !!(note && note.hidden),
      groupMode: noteText(note && note.groupMode)
    }))
  }

  function snapshotNoteState(note, layoutIndex) {
    if (!note) return null
    return enrichShapeContext({
      noteId: noteText(note.noteId),
      title: noteText(note.noteTitle),
      colorIndex:
        typeof note.colorIndex === "number" ? note.colorIndex : null,
      fillIndex:
        typeof note.fillIndex === "number" ? note.fillIndex : null,
      parentNoteId: note.parentNote ? noteText(note.parentNote.noteId) : "",
      childNoteIds: uniqueStrings(arrayFromObjC(note.childNotes).map(child => noteText(child.noteId))),
      excerptText: noteText(note.excerptText),
      tags: uniqueStrings(arrayFromObjC(note.tags)),
      commentsText: uniqueStrings(arrayFromObjC(note.commentsText)),
      allText: [noteText(note.noteTitle), noteText(note.excerptText), noteText(note.notesText)]
        .filter(Boolean)
        .join("\n")
    }, note, layoutIndex)
  }

  function snapshotBranchStateByNoteIds(noteIds) {
    const ids = uniqueStrings(noteIds)
    const notes = []
    const missingNoteIds = []
    const layoutIndex = collectMindMapNodeIndex()

    ids.forEach(noteId => {
      const note = Database.sharedInstance().getNoteById(noteId)
      const snapshot = snapshotNoteState(note, layoutIndex)
      if (snapshot) {
        notes.push(snapshot)
      } else {
        missingNoteIds.push(noteId)
      }
    })

    return {
      noteIds: ids,
      noteCount: ids.length,
      missingNoteIds: missingNoteIds,
      notes: notes,
      shapeSummary: summarizeBranchShape(notes)
    }
  }

  function snapshotMapByNoteId(notes) {
    const map = {}
    ;(notes || []).forEach(note => {
      if (!note || !note.noteId) return
      map[note.noteId] = note
    })
    return map
  }

  function arraysEqual(left, right) {
    if (left === right) return true
    const a = Array.isArray(left) ? left : []
    const b = Array.isArray(right) ? right : []
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  function changedFieldsBetweenSnapshots(before, after) {
    if (!before || !after) return []
    const fields = []
    if (JSON.stringify(before.visualFrame || null) !== JSON.stringify(after.visualFrame || null)) {
      fields.push("visualFrame")
    }
    if (before.visualDepth !== after.visualDepth) fields.push("visualDepth")
    if (before.visibleInMindMap !== after.visibleInMindMap) fields.push("visibleInMindMap")
    if (before.branchClosed !== after.branchClosed) fields.push("branchClosed")
    if (before.title !== after.title) fields.push("title")
    if (before.colorIndex !== after.colorIndex) fields.push("colorIndex")
    if (before.fillIndex !== after.fillIndex) fields.push("fillIndex")
    if (before.parentNoteId !== after.parentNoteId) fields.push("parentNoteId")
    if (!arraysEqual(before.childNoteIds, after.childNoteIds)) fields.push("childNoteIds")
    if (before.excerptText !== after.excerptText) fields.push("excerptText")
    if (!arraysEqual(before.tags, after.tags)) fields.push("tags")
    if (!arraysEqual(before.commentsText, after.commentsText)) fields.push("commentsText")
    if (before.zLevel !== after.zLevel) fields.push("zLevel")
    if (before.hidden !== after.hidden) fields.push("hidden")
    if (before.groupMode !== after.groupMode) fields.push("groupMode")
    if (before.allText !== after.allText) fields.push("allText")
    return fields
  }

  function snapshotContainsComment(snapshot, text) {
    const value = noteText(text).trim()
    if (!snapshot || !value) return false
    return (
      uniqueStrings(snapshot.commentsText).some(comment => comment.indexOf(value) >= 0) ||
      noteText(snapshot.allText).indexOf(value) >= 0
    )
  }

  function actionObservedSuccess(action, after) {
    if (!after) return false

    if (action.type === "set_title") {
      return noteText(after.title).trim() === noteText(action.title).trim()
    }

    if (action.type === "set_color_index") {
      return Number(after.colorIndex) === Number(action.colorIndex)
    }

    if (action.type === "rewrite_excerpt") {
      return noteText(after.excerptText).trim() === noteText(action.text).trim()
    }

    if (action.type === "append_tags") {
      const tags = uniqueStrings(action.tags)
      if (!tags.length) return false
      return tags.every(tag => uniqueStrings(after.tags).indexOf(tag) >= 0)
    }

    if (action.type === "append_comment") {
      return snapshotContainsComment(after, action.comment)
    }

    if (action.type === "remove_comments_by_text") {
      const comments = uniqueStrings(action.comments)
      if (!comments.length) return false
      return comments.every(comment => !snapshotContainsComment(after, comment))
    }

    if (action.type === "organize_branch_groups") {
      const movedIds = uniqueStrings(
        []
          .concat(
            ...((action.groups || []).map(group =>
              (group && Array.isArray(group.noteIds) ? group.noteIds : []).map(noteText)
            ))
          )
      )
      if (!movedIds.length) return false
      const currentChildren = uniqueStrings(after.childNoteIds)
      return movedIds.every(noteId => currentChildren.indexOf(noteId) < 0)
    }

    return false
  }

  function normalizeTitleKey(text) {
    return noteText(text)
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "")
  }

  function isLikelyGroupingNote(note) {
    if (!note) return false
    if (arrayFromObjC(note.childNotes).length > 0) return true
    const excerpt = noteText(note.excerptText).trim()
    const comments = uniqueStrings(arrayFromObjC(note.commentsText))
    const body = noteText(note.notesText).trim()
    return !excerpt && !comments.length && !body
  }

  function directChildNotes(note) {
    return arrayFromObjC(note && note.childNotes)
  }

  function branchGroupAnchor(note) {
    return directChildNotes(note).find(Boolean) || null
  }

  function canCreateGroupingChild(note) {
    if (!note) return false
    if (typeof note.createChildNote === "function") return true
    const anchor = branchGroupAnchor(note)
    if (anchor && typeof anchor.createBrotherNote === "function") return true
    return canCreateDetachedGroupingChild(note)
  }

  function canMoveExistingChild(note) {
    if (!note) return false
    if (typeof note.addChild === "function") return true
    const anchor = branchGroupAnchor(note)
    return !!(anchor && typeof anchor.addAsChildNote === "function")
  }

  function canAdoptChild(groupNote, childNote) {
    if (groupNote && typeof groupNote.addChild === "function") return true
    if (childNote && typeof childNote.addAsChildNote === "function") return true
    return false
  }

  function noteSupportsBranchOrganization(note) {
    if (!note) return false
    return canCreateGroupingChild(note) && canMoveExistingChild(note)
  }

  function resolverResult(label, value) {
    return {
      label: label,
      value: value || null
    }
  }

  function resolveNotebookById(notebookId) {
    const id = noteText(notebookId).trim()
    if (!id) return null

    const db = databaseModel()
    if (db && typeof db.getNotebookById === "function") {
      try {
        const notebook = db.getNotebookById(id)
        if (notebook) return resolverResult("Database.sharedInstance().getNotebookById", notebook)
      } catch (error) {}
    }

    if (typeof Application !== "undefined" && Application) {
      if (typeof Application.getNotebookById === "function") {
        try {
          const notebook = Application.getNotebookById(id)
          if (notebook) return resolverResult("Application.getNotebookById", notebook)
        } catch (error) {}
      }
      if (typeof Application.getNoteBookById === "function") {
        try {
          const notebook = Application.getNoteBookById(id)
          if (notebook) return resolverResult("Application.getNoteBookById", notebook)
        } catch (error) {}
      }
    }

    return null
  }

  function resolveDocumentByMd5(docMd5) {
    const md5 = noteText(docMd5).trim()
    if (!md5) return null

    const currentDoc = currentDocumentController()
    if (currentDoc && currentDoc.document) {
      const currentMd5 = noteText(currentDoc.docMd5 || currentDoc.document.docMd5)
      if (!currentMd5 || currentMd5 === md5) {
        return resolverResult("currentDocumentController.document", currentDoc.document)
      }
    }

    const reader = readerController()
    const docControllers = arrayFromObjC(reader && reader.documentControllers)
    for (let i = 0; i < docControllers.length; i++) {
      const docController = docControllers[i]
      const document = docController && docController.document
      const currentMd5 = noteText(
        docController && (docController.docMd5 || (document && document.docMd5))
      )
      if (document && currentMd5 === md5) {
        return resolverResult("readerController.documentControllers.document", document)
      }
    }

    const db = databaseModel()
    if (db && typeof db.getDocumentById === "function") {
      try {
        const document = db.getDocumentById(md5)
        if (document) {
          return resolverResult("Database.sharedInstance().getDocumentById", document)
        }
      } catch (error) {}
    }

    if (typeof Application !== "undefined" && Application) {
      if (typeof Application.getDocumentById === "function") {
        try {
          const document = Application.getDocumentById(md5)
          if (document) return resolverResult("Application.getDocumentById", document)
        } catch (error) {}
      }
      if (typeof Application.getDocById === "function") {
        try {
          const document = Application.getDocById(md5)
          if (document) return resolverResult("Application.getDocById", document)
        } catch (error) {}
      }
    }

    return null
  }

  function detachedGroupingCreateContext(parentNote) {
    if (!parentNote) return null
    if (typeof Note === "undefined" || !Note) return null
    if (typeof Note.createWithTitleNotebookDocument !== "function") return null

    const notebookId = noteText(parentNote.notebookId)
    const docMd5 = noteText(parentNote.docMd5)
    if (!notebookId || !docMd5) return null

    const notebookResult = resolveNotebookById(notebookId)
    const documentResult = resolveDocumentByMd5(docMd5)
    if (!notebookResult || !documentResult) return null

    return {
      notebookId: notebookId,
      docMd5: docMd5,
      notebook: notebookResult.value,
      document: documentResult.value,
      source: `${notebookResult.label}+${documentResult.label}`
    }
  }

  function canCreateDetachedGroupingChild(parentNote) {
    if (!parentNote) return false
    if (typeof parentNote.addChild !== "function") return false
    return !!detachedGroupingCreateContext(parentNote)
  }

  function createGroupingChildNoteDetailed(parentNote, title) {
    if (!parentNote) return null
    const colorIndex =
      typeof parentNote.colorIndex === "number" && parentNote.colorIndex >= 0
        ? parentNote.colorIndex
        : 0

    if (typeof parentNote.createChildNote === "function") {
      return {
        groupNote: parentNote.createChildNote({
          title: title,
          excerptText: "",
          excerptTextMarkdown: false,
          content: "",
          markdown: false,
          color: colorIndex
        }),
        path: "note.createChildNote"
      }
    }

    const anchor = branchGroupAnchor(parentNote)
    if (anchor && typeof anchor.createBrotherNote === "function") {
      return {
        groupNote: anchor.createBrotherNote({
          title: title,
          content: "",
          markdown: false,
          color: colorIndex
        }),
        path: "anchor.createBrotherNote"
      }
    }

    const detachedContext = detachedGroupingCreateContext(parentNote)
    if (detachedContext && typeof parentNote.addChild === "function") {
      const detachedNote = Note.createWithTitleNotebookDocument(title, detachedContext.notebook, detachedContext.document)
      if (!detachedNote) {
        return {
          groupNote: null,
          path: "Note.createWithTitleNotebookDocument",
          error: "detached_create_returned_null"
        }
      }

      try {
        detachedNote.colorIndex = colorIndex
      } catch (error) {}

      try {
        parentNote.addChild(detachedNote)
        return {
          groupNote: detachedNote,
          path: "Note.createWithTitleNotebookDocument+note.addChild"
        }
      } catch (error) {
        return {
          groupNote: null,
          path: "Note.createWithTitleNotebookDocument+note.addChild",
          error: noteText(error && error.message ? error.message : error)
        }
      }
    }

    return {
      groupNote: null,
      path: "group_create_unavailable",
      error: "no_supported_create_path"
    }
  }

  function createGroupingChildNote(parentNote, title) {
    const detail = createGroupingChildNoteDetailed(parentNote, title)
    return detail ? detail.groupNote : null
  }

  function moveNoteUnderGroupDetailed(groupNote, childNote) {
    if (!groupNote || !childNote) {
      return {
        ok: false,
        path: "move_unavailable",
        error: "missing_group_or_child"
      }
    }
    if (typeof groupNote.addChild === "function") {
      groupNote.addChild(childNote)
      return {
        ok: true,
        path: "groupNote.addChild"
      }
    }
    if (typeof childNote.addAsChildNote === "function") {
      childNote.addAsChildNote(groupNote)
      return {
        ok: true,
        path: "childNote.addAsChildNote"
      }
    }
    return {
      ok: false,
      path: "move_unavailable",
      error: "no_supported_move_path"
    }
  }

  function moveNoteUnderGroup(groupNote, childNote) {
    return moveNoteUnderGroupDetailed(groupNote, childNote).ok
  }

  function buildBranchDiff(beforeBranch, afterBranch) {
    const before = beforeBranch || { noteIds: [], notes: [], missingNoteIds: [] }
    const after = afterBranch || { noteIds: [], notes: [], missingNoteIds: [] }
    const beforeMap = snapshotMapByNoteId(before.notes)
    const afterMap = snapshotMapByNoteId(after.notes)
    const noteIds = uniqueStrings([].concat(before.noteIds || [], after.noteIds || []))
    const changedNotes = []
    const fieldCounts = {}

    noteIds.forEach(noteId => {
      const beforeNote = beforeMap[noteId] || null
      const afterNote = afterMap[noteId] || null
      let changedFields = []

      if (beforeNote && afterNote) {
        changedFields = changedFieldsBetweenSnapshots(beforeNote, afterNote)
      } else if (beforeNote || afterNote) {
        changedFields = ["note_presence"]
      }

      if (!changedFields.length) return

      changedFields.forEach(field => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1
      })

      changedNotes.push({
        noteId: noteId,
        changedFields: changedFields,
        before: beforeNote,
        after: afterNote
      })
    })

    return {
      noteCount: noteIds.length,
      changedNoteCount: changedNotes.length,
      changedNotes: changedNotes,
      fieldCounts: fieldCounts,
      missingBeforeNoteIds: uniqueStrings(before.missingNoteIds),
      missingAfterNoteIds: uniqueStrings(after.missingNoteIds)
    }
  }

  function summarizeApplyExecution(execution) {
    const okCount = execution.results.filter(item => item.ok).length
    const skippedCount = execution.results.filter(item => item.skipped).length
    const errorCount = execution.results.filter(item => item.error && !item.skipped).length
    const helperBlockedCount = Array.isArray(execution.helperBlockedActions)
      ? execution.helperBlockedActions.length
      : 0
    const visibleChangeCount = execution.results.filter(
      item => item.ok && item.changedFields && item.changedFields.length
    ).length
    const changedNoteCount = execution.branchDiff ? execution.branchDiff.changedNoteCount : 0
    const typeCounts = {}

    execution.results.forEach(item => {
      const key = item.type || "unknown"
      typeCounts[key] = (typeCounts[key] || 0) + 1
    })

    const lines = [
      `${commandTitleText(execution)}`,
      "",
      `${lang.applyDone}`,
      "",
      `${lang.applied}: ${okCount}`,
      `${lang.visibleChanges}: ${visibleChangeCount}`,
      `${lang.changedNotes}: ${changedNoteCount}`,
      `${lang.helperBlocked}: ${helperBlockedCount}`,
      `${lang.skipped}: ${skippedCount}`,
      `Errors: ${errorCount}`
    ]

    const keys = Object.keys(typeCounts)
    if (keys.length) {
      lines.push("", `${lang.summaryCounts}:`)
      keys.forEach(key => {
        lines.push(`- ${key}: ${typeCounts[key]}`)
      })
    }

    const skippedItems = execution.results.filter(item => item.skipped).slice(0, 8)
    if (skippedItems.length) {
      lines.push("", `${lang.applySkipped}`)
      skippedItems.forEach(item => {
        lines.push(`- ${item.type} -> ${item.noteId}${item.reason ? ` (${item.reason})` : ""}`)
      })
    }

    const helperBlockedItems = (execution.helperBlockedActions || []).slice(0, 8)
    if (helperBlockedItems.length) {
      lines.push("", `${lang.applyFiltered}`)
      helperBlockedItems.forEach(item => {
        const capabilitySummary =
          item && item.capabilityDetail
            ? ` create=${item.capabilityDetail.createGroupingChild ? 1 : 0} move=${item.capabilityDetail.moveExistingChild ? 1 : 0}`
            : ""
        lines.push(
          `- ${item.type} -> ${item.noteId}${item.reason ? ` (${item.reason})` : ""}${capabilitySummary}`
        )
      })
    }

    const structureItems = execution.results
      .filter(item => item && item.type === "organize_branch_groups" && item.executionDetail)
      .slice(0, 6)
    if (structureItems.length) {
      lines.push("", "Structure detail:")
      structureItems.forEach(item => {
        const detail = item.executionDetail || {}
        const groupCount = Array.isArray(detail.groupSummaries) ? detail.groupSummaries.length : 0
        const createdCount = Array.isArray(item.createdNoteIds) ? item.createdNoteIds.length : 0
        const movedCount = Array.isArray(item.movedNoteIds) ? item.movedNoteIds.length : 0
        lines.push(
          `- ${item.noteId} | groups=${groupCount} created=${createdCount} moved=${movedCount} path=${item.apiPath || "unknown"}`
        )
      })
    }

    if (execution.halted) {
      lines.push(
        "",
        `${lang.haltedAt}: ${execution.halted.type} -> ${execution.halted.noteId} (${execution.halted.error || execution.halted.reason || "unknown"})`
      )
    }

    return lines.join("\n")
  }

  function writeApplyArtifacts(execution, requestId, options) {
    ensureBridgeDirs()
    const opts = options || {}
    const kind = noteText(opts.kind).trim()
    const applyId = kind ? `${requestId}-${kind}-apply-${Date.now()}` : `${requestId}-apply-${Date.now()}`
    const jsonName = `${applyId}.json`
    const textName = `${applyId}-summary.txt`
    const jsonPath = `${bridgeReportsDir()}/${jsonName}`
    const textPath = `${bridgeReportsDir()}/${textName}`

    writeJSONFile(jsonPath, execution)
    writeTextFile(textPath, summarizeApplyExecution(execution))

    return {
      dir: bridgeReportsDir(),
      jsonPath: jsonPath,
      textPath: textPath,
      jsonName: jsonName,
      textName: textName,
      kind: kind || "apply"
    }
  }

  function writePlanPayload(nodes, requestId, objective, stage, shapeSummary, origin) {
    ensureBridgeDirs()
    const payloadPath = `${bridgeRequestsDir()}/${requestId}.json`
    return writeJSONFile(payloadPath, {
      objective: noteText(objective) || Addon.title,
      stage: noteText(stage) || "primary",
      origin: noteText(origin) || "",
      dryRun: true,
      nodes: nodes,
      shapeSummary: shapeSummary || null
    })
  }

  function newRequestId() {
    return `${Addon.key}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  }

  function summarizePlanMetrics(plan) {
    const actions = Array.isArray(plan && plan.actions) ? plan.actions : []
    const unsupported = Array.isArray(plan && plan.unsupportedActions)
      ? plan.unsupportedActions
      : []
    const strategyPacks = Array.isArray(plan && plan.strategyPacks) ? plan.strategyPacks : []
    const executionCounts = {}
    actions.forEach(action => {
      const key =
        action && action.execution && action.execution.disposition
          ? action.execution.disposition
          : "review_required"
      executionCounts[key] = (executionCounts[key] || 0) + 1
    })
    return {
      plannedActionCount: actions.length,
      unsupportedActionCount: unsupported.length,
      strategyPackCount: strategyPacks.length,
      executionDispositionCounts: executionCounts,
      originalActionCount:
        plan && typeof plan.originalActionCount === "number"
          ? plan.originalActionCount
          : null
    }
  }

  function summarizeExecutionMetrics(execution) {
    const results = Array.isArray(execution && execution.results) ? execution.results : []
    return {
      applyActionCount:
        typeof execution && typeof execution.actionCount === "number"
          ? execution.actionCount
          : results.length,
      appliedCount: results.filter(item => item && item.ok).length,
      skippedCount: results.filter(item => item && item.skipped).length,
      errorCount: results.filter(item => item && item.error && !item.skipped).length,
      helperBlockedCount: Array.isArray(execution && execution.helperBlockedActions)
        ? execution.helperBlockedActions.length
        : 0,
      changedNoteCount:
        execution && execution.branchDiff && typeof execution.branchDiff.changedNoteCount === "number"
          ? execution.branchDiff.changedNoteCount
          : 0
    }
  }

  function planStage(plan) {
    return noteText(plan && plan.stage) || "primary"
  }

  function clonePlanWithActions(plan, actions, extra) {
    const nextActions = Array.isArray(actions) ? actions : []
    return Object.assign({}, plan || {}, summarizeExecutionStats(nextActions), extra || {}, {
      stage: planStage(plan),
      actions: nextActions,
      strategyPacks: synchronizeStrategyPacks(plan, nextActions)
    })
  }

  function isVisibleFollowupAutoAction(action) {
    if (!action || action.type !== "rewrite_excerpt") return false
    const source = noteText(action && action.meta ? action.meta.source : "")
    if (source !== "branch_structure_digest") return false
    const disposition =
      action && action.execution && action.execution.disposition
        ? action.execution.disposition
        : "review_required"
    return disposition !== "suggest_only"
  }

  function buildAutoApplyFollowupPlan(plan) {
    const actions = Array.isArray(plan && plan.actions) ? plan.actions : []
    const autoActions = actions.filter(action => isVisibleFollowupAutoAction(action))
    const deferredActions = actions.filter(action => !isVisibleFollowupAutoAction(action))
    return clonePlanWithActions(
      plan,
      autoActions,
      {
        originalActionCount: actions.length,
        autoFollowupActionCount: autoActions.length,
        deferredFollowupActionCount: deferredActions.length,
        deferredFollowupActionTypes: summarizeActionTypeCounts(deferredActions),
        autoApplyPolicy: "visible_followup_excerpt_only"
      }
    )
  }

  function waitForBridgeResponse(responsePath, timeoutMs) {
    return new Promise(resolve => {
      const startedAt = Date.now()
      const timer = NSTimer.scheduledTimerWithTimeInterval(
        0.25,
        true,
        timerRef => {
          const fm = NSFileManager.defaultManager()
          if (fm.fileExistsAtPath(responsePath)) {
            timerRef.invalidate()
            resolve(readJSONFromFile(responsePath))
            return
          }
          if (Date.now() - startedAt > timeoutMs) {
            timerRef.invalidate()
            resolve(null)
          }
        }
      )
      timer.fire()
    })
  }

  function actionTypeCounts(actions) {
    const counts = {}
    ;(actions || []).forEach(action => {
      const key = noteText(action && action.type) || "unknown"
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }

  function summarizeActionTypeCounts(actions) {
    const counts = actionTypeCounts(actions)
    const keys = Object.keys(counts).sort((left, right) => counts[right] - counts[left])
    return keys.map(key => `${key}: ${counts[key]}`)
  }

  function nextStageSummaryLines(plan) {
    const actions = Array.isArray(plan && plan.actions) ? plan.actions : []
    const packs = Array.isArray(plan && plan.strategyPacks) ? plan.strategyPacks : []
    if (packs.length) {
      const lines = [`${lang.nextStageActions}: ${actions.length}`]
      const pack = packs[0]
      lines.push(`- ${lang.strategyLabel}: ${truncateText(noteText(pack.summary), 92)}`)
      if (typeof pack.deferredSemanticCount === "number" && pack.deferredSemanticCount > 0) {
        lines.push(`- ${lang.semanticDeferredLabel}: ${pack.deferredSemanticCount}`)
      }
      if (typeof pack.deferredVisualCount === "number" && pack.deferredVisualCount > 0) {
        lines.push(`- ${lang.visualDeferredLabel}: ${pack.deferredVisualCount}`)
      }
      return lines
    }
    if (!actions.length) return [lang.nextStageNone]
    const lines = [`${lang.nextStageActions}: ${actions.length}`]
    const typeLines = summarizeActionTypeCounts(actions).slice(0, 4)
    typeLines.forEach(line => lines.push(`- ${line}`))
    return lines
  }

  function planNotesByType(plan) {
    const notes = Array.isArray(plan && plan.notes) ? plan.notes : []
    const grouped = {}
    notes.forEach(item => {
      const key = noteText(item && item.type) || "unknown"
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    })
    return grouped
  }

  function primaryPlanStatusLines(plan) {
    const stage = noteText(plan && plan.stage) || "primary"
    if (stage !== "primary") return []

    const actions = Array.isArray(plan && plan.actions) ? plan.actions : []
    const packs = Array.isArray(plan && plan.strategyPacks) ? plan.strategyPacks : []
    if (packs.some(pack => strategyPackType(pack) === "branch_already_organized_strategy")) {
      return []
    }
    const notesByType = planNotesByType(plan)
    const deferred = notesByType.semantic_tag_deferred || []
    const deferredVisual = notesByType.visual_color_deferred || []
    if (!deferred.length && !deferredVisual.length) return []

    const lines = []
    if (deferred.length && !actions.length) {
      lines.push(lang.branchAlreadyOrganizedTitle, lang.branchAlreadyOrganizedBody)
    }
    if (!actions.length) {
      if (deferred.length) {
        lines.push(`${lang.semanticDeferredLabel}: ${noteText(deferred[0].message)}`)
      }
      if (deferredVisual.length) {
        lines.push(`${lang.visualDeferredLabel}: ${noteText(deferredVisual[0].message)}`)
      }
    } else if (deferred.length) {
      lines.push(`${lang.semanticDeferredLabel}: ${deferred.length}`)
    }
    if (actions.length && deferredVisual.length) {
      lines.push(`${lang.visualDeferredLabel}: ${deferredVisual.length}`)
    }
    return lines
  }

  function planShapeSummaryLines(plan) {
    const shape = plan && plan.shapeSummary ? plan.shapeSummary : null
    if (!shape || !shape.captured) return []

    const lines = [
      `- ${lang.visibleNodesLabel}: ${shape.visibleNodeCount || 0}/${shape.branchNodeCount || 0}`
    ]
    if (typeof shape.collapsedBranchCount === "number") {
      lines.push(`- ${lang.collapsedBranchesLabel}: ${shape.collapsedBranchCount}`)
    }
    if (typeof shape.hiddenNodeCount === "number") {
      lines.push(`- ${lang.hiddenNodesLabel}: ${shape.hiddenNodeCount}`)
    }
    if (shape.horizontalSpan !== null || shape.verticalSpan !== null) {
      lines.push(
        `- ${lang.spanLabel}: ${shape.horizontalSpan !== null ? shape.horizontalSpan : "?"} x ${
          shape.verticalSpan !== null ? shape.verticalSpan : "?"
        }`
      )
    }
    return lines
  }

  async function requestPlanThroughBridge(nodes, sessionId, options) {
    const opts = options || {}
    const requestId = newRequestId()
    writePlanPayload(
      nodes,
      requestId,
      opts.objective,
      opts.stage,
      opts.shapeSummary,
      opts.origin
    )
    const responsePath = `${bridgeResponsesDir()}/${requestId}.json`
    appendDiagnosticEvent(sessionId, "bridge_request_queued", {
      requestId: requestId,
      responsePath: responsePath,
      nodeCount: Array.isArray(nodes) ? nodes.length : 0,
      objective: noteText(opts.objective) || Addon.title,
      stage: noteText(opts.stage) || "primary",
      origin: noteText(opts.origin) || "",
      shapeCaptured: !!(opts.shapeSummary && opts.shapeSummary.captured)
    })
    const response = await waitForBridgeResponse(responsePath, 10000)
    if (!response || !response.ok) {
      appendDiagnosticEvent(sessionId, "bridge_request_failed", {
        requestId: requestId,
        ok: !!(response && response.ok),
        error: noteText(response && response.error),
        stage: noteText(opts.stage) || "primary"
      })
      return null
    }
    appendDiagnosticEvent(sessionId, "bridge_response_received", {
      requestId: requestId,
      metrics: summarizePlanMetrics(response.plan || null),
      stage: noteText(opts.stage) || "primary",
      origin: noteText(opts.origin) || ""
    })
    return {
      requestId: requestId,
      plan: response.plan || null
    }
  }

  async function buildFollowupPlanFromExecution(execution, sessionId) {
    const followupNodes = normalizeBranchSnapshotNodes(execution && execution.afterBranch)
    if (!followupNodes.length) return null
    const followupShapeSummary =
      execution && execution.afterBranch && execution.afterBranch.shapeSummary
        ? execution.afterBranch.shapeSummary
        : summarizeBranchShape(followupNodes)

    appendDiagnosticEvent(sessionId, "followup_plan_started", {
      nodeCount: followupNodes.length,
      origin: noteText(execution && execution.origin) || ""
    })
    const result = await requestPlanThroughBridge(followupNodes, sessionId, {
      objective:
        noteText(execution && execution.objective) ||
        noteText(execution && execution.command) ||
        Addon.title,
      stage: "followup",
      shapeSummary: followupShapeSummary,
      origin: noteText(execution && execution.origin) || ""
    })
    if (!result || !result.plan) {
      appendDiagnosticEvent(sessionId, "followup_plan_unavailable", {})
      return null
    }

    const artifactInfo = writePlanArtifacts(result.plan, result.requestId, {
      kind: "followup"
    })
    appendDiagnosticEvent(sessionId, "followup_plan_written", {
      artifact: artifactInfo,
      metrics: summarizePlanMetrics(result.plan),
      actionTypes: actionTypeCounts(result.plan.actions || []),
      origin: noteText(result.plan && result.plan.origin) || ""
    })
    return {
      requestId: result.requestId,
      plan: result.plan,
      artifact: artifactInfo,
      nodes: followupNodes
    }
  }

  function buildFollowupNoticeLines(followupInfo, followupExecutionInfo) {
    const lines = []
    if (followupInfo && followupInfo.plan) {
      lines.push(`${lang.nextStageLabel}:`)
      nextStageSummaryLines(followupInfo.plan).forEach(line => lines.push(line))
    }

    if (
      followupExecutionInfo &&
      followupExecutionInfo.execution &&
      followupExecutionInfo.appliedCount > 0
    ) {
      lines.push("")
      lines.push(`${lang.followupApplied}: ${followupExecutionInfo.appliedCount}`)
      if (followupExecutionInfo.deferredCount > 0) {
        lines.push(`${lang.followupDeferred}: ${followupExecutionInfo.deferredCount}`)
      }
      if (followupExecutionInfo.helperBlockedCount > 0) {
        lines.push(`${lang.helperBlocked}: ${followupExecutionInfo.helperBlockedCount}`)
      }
      if (followupExecutionInfo.artifact) {
        lines.push("")
        lines.push(lang.followupApplySaved)
        lines.push(`${lang.followupApplyJson}: ${followupExecutionInfo.artifact.jsonName}`)
        lines.push(`${lang.followupApplyText}: ${followupExecutionInfo.artifact.textName}`)
      }
    } else if (followupInfo && followupInfo.artifact) {
      lines.push("")
      lines.push(lang.nextStageSaved)
      lines.push(`${lang.nextStageJson}: ${followupInfo.artifact.jsonName}`)
      lines.push(`${lang.nextStageText}: ${followupInfo.artifact.textName}`)
      if (
        followupExecutionInfo &&
        followupExecutionInfo.deferredCount > 0
      ) {
        lines.push(`${lang.followupDeferred}: ${followupExecutionInfo.deferredCount}`)
      }
    }

    return lines
  }

  function buildCompletionDiagnosticLines(sessionId, options) {
    return currentDiagnosticLines(sessionId, Object.assign({
      includeHeading: true,
      includeDiagnosticArtifacts: true,
      includeApplyArtifact: true,
      includeFollowupArtifact: true,
      includeFollowupApplyArtifact: true
    }, options || {}))
  }

  function autoApplyFollowupPlanIfPossible(followupInfo, rootNote, sessionId) {
    if (!followupInfo || !followupInfo.plan) return null

    const autoPlan = buildAutoApplyFollowupPlan(followupInfo.plan)
    const deferredCount =
      typeof autoPlan.deferredFollowupActionCount === "number"
        ? autoPlan.deferredFollowupActionCount
        : 0
    if (!(autoPlan.actions || []).length) {
      appendDiagnosticEvent(sessionId, "followup_apply_skipped", {
        reason: "no_auto_followup_actions",
        deferredCount: deferredCount,
        origin: noteText(followupInfo.plan && followupInfo.plan.origin) || ""
      })
      return {
        autoPlan: autoPlan,
        deferredCount: deferredCount,
        helperBlockedCount: 0,
        execution: null,
        artifact: null,
        appliedCount: 0
      }
    }

    const planToApply = buildApplyablePlanForCurrentShell(autoPlan)
    const helperBlockedCount = Array.isArray(planToApply.helperBlockedActions)
      ? planToApply.helperBlockedActions.length
      : 0
    appendDiagnosticEvent(sessionId, "followup_apply_started", {
      selectedActionCount: (autoPlan.actions || []).length,
      executableActionCount: (planToApply.actions || []).length,
      deferredCount: deferredCount,
      helperBlockedCount: helperBlockedCount,
      origin: noteText(followupInfo.plan && followupInfo.plan.origin) || ""
    })

    if (!(planToApply.actions || []).length) {
      appendDiagnosticEvent(sessionId, "followup_apply_skipped", {
        reason: "helper_blocked_before_execution",
        helperBlockedCount: helperBlockedCount,
        deferredCount: deferredCount,
        origin: noteText(followupInfo.plan && followupInfo.plan.origin) || ""
      })
      return {
        autoPlan: planToApply,
        deferredCount: deferredCount,
        helperBlockedCount: helperBlockedCount,
        execution: null,
        artifact: null,
        appliedCount: 0
      }
    }

    const execution = applySupportedActions(planToApply, rootNote)
    const artifactInfo = writeApplyArtifacts(execution, followupInfo.requestId, {
      kind: "followup"
    })
    appendDiagnosticEvent(sessionId, "followup_apply_finished", {
      metrics: summarizeExecutionMetrics(execution),
      halted: execution.halted || null,
      deferredCount: deferredCount,
      helperBlockedCount: helperBlockedCount,
      origin: noteText(followupInfo.plan && followupInfo.plan.origin) || "",
      artifact: artifactInfo
    })

    return {
      autoPlan: planToApply,
      deferredCount: deferredCount,
      helperBlockedCount: helperBlockedCount,
      execution: execution,
      artifact: artifactInfo,
      appliedCount: execution.results.filter(item => item && item.ok).length
    }
  }

  function applyActionToModel(action) {
    const baseResult = {
      ok: false,
      skipped: false,
      error: null,
      type: action.type,
      noteId: action.noteId,
      planReason: noteText(action.reason),
      planSource: noteText(action && action.meta ? action.meta.source : ""),
      planConfidence:
        action && action.meta && typeof action.meta.confidence === "number"
          ? action.meta.confidence
          : null,
      executionDisposition:
        action && action.execution && action.execution.disposition
          ? action.execution.disposition
          : "review_required",
      actionPhase: action && action.phase ? action.phase : "enrich",
      reason: "",
      apiPath: "",
      changedFields: [],
      before: null,
      after: null
    }
    const note = Database.sharedInstance().getNoteById(action.noteId)
    if (!note) {
      return Object.assign({}, baseResult, {
        skipped: true,
        reason: "note_not_found",
        apiPath: "getNoteById"
      })
    }
    const before = snapshotNoteState(note)

    try {
      let operationCount = 0
      let createdNoteIds = []
      let movedNoteIds = []
      let executionDetail = null
      const disposition =
        action && action.execution && action.execution.disposition
          ? action.execution.disposition
          : "review_required"
      if (disposition === "suggest_only") {
        return Object.assign({}, baseResult, {
          skipped: true,
          reason: "execution_policy_blocked",
          apiPath: "execution_policy",
          before: before,
          after: before
        })
      }

    if (action.type === "set_title") {
      note.noteTitle = noteText(action.title)
      baseResult.apiPath = "note.noteTitle"
    } else if (action.type === "set_color_index") {
      note.colorIndex = Number(action.colorIndex)
      baseResult.apiPath = "note.colorIndex"
    } else if (action.type === "rewrite_excerpt") {
      note.excerptText = noteText(action.text)
      baseResult.apiPath = "note.excerptText"
      } else if (action.type === "append_comment") {
        const comment = noteText(action.comment).trim()
        if (!comment) {
          return Object.assign({}, baseResult, {
            skipped: true,
            reason: "empty_comment",
            apiPath: "append_comment_validation",
            before: before,
            after: before
          })
        }

        if (typeof note.appendTextComments === "function") {
          note.appendTextComments(comment)
          baseResult.apiPath = "note.appendTextComments"
          executionDetail = {
            strategy: "note.appendTextComments",
            commentLength: comment.length
          }
        } else if (typeof note.appendTextComment === "function") {
          note.appendTextComment(comment)
          baseResult.apiPath = "note.appendTextComment"
          executionDetail = {
            strategy: "note.appendTextComment",
            commentLength: comment.length
          }
        } else {
          return Object.assign({}, baseResult, {
            skipped: true,
            reason: "append_comment_unsupported",
            apiPath: "append_comment_unavailable",
            before: before,
            after: before
          })
        }
      } else if (action.type === "remove_comments_by_text") {
        const comments = uniqueStrings(action.comments)
        if (!comments.length) {
          return Object.assign({}, baseResult, {
            skipped: true,
            reason: "empty_comment_targets",
            apiPath: "remove_comment_validation",
            before: before,
            after: before
          })
        }

        let attemptedRemoval = false
        const removalDetail = {
          targets: comments,
          strategiesTried: [],
          removedCommentIndices: []
        }

        if (typeof note.removeCommentByIndex === "function") {
          const noteComments = arrayFromObjC(note.comments)
          const indicesToRemove = []

          noteComments.forEach((comment, index) => {
            if (shouldRemoveLegacyComment(noteCommentText(comment), comments)) {
              indicesToRemove.push(index)
            }
          })

          if (indicesToRemove.length) {
            indicesToRemove
              .sort((a, b) => b - a)
              .forEach(index => note.removeCommentByIndex(index))
            attemptedRemoval = true
            baseResult.apiPath = "note.removeCommentByIndex:scan_comments"
            removalDetail.strategiesTried.push("note.removeCommentByIndex:scan_comments")
            removalDetail.removedCommentIndices = indicesToRemove.slice().sort((a, b) => a - b)
          }
        }

        if (
          !attemptedRemoval &&
          typeof note.getCommentIndex === "function" &&
          typeof note.removeCommentByIndex === "function"
        ) {
          comments.forEach(comment => {
            let guard = 0
            while (guard < 20) {
              const index = note.getCommentIndex(comment, true)
              if (typeof index !== "number" || index < 0) break
              note.removeCommentByIndex(index)
              attemptedRemoval = true
              baseResult.apiPath = "note.getCommentIndex+note.removeCommentByIndex"
              if (
                removalDetail.strategiesTried.indexOf(
                  "note.getCommentIndex+note.removeCommentByIndex"
                ) < 0
              ) {
                removalDetail.strategiesTried.push(
                  "note.getCommentIndex+note.removeCommentByIndex"
                )
              }
              removalDetail.removedCommentIndices.push(index)
              guard += 1
            }
          })
        }

        if (!attemptedRemoval && typeof note.removeCommentByCondition === "function") {
          legacyCommentPatterns().forEach(pattern => {
            note.removeCommentByCondition({
              type: "text",
              include: pattern,
              exclude: "",
              reg: ""
            })
          })
          attemptedRemoval = true
          baseResult.apiPath = "note.removeCommentByCondition"
          removalDetail.strategiesTried.push("note.removeCommentByCondition")
        }

        if (!attemptedRemoval) {
          return Object.assign({}, baseResult, {
            skipped: true,
            reason: "remove_comment_unsupported",
            apiPath: "remove_comment_unavailable",
            before: before,
            after: before
          })
        }
        executionDetail = removalDetail
      } else if (action.type === "organize_branch_groups") {
        const groups = Array.isArray(action.groups) ? action.groups : []
        if (!groups.length) {
          return Object.assign({}, baseResult, {
            skipped: true,
            reason: "empty_branch_groups",
            apiPath: "organize_branch_validation",
            before: before,
            after: before
          })
        }

        if (!noteSupportsBranchOrganization(note)) {
          return Object.assign({}, baseResult, {
            skipped: true,
            reason: "branch_group_unsupported",
            apiPath: "branch_group_unavailable",
            before: before,
            after: before
          })
        }

        const directChildren = arrayFromObjC(note.childNotes)
        const allMovedIds = uniqueStrings(
          []
            .concat(
              ...groups.map(group =>
                (group && Array.isArray(group.noteIds) ? group.noteIds : []).map(noteText)
              )
            )
        )
        const existingGroups = {}
        directChildren.forEach(child => {
          const key = normalizeTitleKey(child && child.noteTitle)
          if (!key || existingGroups[key]) return
          if (allMovedIds.indexOf(noteText(child && child.noteId)) >= 0) return
          if (!isLikelyGroupingNote(child)) return
          existingGroups[key] = child
        })

        executionDetail = {
          rootNoteId: noteText(note.noteId),
          directChildCount: directChildren.length,
          groupedChildTargetCount: allMovedIds.length,
          groupSummaries: []
        }

        groups.forEach(group => {
          const label = noteText(group && group.label).trim()
          if (!label) return

          const key = normalizeTitleKey(label)
          let groupNote = existingGroups[key] || null
          const groupSummary = {
            label: label,
            key: key,
            targetNoteIds: uniqueStrings(group.noteIds),
            groupNoteId: noteText(groupNote && groupNote.noteId),
            createPath: groupNote ? "existing_group" : "",
            createError: "",
            created: false,
            moveSummaries: []
          }

          if (!groupNote) {
            const createdDetail = createGroupingChildNoteDetailed(note, label)
            groupSummary.createPath = noteText(createdDetail && createdDetail.path)
            groupSummary.createError = noteText(createdDetail && createdDetail.error)
            groupNote = createdDetail ? createdDetail.groupNote : null
            if (!groupNote) {
              executionDetail.groupSummaries.push(groupSummary)
              return
            }
            existingGroups[key] = groupNote
            createdNoteIds.push(noteText(groupNote && groupNote.noteId))
            operationCount += 1
            groupSummary.created = true
            groupSummary.groupNoteId = noteText(groupNote && groupNote.noteId)
          }

          uniqueStrings(group.noteIds).forEach(childNoteId => {
            const childNote = Database.sharedInstance().getNoteById(childNoteId)
            const moveSummary = {
              childNoteId: childNoteId,
              childFound: !!childNote,
              moved: false,
              skipped: false,
              reason: "",
              movePath: "",
              moveError: ""
            }
            if (!childNote) {
              moveSummary.skipped = true
              moveSummary.reason = "child_not_found"
              groupSummary.moveSummaries.push(moveSummary)
              return
            }
            if (noteText(childNote.noteId) === noteText(groupNote.noteId)) {
              moveSummary.skipped = true
              moveSummary.reason = "child_equals_group"
              groupSummary.moveSummaries.push(moveSummary)
              return
            }
            const currentParentId = childNote.parentNote ? noteText(childNote.parentNote.noteId) : ""
            if (currentParentId === noteText(groupNote.noteId)) {
              moveSummary.skipped = true
              moveSummary.reason = "already_group_child"
              groupSummary.moveSummaries.push(moveSummary)
              return
            }
            const moveDetail = moveNoteUnderGroupDetailed(groupNote, childNote)
            moveSummary.movePath = noteText(moveDetail && moveDetail.path)
            moveSummary.moveError = noteText(moveDetail && moveDetail.error)
            if (moveDetail && moveDetail.ok) {
              movedNoteIds.push(noteText(childNote.noteId))
              operationCount += 1
              moveSummary.moved = true
            } else {
              moveSummary.skipped = true
              moveSummary.reason = "move_failed"
            }
            groupSummary.moveSummaries.push(moveSummary)
          })
          executionDetail.groupSummaries.push(groupSummary)
        })

        baseResult.apiPath = "branch_group_fallback_chain"
      } else if (action.type === "append_tags") {
        const tags = uniqueStrings(action.tags)
        if (!tags.length) {
          return Object.assign({}, baseResult, {
            skipped: true,
            reason: "empty_tags",
            apiPath: "append_tags_validation",
            before: before,
            after: before
          })
        }

        if (typeof note.appendTags === "function") {
          note.appendTags.apply(note, tags)
          if (typeof note.tidyupTags === "function") {
            note.tidyupTags()
          }
          baseResult.apiPath = "note.appendTags"
          executionDetail = {
            strategy: "note.appendTags",
            tags: tags,
            tidied: typeof note.tidyupTags === "function"
          }
        } else {
          const mergedTags = uniqueStrings([].concat(arrayFromObjC(note.tags), tags))
          note.tags = mergedTags
          baseResult.apiPath = "note.tags"
          executionDetail = {
            strategy: "note.tags",
            tags: tags,
            mergedTagCount: mergedTags.length
          }
        }
      } else {
        return Object.assign({}, baseResult, {
          skipped: true,
          reason: "unsupported_action",
          apiPath: "unsupported_action",
          before: before,
          after: before
        })
      }

      const after = snapshotNoteState(note)
      const changedFields = changedFieldsBetweenSnapshots(before, after)
      if (action.type === "organize_branch_groups" && operationCount > 0) {
        return Object.assign({}, baseResult, {
          ok: true,
          before: before,
          after: after,
          changedFields: changedFields,
          createdNoteIds: uniqueStrings(createdNoteIds),
          movedNoteIds: uniqueStrings(movedNoteIds),
          executionDetail: executionDetail
        })
      }
      if (actionObservedSuccess(action, after) || changedFields.length) {
        return Object.assign({}, baseResult, {
          ok: true,
          before: before,
          after: after,
          changedFields: changedFields,
          executionDetail: executionDetail
        })
      }

      return Object.assign({}, baseResult, {
        skipped: true,
        reason: "no_observable_change",
        before: before,
        after: after,
        changedFields: changedFields,
        executionDetail: executionDetail
      })
    } catch (error) {
      const after = snapshotNoteState(note)
      return Object.assign({}, baseResult, {
        error: noteText(error && error.message ? error.message : error),
        reason: "execution_error",
        before: before,
        after: after,
        changedFields: changedFieldsBetweenSnapshots(before, after)
      })
    }
  }

  function actionRelatedNoteIds(action) {
    const ids = [noteText(action && action.noteId)]
    if (action && action.type === "organize_branch_groups") {
      ;(action.groups || []).forEach(group => {
        ids.push(
          ...uniqueStrings(
            (group && Array.isArray(group.noteIds) ? group.noteIds : []).map(noteText)
          )
        )
      })
    }
    return uniqueStrings(ids)
  }

  function applySupportedActions(plan, rootNote) {
    const helperBlockedActions = Array.isArray(plan.helperBlockedActions)
      ? plan.helperBlockedActions
      : []
    const noteIds = uniqueStrings(
      []
        .concat(...(plan.actions || []).map(action => actionRelatedNoteIds(action)))
        .map(noteText)
    )
    const beforeBranch = snapshotBranchStateByNoteIds(noteIds)
    const results = []
    let halted = null

    ;(plan.actions || []).forEach((action, index) => {
      if (halted) {
        results.push({
          ok: false,
          skipped: true,
          error: null,
          type: action.type,
          noteId: action.noteId,
          planReason: noteText(action.reason),
          reason: "previous_error_halt",
          apiPath: "halted_before_execution",
          changedFields: [],
          before: null,
          after: null
        })
        return
      }

      const result = applyActionToModel(action)
      results.push(result)

      if (result.error) {
        halted = {
          actionIndex: index,
          noteId: result.noteId,
          type: result.type,
          reason: result.reason,
          error: result.error
        }
      }
    })

    const execution = {
      command: commandTitleText(plan, Addon.title),
      objective: noteText(plan && plan.objective) || Addon.title,
      origin: noteText(plan && plan.origin) || "",
      rootNoteId: noteText(rootNote && rootNote.noteId),
      notebookId: noteText(rootNote && rootNote.notebookId),
      noteIds: noteIds,
      plannedActionCount:
        typeof plan.originalActionCount === "number"
          ? plan.originalActionCount
          : (plan.actions || []).length + helperBlockedActions.length,
      actionCount: (plan.actions || []).length,
      helperBlockedActions: helperBlockedActions,
      appliedAt: new Date().toISOString(),
      beforeBranch: beforeBranch,
      results: results
    }

    try {
      Database.sharedInstance().setNotebookSyncDirty(rootNote.notebookId)
      app().refreshAfterDBChanged(rootNote.notebookId)
      execution.refresh = { ok: true }
    } catch (error) {
      execution.refresh = {
        ok: false,
        error: noteText(error && error.message ? error.message : error)
      }
    }

    execution.afterBranch = snapshotBranchStateByNoteIds(noteIds)
    execution.branchDiff = buildBranchDiff(execution.beforeBranch, execution.afterBranch)
    execution.halted = halted

    return execution
  }

  async function previewAndMaybeApply(sessionId, commandContext) {
    const context = commandContext || {}
    const rootNote = getFocusNote()
    if (!rootNote) {
      appendDiagnosticEvent(sessionId, "focus_note_missing", {})
      updateDiagnosticSession(sessionId, {
        status: "failed",
        lastError: { message: "no_focus_note" }
      })
      app().alert(lang.noFocusNote)
      return
    }

    updateDiagnosticSession(sessionId, {
      rootNoteId: noteText(rootNote.noteId),
      notebookId: noteText(rootNote.notebookId),
      command: noteText(context.commandLabel) || Addon.title,
      commandMode: noteText(context.commandMode) || "primary",
      commandOrigin: noteText(context.origin) || "",
      objective: noteText(context.objective) || Addon.title
    })
    try {
      const focusRuntimeSnapshot = writeRuntimeSnapshot("focus_note_ready", {
        sessionId: sessionId
      })
      updateDiagnosticSession(sessionId, {
        latestRuntimeSnapshot: focusRuntimeSnapshot
      })
      appendDiagnosticEvent(sessionId, "runtime_snapshot_written", focusRuntimeSnapshot)
    } catch (error) {
      appendDiagnosticEvent(sessionId, "runtime_snapshot_failed", {
        error: noteText(error && error.message ? error.message : error)
      })
    }
    appendDiagnosticEvent(sessionId, "focus_note_found", {
      rootNoteId: noteText(rootNote.noteId),
      notebookId: noteText(rootNote.notebookId),
      docMd5: noteText(rootNote.docMd5)
    })

    waitHUD(lang.collecting)
    const branchPayload = collectBranch(rootNote)
    const nodes = branchPayload.nodes || []
    stopWaitHUD()
    updateDiagnosticSession(sessionId, {
      metrics: Object.assign({}, (readDiagnosticSession(sessionId) || {}).metrics || {}, {
        branchNodeCount: nodes.length
      })
    })
    appendDiagnosticEvent(sessionId, "branch_collected", {
      nodeCount: nodes.length
    })
    showHUD(`${lang.branchReady}: ${nodes.length}`, 1.2)

    waitHUD(lang.requestingPlan)
    const bridgeResult = await requestPlanThroughBridge(nodes, sessionId, {
      shapeSummary: branchPayload.shapeSummary,
      objective: noteText(context.objective) || Addon.title,
      origin: noteText(context.origin) || ""
    })
    stopWaitHUD()

    if (!bridgeResult || !bridgeResult.plan) {
      updateDiagnosticSession(sessionId, {
        status: "failed",
        lastError: { message: "bridge_missing_or_plan_unavailable" }
      })
      app().alert(lang.bridgeMissing)
      return
    }

    const plan = bridgeResult.plan
    updateDiagnosticSession(sessionId, {
      metrics: Object.assign({}, (readDiagnosticSession(sessionId) || {}).metrics || {}, summarizePlanMetrics(plan)),
      lastRequestId: bridgeResult.requestId
    })

    self.lastPlan = plan
    self.lastFocusedNoteId = noteText(rootNote.noteId)
    const artifactInfo = writePlanArtifacts(plan, bridgeResult.requestId)
    updateDiagnosticSession(sessionId, {
      latestPlanArtifact: artifactInfo
    })
    appendDiagnosticEvent(sessionId, "plan_artifacts_written", Object.assign({}, artifactInfo, {
      origin: noteText(plan && plan.origin) || ""
    }))

    const reviewResult = await reviewPlanInApp(plan, nodes, artifactInfo, sessionId)
    appendDiagnosticEvent(sessionId, "review_completed", {
      shouldApply: !!reviewResult.shouldApply,
      selectedActionCount:
        typeof reviewResult.selectedActionCount === "number"
          ? reviewResult.selectedActionCount
          : 0,
      origin: noteText(plan && plan.origin) || ""
    })

    if (reviewResult.shouldApply) {
      const selectedPlan = reviewResult.planToApply || plan
      const planToApply = buildApplyablePlanForCurrentShell(selectedPlan)
      const helperBlockedCount = (planToApply.helperBlockedActions || []).length
      appendDiagnosticEvent(sessionId, "apply_preflight_ready", {
        selectedActionCount:
          typeof reviewResult.selectedActionCount === "number"
            ? reviewResult.selectedActionCount
            : 0,
        executableActionCount: Array.isArray(planToApply.actions) ? planToApply.actions.length : 0,
        helperBlockedCount: helperBlockedCount,
        origin: noteText(planToApply && planToApply.origin) || "",
        helperBlockedActions: (planToApply.helperBlockedActions || []).slice(0, 12)
      })

      if (!reviewResult.selectedActionCount) {
        updateDiagnosticSession(sessionId, {
          status: "completed",
          metrics: Object.assign({}, (readDiagnosticSession(sessionId) || {}).metrics || {}, {
            applyActionCount: 0
          })
        })
        app().alert(lang.noSelectedActions)
        return
      }
      if (!(planToApply.actions || []).length) {
        const blockedExecution = buildBlockedExecution(planToApply, rootNote)
        const blockedArtifactInfo = writeApplyArtifacts(blockedExecution, bridgeResult.requestId)
        updateDiagnosticSession(sessionId, {
          status: "completed",
          metrics: Object.assign(
            {},
            (readDiagnosticSession(sessionId) || {}).metrics || {},
            summarizeExecutionMetrics(blockedExecution)
          ),
          latestApplyArtifact: blockedArtifactInfo
        })
        appendDiagnosticEvent(sessionId, "apply_blocked_before_execution", {
          helperBlockedCount: helperBlockedCount,
          origin: noteText(planToApply && planToApply.origin) || "",
          artifact: blockedArtifactInfo
        })
        const blockedNoticeParts = [
          lang.noHelperExecutableActions,
          `${lang.helperBlocked}: ${helperBlockedCount}`,
          `${lang.applyReportSaved}\n${lang.summaryFolder}: ${blockedArtifactInfo.dir}\n${lang.applyReportJson}: ${blockedArtifactInfo.jsonName}\n${lang.applyReportText}: ${blockedArtifactInfo.textName}`,
          lang.applyFiltered
        ]
        const blockedDiagnosticLines = buildCompletionDiagnosticLines(sessionId, {
          includeRequestId: true,
          includeFollowupArtifact: false,
          includeFollowupApplyArtifact: false
        })
        if (blockedDiagnosticLines.length) {
          blockedNoticeParts.push(blockedDiagnosticLines.join("\n"))
        }
        app().alert(blockedNoticeParts.join("\n\n"))
        return
      }

      waitHUD(lang.apply)
      appendDiagnosticEvent(sessionId, "apply_started", {
        actionCount: Array.isArray(planToApply.actions) ? planToApply.actions.length : 0,
        origin: noteText(planToApply && planToApply.origin) || ""
      })
      const execution = applySupportedActions(planToApply, rootNote)
      stopWaitHUD()

      const applyArtifactInfo = writeApplyArtifacts(execution, bridgeResult.requestId)
      updateDiagnosticSession(sessionId, {
        status: execution.halted ? "failed" : "completed",
        metrics: Object.assign(
          {},
          (readDiagnosticSession(sessionId) || {}).metrics || {},
          summarizeExecutionMetrics(execution)
        ),
        latestApplyArtifact: applyArtifactInfo,
        lastExecution: {
          halted: !!execution.halted,
          refresh: execution.refresh || null
        },
        lastError:
          execution.halted && execution.halted.error
            ? { message: noteText(execution.halted.error) }
            : null
      })
      appendDiagnosticEvent(sessionId, "apply_finished", {
        metrics: summarizeExecutionMetrics(execution),
        halted: execution.halted || null,
        origin: noteText(execution && execution.origin) || "",
        artifact: applyArtifactInfo
      })
      const appliedCount = execution.results.filter(item => item.ok).length
      const skippedCount = execution.results.filter(item => item.skipped).length
      const blockedCount = Array.isArray(execution.helperBlockedActions)
        ? execution.helperBlockedActions.length
        : 0
      let followupInfo = null
      let followupExecutionInfo = null
      if (!execution.halted && appliedCount > 0) {
        waitHUD(lang.followupPlanning)
        try {
          followupInfo = await buildFollowupPlanFromExecution(execution, sessionId)
          if (followupInfo) {
            const currentMetrics = (readDiagnosticSession(sessionId) || {}).metrics || {}
            const followupMetrics = summarizePlanMetrics(followupInfo.plan)
            updateDiagnosticSession(sessionId, {
              latestFollowupPlanArtifact: followupInfo.artifact,
              followupPlanMetrics: followupMetrics,
              metrics: Object.assign({}, currentMetrics, {
                followupPlannedActionCount: followupMetrics.plannedActionCount || 0,
                followupUnsupportedActionCount: followupMetrics.unsupportedActionCount || 0
              })
            })
          }
        } catch (error) {
          appendDiagnosticEvent(sessionId, "followup_plan_failed", {
            error: noteText(error && error.message ? error.message : error)
          })
          updateDiagnosticSession(sessionId, {
            lastFollowupError: {
              message: noteText(error && error.message ? error.message : error)
            }
          })
        } finally {
          stopWaitHUD()
        }
      }

      if (followupInfo && !execution.halted) {
        waitHUD(lang.followupApplying)
        try {
          followupExecutionInfo = autoApplyFollowupPlanIfPossible(
            followupInfo,
            rootNote,
            sessionId
          )
          if (followupExecutionInfo && followupExecutionInfo.artifact) {
            const currentMetrics = (readDiagnosticSession(sessionId) || {}).metrics || {}
            const followupExecutionMetrics = summarizeExecutionMetrics(
              followupExecutionInfo.execution
            )
            updateDiagnosticSession(sessionId, {
              status:
                followupExecutionInfo.execution && followupExecutionInfo.execution.halted
                  ? "failed"
                  : (readDiagnosticSession(sessionId) || {}).status || "completed",
              latestFollowupApplyArtifact: followupExecutionInfo.artifact,
              followupApplyMetrics: followupExecutionMetrics,
              metrics: Object.assign({}, currentMetrics, {
                followupApplyActionCount: followupExecutionMetrics.applyActionCount || 0,
                followupAppliedCount: followupExecutionMetrics.appliedCount || 0,
                followupSkippedCount: followupExecutionMetrics.skippedCount || 0,
                followupHelperBlockedCount:
                  followupExecutionMetrics.helperBlockedCount || 0,
                followupChangedNoteCount:
                  followupExecutionMetrics.changedNoteCount || 0,
                followupDeferredActionCount:
                  followupExecutionInfo.deferredCount || 0
              }),
              lastFollowupError:
                followupExecutionInfo.execution &&
                followupExecutionInfo.execution.halted &&
                followupExecutionInfo.execution.halted.error
                  ? {
                      message: noteText(
                        followupExecutionInfo.execution.halted.error
                      )
                    }
                  : null
            })
          } else if (followupExecutionInfo) {
            const currentMetrics = (readDiagnosticSession(sessionId) || {}).metrics || {}
            updateDiagnosticSession(sessionId, {
              metrics: Object.assign({}, currentMetrics, {
                followupDeferredActionCount:
                  followupExecutionInfo.deferredCount || 0,
                followupHelperBlockedCount:
                  followupExecutionInfo.helperBlockedCount || 0
              })
            })
          }
        } catch (error) {
          appendDiagnosticEvent(sessionId, "followup_apply_failed", {
            error: noteText(error && error.message ? error.message : error)
          })
          updateDiagnosticSession(sessionId, {
            lastFollowupError: {
              message: noteText(error && error.message ? error.message : error)
            }
          })
        } finally {
          stopWaitHUD()
        }
      }

      const followupNoticeLines = buildFollowupNoticeLines(
        followupInfo,
        followupExecutionInfo
      )
      const completionDiagnosticLines = buildCompletionDiagnosticLines(sessionId, {
        includeRequestId: true
      })

      if (skippedCount > 0 || blockedCount > 0) {
        const statusLines = [`${lang.applied}: ${appliedCount}`]
        if (blockedCount > 0) {
          statusLines.push(`${lang.helperBlocked}: ${blockedCount}`)
        }
        if (skippedCount > 0) {
          statusLines.push(`${lang.skipped}: ${skippedCount}`)
        }
        const noticeLines = []
        if (blockedCount > 0) {
          noticeLines.push(lang.applyFiltered)
        }
        if (skippedCount > 0) {
          noticeLines.push(lang.applySkipped)
        }
        if (followupNoticeLines.length) {
          noticeLines.push("")
          noticeLines.push(...followupNoticeLines)
        }
        const alertParts = [
          lang.applyDone,
          statusLines.join("\n"),
          `${lang.applyReportSaved}\n${lang.summaryFolder}: ${applyArtifactInfo.dir}\n${lang.applyReportJson}: ${applyArtifactInfo.jsonName}\n${lang.applyReportText}: ${applyArtifactInfo.textName}`
        ]
        if (noticeLines.length) {
          alertParts.push(noticeLines.join("\n"))
        }
        if (completionDiagnosticLines.length) {
          alertParts.push(completionDiagnosticLines.join("\n"))
        }
        app().alert(alertParts.join("\n\n"))
      } else {
        const alertParts = [
          lang.applyDone,
          `${lang.applied}: ${appliedCount}`,
          `${lang.applyReportSaved}\n${lang.summaryFolder}: ${applyArtifactInfo.dir}\n${lang.applyReportJson}: ${applyArtifactInfo.jsonName}\n${lang.applyReportText}: ${applyArtifactInfo.textName}`
        ]
        if (followupNoticeLines.length) {
          alertParts.push(followupNoticeLines.join("\n"))
        }
        if (completionDiagnosticLines.length) {
          alertParts.push(completionDiagnosticLines.join("\n"))
        }
        app().alert(alertParts.join("\n\n"))
      }
      return
    }

    updateDiagnosticSession(sessionId, {
      status: "preview_only"
    })
    showHUD(lang.previewSavedTitle, 1.5)
  }

  JSB.newAddon = () => {
    return JSB.defineClass(
      Addon.name + ": JSExtension",
      {
        sceneWillConnect() {
          self.app = app()
          self.studyController = self.app.studyController(self.window)
          self.status = false
          self.lastPlan = null
          self.lastFocusedNoteId = null
          self.latestRuntimeSnapshot = null
          self.didShowLoadAlert = false
          console.log("sceneWillConnect")
          try {
            self.latestRuntimeSnapshot = writeRuntimeSnapshot("scene_connect", {
              trigger: "addon_load"
            })
          } catch (error) {
            console.log(error)
          }
          self.app.showHUD(lang.loaded, self.window, 2)
          if (!self.didShowLoadAlert) {
            self.didShowLoadAlert = true
            UIAlertView.showWithTitleMessageStyleCancelButtonTitleOtherButtonTitlesTapBlock(
              lang.loadedTitle,
              lang.loadedMessage,
              0,
              lang.confirm,
              [],
              null
            )
          }
        },
        queryAddonCommandStatus() {
          console.log("queryAddonCommandStatus")
          return self.studyController.studyMode !== 3
            ? {
                image: "logo_44x44.png",
                object: self,
                selector: "onRun:",
                checked: self.status
              }
            : null
        },
        async onRun() {
          console.log("onRun")
          self.status = true
          self.studyController.refreshAddonCommands()
          const sessionId = beginDiagnosticSession({
            trigger: "addon_command"
          })
          self.currentDiagnosticSessionId = sessionId
          let commandRuntimeSnapshot = null
          try {
            commandRuntimeSnapshot = writeRuntimeSnapshot("command_invoked", {
              sessionId: sessionId
            })
            self.latestRuntimeSnapshot = commandRuntimeSnapshot
            updateDiagnosticSession(sessionId, {
              latestRuntimeSnapshot: commandRuntimeSnapshot
            })
          } catch (error) {
            console.log(error)
          }
          appendDiagnosticEvent(sessionId, "command_invoked", {
            addon: Addon.name,
            runtimeSnapshot: commandRuntimeSnapshot
          })
          try {
            await popup(lang.commandHitTitle, lang.commandHitMessage)
            appendDiagnosticEvent(sessionId, "command_confirmed", {})
            const commandContext = await chooseCommandVariant()
            if (!commandContext) {
              updateDiagnosticSession(sessionId, {
                status: "cancelled"
              })
              appendDiagnosticEvent(sessionId, "command_mode_cancelled", {})
              return
            }

            updateDiagnosticSession(sessionId, {
              command: noteText(commandContext.commandLabel) || Addon.title,
              commandMode: noteText(commandContext.modeKey) || "primary",
              commandOrigin: noteText(commandContext.origin) || "",
              objective: noteText(commandContext.objective) || Addon.title
            })
            appendDiagnosticEvent(sessionId, "command_mode_selected", {
              command: noteText(commandContext.commandLabel) || Addon.title,
              mode: noteText(commandContext.modeKey) || "primary",
              origin: noteText(commandContext.origin) || "",
              objective: noteText(commandContext.objective) || Addon.title
            })
            await previewAndMaybeApply(sessionId, commandContext)
          } catch (error) {
            stopWaitHUD()
            console.log(error)
            updateDiagnosticSession(sessionId, {
              status: "failed",
              lastError: {
                message: noteText(error && error.message ? error.message : error)
              }
            })
            appendDiagnosticEvent(sessionId, "command_failed", {
              error: noteText(error && error.message ? error.message : error)
            })
            app().alert(String(error))
          } finally {
            appendDiagnosticEvent(sessionId, "command_finished", {
              finalStatus: noteText(
                ((readDiagnosticSession(sessionId) || {}).status || "completed")
              )
            })
            self.status = false
            self.studyController.refreshAddonCommands()
          }
        }
      },
      {}
    )
  }
})()
