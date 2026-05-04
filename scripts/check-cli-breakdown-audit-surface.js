const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const CLI = path.join(ROOT_DIR, "cli", "mnaipro.js");
const DEAD_BASE_URL = "http://127.0.0.1:1";

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
  ];
}

function createArtifacts(tempDir) {
  const reportsDir = path.join(tempDir, "reports");
  const requestsDir = path.join(tempDir, "requests");
  const requestId = "6000000000001-444444";
  writeJsonFile(path.join(requestsDir, `mnaipro-${requestId}.json`), {
    origin: "native_ai_breakdown",
    objective: "整理 AI Breakdown 分支",
    stage: "primary",
    dryRun: true,
    nodes: sampleNodes(),
  });
  writeJsonFile(path.join(reportsDir, `mnaipro-${requestId}-plan.json`), {
    origin: "native_ai_breakdown",
    objective: "整理 AI Breakdown 分支",
    stage: "primary",
    actions: [{ type: "set_color_index", noteId: "bd-a" }],
    notes: [{ type: "native_ai_breakdown_context" }],
    unsupportedActions: [],
    strategyPacks: [{ type: "visual_branch_strategy" }],
  });
  writeJsonFile(path.join(reportsDir, `mnaipro-${requestId}-apply-6000000000100.json`), {
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
  writeJsonFile(path.join(reportsDir, `mnaipro-${requestId}-followup.json`), {
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
  writeJsonFile(path.join(reportsDir, `mnaipro-${requestId}-followup-apply-6000000000101.json`), {
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
  return { reportsDir, requestsDir, requestId };
}

function runCli(args, env) {
  return spawnSync(process.execPath, [CLI, ...args], {
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

function assertStatusAndDoctorExposeBreakdownAudit() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-cli-breakdown-audit-"));
  const { reportsDir, requestsDir, requestId } = createArtifacts(tempDir);
  const env = {
    MN_AGENT_REPORTS_DIR: reportsDir,
    MN_AGENT_REQUESTS_DIR: requestsDir,
  };

  try {
    const statusJson = runCli(["status", "--base-url", DEAD_BASE_URL, "--json"], env);
    assert.strictEqual(statusJson.status, 0, `status json failed: ${statusJson.stderr || statusJson.stdout}`);
    const statusPayload = JSON.parse(statusJson.stdout);
    assert(statusPayload.breakdownArtifacts, "status json missing breakdownArtifacts");
    assert.strictEqual(statusPayload.breakdownArtifacts.status, "complete", `unexpected status audit: ${statusPayload.breakdownArtifacts.status}`);
    assert.strictEqual(
      statusPayload.breakdownArtifacts.nextCommand,
      "mnaipro breakdown postprocess --json",
      `unexpected status audit next command: ${statusPayload.breakdownArtifacts.nextCommand}`
    );
    assert.strictEqual(statusPayload.breakdownArtifacts.primaryChain.complete, true, "status primary chain should be complete");
    assert.strictEqual(statusPayload.breakdownArtifacts.followupChain.complete, true, "status followup chain should be complete");
    assert.strictEqual(statusPayload.breakdownArtifacts.primaryChain.requestId, requestId, "status request id should match fixture");
    assert.strictEqual(
      statusPayload.breakdownNextCommand,
      "mnaipro breakdown postprocess --json",
      `unexpected status next command: ${statusPayload.breakdownNextCommand}`
    );

    const statusCompact = runCli(["status", "--base-url", DEAD_BASE_URL, "--compact"], env);
    assert.strictEqual(statusCompact.status, 0, `status compact failed: ${statusCompact.stderr || statusCompact.stdout}`);
    assert(/breakdown=complete/.test(statusCompact.stdout), `status compact missing breakdown status: ${statusCompact.stdout}`);
    assert(
      /next=mnaipro breakdown postprocess --json/.test(statusCompact.stdout),
      `status compact missing breakdown next command: ${statusCompact.stdout}`
    );

    const doctorJson = runCli(["doctor", "--base-url", DEAD_BASE_URL, "--json"], env);
    assert.strictEqual(doctorJson.status, 0, `doctor json failed: ${doctorJson.stderr || doctorJson.stdout}`);
    const doctorPayload = JSON.parse(doctorJson.stdout);
    assert(doctorPayload.breakdownArtifacts, "doctor json missing breakdownArtifacts");
    assert.strictEqual(doctorPayload.breakdownArtifacts.status, "complete", `unexpected doctor audit: ${doctorPayload.breakdownArtifacts.status}`);
    assert.strictEqual(
      doctorPayload.breakdownArtifacts.nextCommand,
      "mnaipro breakdown postprocess --json",
      `unexpected doctor audit next command: ${doctorPayload.breakdownArtifacts.nextCommand}`
    );
    assert.strictEqual(
      doctorPayload.breakdownNextCommand,
      "mnaipro breakdown postprocess --json",
      `unexpected doctor next command: ${doctorPayload.breakdownNextCommand}`
    );

    const doctorCompact = runCli(["doctor", "--base-url", DEAD_BASE_URL, "--compact"], env);
    assert.strictEqual(doctorCompact.status, 0, `doctor compact failed: ${doctorCompact.stderr || doctorCompact.stdout}`);
    assert(/breakdown=complete/.test(doctorCompact.stdout), `doctor compact missing breakdown status: ${doctorCompact.stdout}`);
    assert(
      /next=mnaipro breakdown postprocess --json/.test(doctorCompact.stdout),
      `doctor compact missing breakdown next command: ${doctorCompact.stdout}`
    );

    const bridgeStatusJson = runCli(["bridge", "status", "--base-url", DEAD_BASE_URL, "--json"], env);
    assert.strictEqual(bridgeStatusJson.status, 0, `bridge status json failed: ${bridgeStatusJson.stderr || bridgeStatusJson.stdout}`);
    const bridgeStatusPayload = JSON.parse(bridgeStatusJson.stdout);
    assert(bridgeStatusPayload.breakdownArtifacts, "bridge status json missing breakdownArtifacts");
    assert.strictEqual(bridgeStatusPayload.breakdownArtifacts.status, "complete", `unexpected bridge status audit: ${bridgeStatusPayload.breakdownArtifacts.status}`);
    assert.strictEqual(
      bridgeStatusPayload.breakdownArtifacts.nextCommand,
      "mnaipro breakdown postprocess --json",
      `unexpected bridge status audit next command: ${bridgeStatusPayload.breakdownArtifacts.nextCommand}`
    );
    assert.strictEqual(
      bridgeStatusPayload.breakdownNextCommand,
      "mnaipro breakdown postprocess --json",
      `unexpected bridge status next command: ${bridgeStatusPayload.breakdownNextCommand}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  assertStatusAndDoctorExposeBreakdownAudit();
  process.stdout.write("CLI Breakdown audit surface OK\n");
}

main();
