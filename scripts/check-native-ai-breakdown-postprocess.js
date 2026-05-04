const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  buildBreakdownPostprocessPlan
} = require("../bridge/native-ai-breakdown-postprocess");

const EXPECTED_NEXT_COMMAND = "mnaipro breakdown artifacts --json";

function sampleNodes() {
  return [
    {
      noteId: "bd-root",
      title: "Chapter 3 Oscillations",
      tags: ["summary"],
      mainExcerptText: "",
      allText: "Chapter 3 Oscillations",
      commentsText: [],
      childNoteIds: ["bd-core", "bd-examples", "bd-questions"],
      parentNoteId: null,
      colorIndex: null,
      fillIndex: null,
      visualFrame: null,
      visualDepth: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 0,
      groupMode: ""
    },
    {
      noteId: "bd-core",
      title: "Core Ideas",
      tags: ["summary"],
      mainExcerptText: "",
      allText: "Core Ideas",
      commentsText: [],
      childNoteIds: ["bd-core-1", "bd-core-2"],
      parentNoteId: "bd-root",
      colorIndex: null,
      fillIndex: null,
      visualFrame: null,
      visualDepth: 1,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: ""
    },
    {
      noteId: "bd-examples",
      title: "Worked Examples",
      tags: ["summary"],
      mainExcerptText: "",
      allText: "Worked Examples",
      commentsText: [],
      childNoteIds: ["bd-ex-1", "bd-ex-2"],
      parentNoteId: "bd-root",
      colorIndex: null,
      fillIndex: null,
      visualFrame: null,
      visualDepth: 1,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: ""
    },
    {
      noteId: "bd-questions",
      title: "Questions",
      tags: ["summary"],
      mainExcerptText: "",
      allText: "Questions",
      commentsText: [],
      childNoteIds: ["bd-q-1"],
      parentNoteId: "bd-root",
      colorIndex: null,
      fillIndex: null,
      visualFrame: null,
      visualDepth: 1,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: ""
    },
    {
      noteId: "bd-core-1",
      title: "Simple harmonic motion",
      tags: [],
      mainExcerptText: "Period and phase.",
      allText: "Simple harmonic motion. Period and phase.",
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "bd-core",
      colorIndex: null,
      fillIndex: null,
      visualFrame: null,
      visualDepth: 2,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 2,
      groupMode: ""
    },
    {
      noteId: "bd-core-2",
      title: "Damped oscillation",
      tags: [],
      mainExcerptText: "Energy loss over time.",
      allText: "Damped oscillation. Energy loss over time.",
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "bd-core",
      colorIndex: null,
      fillIndex: null,
      visualFrame: null,
      visualDepth: 2,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 2,
      groupMode: ""
    },
    {
      noteId: "bd-ex-1",
      title: "Spring example",
      tags: [],
      mainExcerptText: "Mass-spring system.",
      allText: "Spring example. Mass-spring system.",
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "bd-examples",
      colorIndex: null,
      fillIndex: null,
      visualFrame: null,
      visualDepth: 2,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 2,
      groupMode: ""
    },
    {
      noteId: "bd-ex-2",
      title: "Pendulum example",
      tags: [],
      mainExcerptText: "Small-angle approximation.",
      allText: "Pendulum example. Small-angle approximation.",
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "bd-examples",
      colorIndex: null,
      fillIndex: null,
      visualFrame: null,
      visualDepth: 2,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 2,
      groupMode: ""
    },
    {
      noteId: "bd-q-1",
      title: "Practice questions",
      tags: [],
      mainExcerptText: "Concept checks and derivations.",
      allText: "Practice questions. Concept checks and derivations.",
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "bd-questions",
      colorIndex: null,
      fillIndex: null,
      visualFrame: null,
      visualDepth: 2,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 2,
      groupMode: ""
    }
  ];
}

function writeJsonFile(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function assertLatestBreakdownApplySelection() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-breakdown-postprocess-"));
  const genericApply = path.join(tempDir, "20260429-apply-generic.json");
  const breakdownApply = path.join(tempDir, "20260429-apply-breakdown.json");
  const inspector = path.join(__dirname, "inspect-native-ai-breakdown-postprocess.js");

  try {
    writeJsonFile(genericApply, {
      origin: "organize_current_branch",
      afterBranch: {
        notes: sampleNodes()
      }
    });
    writeJsonFile(breakdownApply, {
      origin: "native_ai_breakdown",
      afterBranch: {
        notes: sampleNodes()
      }
    });

    const now = Date.now();
    fs.utimesSync(genericApply, new Date(now + 10_000), new Date(now + 10_000));
    fs.utimesSync(breakdownApply, new Date(now - 10_000), new Date(now - 10_000));

    const result = spawnSync(process.execPath, [inspector, "--json"], {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        MN_AGENT_REPORTS_DIR: tempDir
      },
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024
    });

    assert.strictEqual(result.status, 0, `inspector exited with ${result.status}: ${result.stderr || result.stdout}`);
    const report = JSON.parse(result.stdout);
    assert.strictEqual(report.source, "latest_breakdown_apply", `expected breakdown-specific source selection, got: ${report.source}`);
    assert.strictEqual(report.path, breakdownApply, `expected inspector to inspect the Breakdown apply report, got: ${report.path}`);
    assert.strictEqual(report.summary.origin, "native_ai_breakdown", `expected native_ai_breakdown origin, got: ${report.summary && report.summary.origin}`);
    assert.strictEqual(report.nextCommand, EXPECTED_NEXT_COMMAND, `unexpected next command: ${report.nextCommand}`);
    assert(
      !JSON.stringify(report).includes(genericApply),
      `expected inspector to skip the generic apply report, got:\n${result.stdout}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertLatestBreakdownRequestSelection() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-breakdown-postprocess-"));
  const reportsDir = path.join(tempDir, "reports");
  const requestsDir = path.join(tempDir, "requests");
  const inspector = path.join(__dirname, "inspect-native-ai-breakdown-postprocess.js");

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(requestsDir, { recursive: true });

  const genericPlan = path.join(reportsDir, "mnaipro-2000000000000-111111-plan.json");
  const breakdownRequest = path.join(requestsDir, "mnaipro-2000000000001-222222.json");

  try {
    writeJsonFile(genericPlan, {
      origin: "",
      actions: [],
      strategyPacks: [],
      notes: [],
      unsupportedActions: []
    });
    writeJsonFile(breakdownRequest, {
      origin: "native_ai_breakdown",
      objective: "整理当前选中分支",
      stage: "followup",
      dryRun: true,
      nodes: sampleNodes(),
      shapeSummary: {
        captured: true
      }
    });

    const now = Date.now();
    fs.utimesSync(genericPlan, new Date(now - 20_000), new Date(now - 20_000));
    fs.utimesSync(breakdownRequest, new Date(now + 20_000), new Date(now + 20_000));

    const result = spawnSync(process.execPath, [inspector, "--json"], {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        MN_AGENT_REPORTS_DIR: reportsDir,
        MN_AGENT_REQUESTS_DIR: requestsDir
      },
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024
    });

    assert.strictEqual(result.status, 0, `inspector exited with ${result.status}: ${result.stderr || result.stdout}`);
    const report = JSON.parse(result.stdout);
    assert.strictEqual(report.source, "latest_breakdown_request", `expected request fallback source selection, got: ${report.source}`);
    assert.strictEqual(report.path, breakdownRequest, `expected inspector to inspect the Breakdown request report, got: ${report.path}`);
    assert.strictEqual(report.snapshotPath, breakdownRequest, `expected request fallback snapshot path to match the selected request, got: ${report.snapshotPath}`);
    assert.strictEqual(report.summary.origin, "native_ai_breakdown", `expected native_ai_breakdown origin, got: ${report.summary && report.summary.origin}`);
    assert.strictEqual(report.nextCommand, EXPECTED_NEXT_COMMAND, `unexpected next command: ${report.nextCommand}`);
    assert(
      !JSON.stringify(report).includes(genericPlan),
      `expected inspector to skip the generic plan report, got:\n${result.stdout}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertLatestBreakdownPlanSelection() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-breakdown-postprocess-"));
  const reportsDir = path.join(tempDir, "reports");
  const requestsDir = path.join(tempDir, "requests");
  const inspector = path.join(__dirname, "inspect-native-ai-breakdown-postprocess.js");

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(requestsDir, { recursive: true });

  const genericApply = path.join(reportsDir, "mnaipro-2000000000000-111111-apply-2000000000005.json");
  const breakdownPlan = path.join(reportsDir, "mnaipro-2000000000002-333333-plan.json");
  const genericRequest = path.join(requestsDir, "mnaipro-2000000000002-333333.json");

  try {
    writeJsonFile(genericApply, {
      origin: "organize_current_branch",
      afterBranch: {
        notes: sampleNodes()
      }
    });
    writeJsonFile(genericRequest, {
      origin: "organize_current_branch",
      objective: "整理当前选中分支",
      stage: "primary",
      dryRun: true,
      nodes: sampleNodes(),
      shapeSummary: {
        captured: true
      }
    });
    writeJsonFile(breakdownPlan, {
      origin: "native_ai_breakdown",
      objective: "整理当前选中分支",
      stage: "primary",
      dryRun: true,
      actionPhaseCounts: {
        cleanup: 0,
        normalize: 0,
        enrich: 0
      },
      notes: [],
      shapeSummary: {
        captured: true
      },
      strategyPacks: [],
      unsupportedActions: [],
      actionDispositionCounts: {
        safe_auto: 0,
        review_required: 0,
        suggest_only: 0
      },
      actions: [],
      nodes: []
    });

    const now = Date.now();
    fs.utimesSync(genericApply, new Date(now - 30_000), new Date(now - 30_000));
    fs.utimesSync(breakdownPlan, new Date(now + 30_000), new Date(now + 30_000));
    fs.utimesSync(genericRequest, new Date(now - 10_000), new Date(now - 10_000));

    const result = spawnSync(process.execPath, [inspector, "--json"], {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        MN_AGENT_REPORTS_DIR: reportsDir,
        MN_AGENT_REQUESTS_DIR: requestsDir
      },
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024
    });

    assert.strictEqual(result.status, 0, `inspector exited with ${result.status}: ${result.stderr || result.stdout}`);
    const report = JSON.parse(result.stdout);
    assert.strictEqual(report.source, "latest_breakdown_plan", `expected plan fallback source selection, got: ${report.source}`);
    assert.strictEqual(report.path, breakdownPlan, `expected inspector to inspect the Breakdown plan report, got: ${report.path}`);
    assert.strictEqual(report.snapshotPath, genericRequest, `expected plan fallback to replay through the paired request snapshot, got: ${report.snapshotPath}`);
    assert.strictEqual(report.summary.origin, "native_ai_breakdown", `expected native_ai_breakdown origin, got: ${report.summary && report.summary.origin}`);
    assert.strictEqual(report.nextCommand, EXPECTED_NEXT_COMMAND, `unexpected next command: ${report.nextCommand}`);
    assert(
      !JSON.stringify(report).includes(genericApply),
      `expected inspector to skip the generic apply report, got:\n${result.stdout}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertNoBreakdownArtifactsDiagnostic() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-breakdown-postprocess-"));
  const reportsDir = path.join(tempDir, "reports");
  const requestsDir = path.join(tempDir, "requests");
  const inspector = path.join(__dirname, "inspect-native-ai-breakdown-postprocess.js");

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(requestsDir, { recursive: true });

  const genericApply = path.join(reportsDir, "mnaipro-2000000000010-111111-apply-2000000000015.json");
  const genericPlan = path.join(reportsDir, "mnaipro-2000000000010-111111-plan.json");
  const genericRequest = path.join(requestsDir, "mnaipro-2000000000010-111111.json");

  try {
    writeJsonFile(genericRequest, {
      origin: "",
      objective: "整理当前选中分支",
      stage: "primary",
      dryRun: true,
      nodes: sampleNodes()
    });
    writeJsonFile(genericPlan, {
      origin: "",
      objective: "整理当前选中分支",
      stage: "primary",
      dryRun: true,
      actions: [
        {
          type: "set_color_index",
          noteId: "bd-root"
        }
      ],
      notes: [],
      unsupportedActions: [],
      strategyPacks: []
    });
    writeJsonFile(genericApply, {
      origin: "",
      command: "整理当前选中分支",
      actionCount: 1,
      results: [
        {
          ok: true,
          type: "set_color_index",
          noteId: "bd-root"
        }
      ],
      afterBranch: {
        notes: sampleNodes()
      }
    });

    const result = spawnSync(process.execPath, [inspector, "--json"], {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        MN_AGENT_REPORTS_DIR: reportsDir,
        MN_AGENT_REQUESTS_DIR: requestsDir
      },
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024
    });

    assert.strictEqual(result.status, 0, `inspector exited with ${result.status}: ${result.stderr || result.stdout}`);
    const report = JSON.parse(result.stdout);
    assert.strictEqual(report.ok, false, `expected no-artifact diagnostic to set ok=false, got: ${report.ok}`);
    assert.strictEqual(report.kind, "native_ai_breakdown_postprocess", `unexpected kind: ${report.kind}`);
    assert.strictEqual(report.error, "no_breakdown_artifacts", `unexpected error: ${report.error}`);
    assert.strictEqual(report.reportsDir, reportsDir, `expected reportsDir to match fixture, got: ${report.reportsDir}`);
    assert.strictEqual(report.requestsDir, requestsDir, `expected requestsDir to match fixture, got: ${report.requestsDir}`);
    assert(report.latestGeneric, "expected latestGeneric summary");
    assert.strictEqual(report.latestGeneric.request.file, path.basename(genericRequest), `unexpected generic request file: ${report.latestGeneric.request && report.latestGeneric.request.file}`);
    assert.strictEqual(report.latestGeneric.plan.file, path.basename(genericPlan), `unexpected generic plan file: ${report.latestGeneric.plan && report.latestGeneric.plan.file}`);
    assert.strictEqual(report.latestGeneric.apply.file, path.basename(genericApply), `unexpected generic apply file: ${report.latestGeneric.apply && report.latestGeneric.apply.file}`);
    assert.strictEqual(report.latestGeneric.request.origin, "", `unexpected request origin: ${report.latestGeneric.request && report.latestGeneric.request.origin}`);
    assert.strictEqual(report.latestGeneric.plan.origin, "", `unexpected plan origin: ${report.latestGeneric.plan && report.latestGeneric.plan.origin}`);
    assert.strictEqual(report.latestGeneric.apply.origin, "", `unexpected apply origin: ${report.latestGeneric.apply && report.latestGeneric.apply.origin}`);
    assert.strictEqual(report.nextCommand, EXPECTED_NEXT_COMMAND, `unexpected next command: ${report.nextCommand}`);

    const compactResult = spawnSync(process.execPath, [inspector, "--compact"], {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        MN_AGENT_REPORTS_DIR: reportsDir,
        MN_AGENT_REQUESTS_DIR: requestsDir
      },
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024
    });

    assert.strictEqual(
      compactResult.status,
      0,
      `compact inspector exited with ${compactResult.status}: ${compactResult.stderr || compactResult.stdout}`
    );
    assert(
      /next=mnaipro breakdown artifacts --json/.test(compactResult.stdout || ""),
      `expected compact output to include next command, got:\n${compactResult.stdout}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertNoBranchNodesDiagnosticIncludesNextCommand() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-breakdown-postprocess-"));
  const emptyInput = path.join(tempDir, "empty.json");
  const inspector = path.join(__dirname, "inspect-native-ai-breakdown-postprocess.js");

  try {
    writeJsonFile(emptyInput, []);

    const jsonResult = spawnSync(process.execPath, [inspector, "--input", emptyInput, "--json"], {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024
    });

    assert.strictEqual(
      jsonResult.status,
      0,
      `input inspector exited with ${jsonResult.status}: ${jsonResult.stderr || jsonResult.stdout}`
    );
    const report = JSON.parse(jsonResult.stdout);
    assert.strictEqual(report.ok, false, `expected no-nodes report to set ok=false, got: ${report.ok}`);
    assert.strictEqual(report.error, "no_branch_nodes", `unexpected error: ${report.error}`);
    assert.strictEqual(report.nextCommand, EXPECTED_NEXT_COMMAND, `unexpected next command: ${report.nextCommand}`);

    const compactResult = spawnSync(process.execPath, [inspector, "--input", emptyInput, "--compact"], {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024
    });

    assert.strictEqual(
      compactResult.status,
      0,
      `compact input inspector exited with ${compactResult.status}: ${compactResult.stderr || compactResult.stdout}`
    );
    assert(
      /next=mnaipro breakdown artifacts --json/.test(compactResult.stdout || ""),
      `expected compact no-nodes output to include next command, got:\n${compactResult.stdout}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const result = buildBreakdownPostprocessPlan({
    nodes: sampleNodes(),
    dryRun: true
  });

  assert(result && result.plan, "missing breakdown postprocess plan");
  assert(result.payload.origin === "native_ai_breakdown", "missing native_ai_breakdown origin");
  assert(result.plan.origin === "native_ai_breakdown", "plan origin not preserved");
  assert(
    (result.plan.notes || []).some((item) => item.type === "native_ai_breakdown_context"),
    "expected native_ai_breakdown_context note"
  );
  assert(
    (result.plan.actions || []).some(
      (action) => action.type === "rewrite_excerpt" && action.meta?.source === "branch_structure_digest"
    ),
    "expected branch overview excerpt action for breakdown postprocess"
  );
  assert(
    Array.isArray(result.plan.strategyPacks) && result.plan.strategyPacks.length === 1,
    "expected one strategy pack for breakdown postprocess"
  );
  assert(
    result.plan.strategyPacks[0].type === "visual_branch_strategy",
    `expected visual_branch_strategy pack, got ${result.plan.strategyPacks[0].type}`
  );
  assert(
    result.signals.parentSummaryCandidateCount >= 3,
    "expected breakdown signals to detect parent summary candidates"
  );

  process.stdout.write(
    `Breakdown postprocess checks OK: actions=${result.plan.actions.length}, notes=${result.plan.notes.length}, strategy_packs=${result.plan.strategyPacks.length}, summary_candidates=${result.signals.parentSummaryCandidateCount}\n`
  );

  assertLatestBreakdownApplySelection();
  assertLatestBreakdownRequestSelection();
  assertLatestBreakdownPlanSelection();
  assertNoBreakdownArtifactsDiagnostic();
  assertNoBranchNodesDiagnosticIncludesNextCommand();
}

main();
