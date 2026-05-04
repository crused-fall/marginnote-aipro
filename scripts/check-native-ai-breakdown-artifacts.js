const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const INSPECTOR = path.join(__dirname, "inspect-native-ai-breakdown-artifacts.js");
const CLI = path.join(ROOT_DIR, "cli", "mnaipro.js");

function writeJsonFile(fullPath, payload) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2), "utf8");
}

function sampleNodes() {
  return [
    {
      noteId: "bd-root",
      parentNoteId: null,
      title: "Chapter 1",
      tags: [],
      mainExcerptText: "",
      allText: "Chapter 1",
      commentsText: [],
      childNoteIds: ["bd-a", "bd-b"],
      colorIndex: 0,
      fillIndex: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 0,
      groupMode: "",
    },
    {
      noteId: "bd-a",
      parentNoteId: "bd-root",
      title: "Topic A",
      tags: [],
      mainExcerptText: "",
      allText: "Topic A",
      commentsText: [],
      childNoteIds: [],
      colorIndex: 3,
      fillIndex: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: "",
    },
    {
      noteId: "bd-b",
      parentNoteId: "bd-root",
      title: "Topic B",
      tags: [],
      mainExcerptText: "",
      allText: "Topic B",
      commentsText: [],
      childNoteIds: [],
      colorIndex: 4,
      fillIndex: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: "",
    },
  ];
}

function runNode(scriptPath, args, env) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024,
  });
}

function assertCompleteAuditFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-breakdown-artifacts-"));
  const reportsDir = path.join(tempDir, "reports");
  const requestsDir = path.join(tempDir, "requests");

  const requestId = "3000000000001-111111";
  const requestFile = path.join(requestsDir, `mnaipro-${requestId}.json`);
  const planFile = path.join(reportsDir, `mnaipro-${requestId}-plan.json`);
  const applyFile = path.join(reportsDir, `mnaipro-${requestId}-apply-3000000000100.json`);
  const followupFile = path.join(reportsDir, `mnaipro-${requestId}-followup.json`);
  const followupApplyFile = path.join(
    reportsDir,
    `mnaipro-${requestId}-followup-apply-3000000000101.json`
  );

  try {
    writeJsonFile(requestFile, {
      origin: "native_ai_breakdown",
      objective: "整理 AI Breakdown 分支",
      stage: "primary",
      dryRun: true,
      nodes: sampleNodes(),
    });
    writeJsonFile(planFile, {
      origin: "native_ai_breakdown",
      objective: "整理 AI Breakdown 分支",
      stage: "primary",
      actions: [{ type: "set_color_index", noteId: "bd-a" }],
      notes: [{ type: "native_ai_breakdown_context" }],
      unsupportedActions: [],
      strategyPacks: [{ type: "visual_branch_strategy" }],
    });
    writeJsonFile(applyFile, {
      origin: "native_ai_breakdown",
      command: "整理 AI Breakdown 分支",
      objective: "整理 AI Breakdown 分支",
      rootNoteId: "bd-root",
      actionCount: 1,
      results: [{ ok: true, type: "set_color_index", noteId: "bd-a" }],
      afterBranch: {
        notes: sampleNodes(),
      },
    });
    writeJsonFile(followupFile, {
      origin: "native_ai_breakdown",
      objective: "整理 AI Breakdown 分支",
      stage: "followup",
      actions: [
        {
          type: "rewrite_excerpt",
          noteId: "bd-root",
          meta: { source: "branch_structure_digest" },
        },
      ],
      notes: [],
      unsupportedActions: [],
      strategyPacks: [{ type: "visual_branch_strategy" }],
    });
    writeJsonFile(followupApplyFile, {
      origin: "native_ai_breakdown",
      command: "整理 AI Breakdown 分支",
      objective: "整理 AI Breakdown 分支",
      rootNoteId: "bd-root",
      actionCount: 1,
      results: [{ ok: true, type: "rewrite_excerpt", noteId: "bd-root" }],
      afterBranch: {
        notes: sampleNodes(),
      },
    });

    const env = {
      MN_AGENT_REPORTS_DIR: reportsDir,
      MN_AGENT_REQUESTS_DIR: requestsDir,
    };

    const inspectorResult = runNode(INSPECTOR, ["--json"], env);
    assert.strictEqual(
      inspectorResult.status,
      0,
      `artifact inspector exited with ${inspectorResult.status}: ${inspectorResult.stderr || inspectorResult.stdout}`
    );
    const inspector = JSON.parse(inspectorResult.stdout);
    assert.strictEqual(inspector.ok, true, `expected ok=true, got: ${inspector.ok}`);
    assert.strictEqual(inspector.kind, "native_ai_breakdown_artifacts");
    assert.strictEqual(inspector.status, "complete", `expected complete status, got: ${inspector.status}`);
    assert.strictEqual(
      inspector.nextCommand,
      "mnaipro breakdown postprocess --json",
      `unexpected inspector next command: ${inspector.nextCommand}`
    );
    assert.strictEqual(inspector.primaryChain.complete, true, "expected primary chain complete");
    assert.strictEqual(inspector.followupChain.complete, true, "expected followup chain complete");
    assert.strictEqual(inspector.breakdown.request.requestId, requestId, "request id should match");
    assert.strictEqual(inspector.breakdown.apply.requestId, requestId, "apply request id should match");
    assert.strictEqual(inspector.breakdown.followup.requestId, requestId, "followup request id should match");
    assert.strictEqual(
      inspector.breakdown.followupApply.requestId,
      requestId,
      "followup apply request id should match"
    );

    const cliResult = runNode(CLI, ["breakdown", "artifacts", "--json"], env);
    assert.strictEqual(
      cliResult.status,
      0,
      `cli breakdown artifacts exited with ${cliResult.status}: ${cliResult.stderr || cliResult.stdout}`
    );
    const cli = JSON.parse(cliResult.stdout);
    assert.strictEqual(cli.kind, "native_ai_breakdown_artifacts");
    assert.strictEqual(cli.status, "complete", `expected cli complete status, got: ${cli.status}`);
    assert.strictEqual(
      cli.nextCommand,
      "mnaipro breakdown postprocess --json",
      `unexpected cli next command: ${cli.nextCommand}`
    );

    const cliCompact = runNode(CLI, ["breakdown", "artifacts", "--compact"], env);
    assert.strictEqual(
      cliCompact.status,
      0,
      `cli breakdown artifacts compact exited with ${cliCompact.status}: ${cliCompact.stderr || cliCompact.stdout}`
    );
    assert(
      /next=mnaipro breakdown postprocess --json/.test(cliCompact.stdout || ""),
      `compact output missing breakdown next command: ${cliCompact.stdout}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertMissingBreakdownAuditFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-breakdown-artifacts-"));
  const reportsDir = path.join(tempDir, "reports");
  const requestsDir = path.join(tempDir, "requests");

  try {
    writeJsonFile(path.join(requestsDir, "mnaipro-4000000000001-222222.json"), {
      origin: "",
      objective: "整理当前选中分支",
      stage: "primary",
      dryRun: true,
      nodes: sampleNodes(),
    });
    writeJsonFile(path.join(reportsDir, "mnaipro-4000000000001-222222-plan.json"), {
      origin: "",
      objective: "整理当前选中分支",
      stage: "primary",
      actions: [{ type: "set_color_index", noteId: "bd-root" }],
      notes: [],
      unsupportedActions: [],
      strategyPacks: [],
    });
    writeJsonFile(path.join(reportsDir, "mnaipro-4000000000001-222222-apply-4000000000100.json"), {
      origin: "",
      command: "整理当前选中分支",
      objective: "整理当前选中分支",
      rootNoteId: "bd-root",
      actionCount: 1,
      results: [{ ok: true, type: "set_color_index", noteId: "bd-root" }],
      afterBranch: {
        notes: sampleNodes(),
      },
    });

    const env = {
      MN_AGENT_REPORTS_DIR: reportsDir,
      MN_AGENT_REQUESTS_DIR: requestsDir,
    };

    const inspectorResult = runNode(INSPECTOR, ["--json"], env);
    assert.strictEqual(
      inspectorResult.status,
      0,
      `artifact inspector exited with ${inspectorResult.status}: ${inspectorResult.stderr || inspectorResult.stdout}`
    );
    const inspector = JSON.parse(inspectorResult.stdout);
    assert.strictEqual(inspector.kind, "native_ai_breakdown_artifacts");
    assert.strictEqual(inspector.status, "missing", `expected missing status, got: ${inspector.status}`);
    assert.strictEqual(
      inspector.nextCommand,
      "mnaipro breakdown artifacts --json",
      `unexpected missing inspector next command: ${inspector.nextCommand}`
    );
    assert.strictEqual(inspector.primaryChain.complete, false, "missing fixture should not have primary complete");
    assert.strictEqual(inspector.breakdown.request, null, "missing fixture should not find breakdown request");
    assert(inspector.genericFallback, "expected generic fallback summary");
    assert.strictEqual(
      inspector.genericFallback.apply.origin,
      "",
      `expected generic apply origin to stay empty, got: ${inspector.genericFallback.apply.origin}`
    );
    assert(
      Array.isArray(inspector.hints) && inspector.hints.length >= 1,
      "expected missing fixture hints"
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  assertCompleteAuditFixture();
  assertMissingBreakdownAuditFixture();
  process.stdout.write("Breakdown artifact audit checks OK\n");
}

main();
