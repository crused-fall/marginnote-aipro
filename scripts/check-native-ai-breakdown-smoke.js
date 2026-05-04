const assert = require("assert");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { createCommandRunner } = require("../plugin");
const { createMockApi, createSampleSelection, MockNode } = require("../plugin/mock-api");

const OBJECTIVE = "整理 AI Breakdown 分支";
const ORIGIN = "native_ai_breakdown";
const ROOT_DIR = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const options = {
    caseName: "all",
    output: "pretty",
    bridgeBaseUrl: process.env.MN_AGENT_BASE_URL || "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      options.output = "json";
      continue;
    }
    if (arg === "--compact") {
      options.output = "compact";
      continue;
    }
    if (arg === "--case" && argv[i + 1]) {
      options.caseName = normalizeCaseName(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith("--case=")) {
      options.caseName = normalizeCaseName(arg.slice("--case=".length));
      continue;
    }
    if (arg === "--visible") {
      options.caseName = "visible";
      continue;
    }
    if (arg === "--grouped-overview") {
      options.caseName = "grouped-overview";
      continue;
    }
    if (arg === "--organized-enough" || arg === "--zero-action") {
      options.caseName = "organized-enough";
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--bridge-base-url" && argv[i + 1]) {
      options.bridgeBaseUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--bridge-base-url=")) {
      options.bridgeBaseUrl = arg.slice("--bridge-base-url=".length);
      continue;
    }
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("free_port_unavailable"));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

function startBridgeServer(port, bridgeDir, vaultPath) {
  const scriptPath = path.join(ROOT_DIR, "bridge", "server.js");
  const child = spawn(process.execPath, [scriptPath], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      MN_AGENT_PORT: String(port),
      MN_AGENT_HOST: "127.0.0.1",
      MN_AGENT_BRIDGE_DIR: bridgeDir,
      MN_AGENT_REQUESTS_DIR: path.join(bridgeDir, "requests"),
      MN_AGENT_RESPONSES_DIR: path.join(bridgeDir, "responses"),
      MN_AGENT_REPORTS_DIR: path.join(bridgeDir, "reports"),
      MN_AGENT_DIAGNOSTICS_DIR: path.join(bridgeDir, "diagnostics"),
      MN_BRIDGE_SUPERVISOR_STATE_DIR: path.join(bridgeDir, "supervisor-state"),
      MN_OBSIDIAN_VAULT_PATH: vaultPath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = { stdout: "", stderr: "" };
  child.stdout.on("data", (chunk) => {
    logs.stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    logs.stderr += chunk.toString("utf8");
  });
  return {
    child,
    logs,
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    bridgeDir,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = {
      ok: false,
      error: "non_json_response",
      body: text,
    };
  }
  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

async function waitForBridgeStatus(baseUrl, bridgeProcess, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (bridgeProcess && bridgeProcess.child) {
      if (bridgeProcess.child.exitCode !== null || bridgeProcess.child.signalCode !== null) {
        throw new Error(
          `bridge server exited early with code ${bridgeProcess.child.exitCode}\n${
            bridgeProcess.logs.stderr || bridgeProcess.logs.stdout || "(no output)"
          }`
        );
      }
    }
    try {
      const status = await fetchJson(`${baseUrl}/status`);
      if (status.ok && status.payload && status.payload.ok === true) {
        return status;
      }
      lastError = new Error(`unexpected_status_${status.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(
    `bridge server not ready: ${lastError ? lastError.message : "timeout"}\n${
      bridgeProcess.logs.stderr || bridgeProcess.logs.stdout || "(no output)"
    }`
  );
}

function stopBridgeServer(bridgeProcess) {
  return new Promise((resolve, reject) => {
    if (
      !bridgeProcess ||
      !bridgeProcess.child ||
      bridgeProcess.child.exitCode !== null ||
      bridgeProcess.child.signalCode !== null
    ) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      try {
        bridgeProcess.child.kill("SIGKILL");
      } catch (error) {
        // Best effort cleanup only.
      }
    }, 3000);
    bridgeProcess.child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    try {
      bridgeProcess.child.kill("SIGTERM");
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

function normalizeCaseName(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text || text === "all" || text === "both") return "all";
  if (["visible", "primary", "default", "normal", "action"].includes(text)) {
    return "visible";
  }
  if (["grouped-overview", "grouped_overview", "overview", "digest"].includes(text)) {
    return "grouped-overview";
  }
  if (
    [
      "organized-enough",
      "organized_enough",
      "zero",
      "zero-action",
      "empty",
      "noop",
      "already-organized",
    ].includes(text)
  ) {
    return "organized-enough";
  }
  return text;
}

function buildOrganizedEnoughSelection() {
  return [
    new MockNode({
      noteId: "z-root",
      title: "Already organized branch",
      tags: ["summary"],
      mainExcerptText: "This branch already has a concise overview.",
      allText: "Already organized branch. This branch already has a concise overview.",
      commentsText: [],
      childNodes: [],
      visualDepth: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 0,
    }),
  ];
}

function buildGroupedOverviewSelection() {
  const definitionLeaf1 = new MockNode({
    noteId: "g-4",
    title: "Residue theorem",
    tags: [],
    mainExcerptText: "Definition of a residue family",
    allText: "Definition of a residue family and notation",
    commentsText: [],
    visualDepth: 2,
    visibleInMindMap: true,
    zLevel: 2,
  });

  const definitionLeaf2 = new MockNode({
    noteId: "g-5",
    title: "Contour integral",
    tags: [],
    mainExcerptText: "Definition of contour integral family",
    allText: "Definition of contour integral family and usage",
    commentsText: [],
    visualDepth: 2,
    visibleInMindMap: true,
    zLevel: 2,
  });

  const proofLeaf1 = new MockNode({
    noteId: "g-6",
    title: "Cauchy formula",
    tags: [],
    mainExcerptText: "Proof sketch based on Cauchy formula",
    allText: "Proof sketch based on Cauchy formula and residues",
    commentsText: [],
    visualDepth: 2,
    visibleInMindMap: true,
    zLevel: 2,
  });

  const proofLeaf2 = new MockNode({
    noteId: "g-7",
    title: "Argument principle",
    tags: [],
    mainExcerptText: "Proof sketch based on argument principle",
    allText: "Proof sketch based on argument principle and winding numbers",
    commentsText: [],
    visualDepth: 2,
    visibleInMindMap: true,
    zLevel: 2,
  });

  const definitionGroup = new MockNode({
    noteId: "g-2",
    title: "Definition",
    tags: ["summary"],
    mainExcerptText: "",
    allText: "Definition",
    commentsText: [],
    childNodes: [definitionLeaf1, definitionLeaf2],
    visualDepth: 1,
    visibleInMindMap: true,
    branchClosed: false,
    hidden: false,
    zLevel: 1,
  });

  const proofGroup = new MockNode({
    noteId: "g-3",
    title: "Proof",
    tags: ["summary"],
    mainExcerptText: "",
    allText: "Proof",
    commentsText: [],
    childNodes: [proofLeaf1, proofLeaf2],
    visualDepth: 1,
    visibleInMindMap: true,
    branchClosed: false,
    hidden: false,
    zLevel: 1,
  });

  const root = new MockNode({
    noteId: "g-1",
    title: "Residue theorem",
    tags: ["complex-analysis"],
    mainExcerptText: "",
    allText: "Residue theorem",
    commentsText: [],
    childNodes: [definitionGroup, proofGroup],
    visualDepth: 0,
    visibleInMindMap: true,
    branchClosed: false,
    hidden: false,
    zLevel: 0,
  });

  definitionLeaf1.parentNode = definitionGroup;
  definitionLeaf2.parentNode = definitionGroup;
  proofLeaf1.parentNode = proofGroup;
  proofLeaf2.parentNode = proofGroup;
  definitionGroup.parentNode = root;
  proofGroup.parentNode = root;

  return [
    root,
    definitionGroup,
    proofGroup,
    definitionLeaf1,
    definitionLeaf2,
    proofLeaf1,
    proofLeaf2,
  ];
}

function buildNodesForCase(caseName) {
  if (caseName === "organized-enough") {
    return buildOrganizedEnoughSelection();
  }
  if (caseName === "grouped-overview") {
    return buildGroupedOverviewSelection();
  }
  return createSampleSelection();
}

function createRunner(caseName, mode, api, bridgeBaseUrl) {
  return createCommandRunner({
    objective: OBJECTIVE,
    origin: ORIGIN,
    mode,
    bridgeBaseUrl,
    api,
  });
}

function noteTypes(plan) {
  return (plan.notes || [])
    .map((item) => item && item.type)
    .filter(Boolean);
}

function strategyPacks(plan) {
  return Array.isArray(plan.strategyPacks) ? plan.strategyPacks : [];
}

function strategyTypes(plan) {
  return strategyPacks(plan)
    .map((item) => item && item.type)
    .filter(Boolean);
}

function actionTypes(plan) {
  return (plan.actions || []).map((item) => item && item.type).filter(Boolean);
}

function summarizePlan(plan) {
  const packs = strategyPacks(plan);
  const primaryPack = packs[0] || null;
  return {
    objective: plan.objective,
    origin: plan.origin,
    stage: plan.stage,
    actionCount: (plan.actions || []).length,
    strategyPackCount: packs.length,
    strategyTypes: strategyTypes(plan),
    noteTypes: noteTypes(plan),
    actionTypes: actionTypes(plan),
    deferredSemanticCount:
      primaryPack && typeof primaryPack.deferredSemanticCount === "number"
        ? primaryPack.deferredSemanticCount
        : null,
    deferredVisualCount:
      primaryPack && typeof primaryPack.deferredVisualCount === "number"
        ? primaryPack.deferredVisualCount
        : null,
    visibleActionCounts: primaryPack ? primaryPack.visibleActionCounts || null : null,
  };
}

function assertVisibleScenario(plan, label) {
  assert(plan, `${label}: missing plan`);
  assert.strictEqual(plan.objective, OBJECTIVE, `${label}: objective mismatch`);
  assert.strictEqual(plan.origin, ORIGIN, `${label}: origin mismatch`);
  assert(
    noteTypes(plan).includes("native_ai_breakdown_context"),
    `${label}: missing native_ai_breakdown_context note`
  );
  assert(
    strategyTypes(plan).includes("visual_branch_strategy"),
    `${label}: missing visual_branch_strategy pack`
  );
  assert(actionTypes(plan).length > 0, `${label}: expected executable actions`);
}

function assertGroupedOverviewScenario(plan, label) {
  assertVisibleScenario(plan, label);
  const groupedDigest = (plan.actions || []).find(
    (action) => action && action.type === "rewrite_excerpt" && action.meta && action.meta.source === "branch_structure_digest"
  );
  assert(groupedDigest, `${label}: missing branch_structure_digest action`);
  assert(
    /当前主要包含/.test(groupedDigest.text || "") || /currently covers/i.test(groupedDigest.text || ""),
    `${label}: expected grouped overview text`
  );
  assert(
    /Definition/.test(groupedDigest.text || "") && /Proof/.test(groupedDigest.text || ""),
    `${label}: expected grouped labels in overview text`
  );
  assert(
    Array.isArray(groupedDigest.meta?.evidence) &&
      groupedDigest.meta.evidence.some((line) => /分组主题|grouped themes/i.test(line)),
    `${label}: expected grouped overview evidence`
  );
}

function assertOrganizedEnoughScenario(plan, label) {
  assert(plan, `${label}: missing plan`);
  assert.strictEqual(plan.objective, OBJECTIVE, `${label}: objective mismatch`);
  assert.strictEqual(plan.origin, ORIGIN, `${label}: origin mismatch`);
  assert(
    noteTypes(plan).includes("native_ai_breakdown_context"),
    `${label}: missing native_ai_breakdown_context note`
  );
  assert(
    strategyTypes(plan).includes("branch_already_organized_strategy"),
    `${label}: missing branch_already_organized_strategy pack`
  );
  assert.strictEqual((plan.actions || []).length, 0, `${label}: expected zero actions`);
  const pack = strategyPacks(plan).find(
    (item) => item && item.type === "branch_already_organized_strategy"
  );
  assert(pack, `${label}: missing organized-enough pack`);
  assert.deepStrictEqual(pack.actionKeys || [], [], `${label}: expected empty actionKeys`);
  assert.deepStrictEqual(
    pack.visibleActionCounts || {},
    {
      set_color_index: 0,
      organize_branch_groups: 0,
      rewrite_excerpt: 0,
    },
    `${label}: expected zero visible action counts`
  );
}

function buildCompactLine(scenario) {
  const packType = (scenario.preview.strategyTypes || [])[0] || "(none)";
  return [
    `${scenario.case}:`,
    `preview=${scenario.preview.actionCount}`,
    `apply=${scenario.apply.actionCount}`,
    `pack=${packType}`,
    `origin=${scenario.preview.origin}`,
    `status=ok`,
  ].join(" ");
}

function formatReport(report, outputMode) {
  if (outputMode === "json") {
    return JSON.stringify(report, null, 2);
  }

  if (outputMode === "compact") {
    const parts = [
      `Breakdown smoke OK (${report.scenarios.length} case${report.scenarios.length === 1 ? "" : "s"})`,
    ];
    if (report.bridge && report.bridge.baseUrl) {
      const bridgeMode = report.bridge.selfHosted ? "self-hosted" : "external";
      parts.push(`bridge=${bridgeMode} base_url=${report.bridge.baseUrl}`);
    }
    if (!report.ok && report.error) {
      parts.push(`error=${String(report.error).replace(/\s+/g, " ").trim()}`);
    }
    parts.push(
      ...report.scenarios.map((scenario) => buildCompactLine(scenario)),
    );
    return parts.join("\n");
  }

  return JSON.stringify(report, null, 2);
}

async function runScenario(caseName, silentHud, bridgeBaseUrl) {
  const nodes = buildNodesForCase(caseName);
  const api = createMockApi(
    nodes,
    silentHud
      ? {
          async showHUD() {},
          async hideHUD() {},
        }
      : {}
  );

  const previewRunner = createRunner(caseName, "preview", api, bridgeBaseUrl);
  const preview = await previewRunner();
  assert.strictEqual(preview.mode, "preview", `${caseName}: preview mode mismatch`);

  const previewPlan = preview.plan || null;
  if (caseName === "organized-enough") {
    assertOrganizedEnoughScenario(previewPlan, `${caseName}: preview`);
  } else if (caseName === "grouped-overview") {
    assertGroupedOverviewScenario(previewPlan, `${caseName}: preview`);
  } else {
    assertVisibleScenario(previewPlan, `${caseName}: preview`);
  }

  const applyRunner = createRunner(caseName, "apply", api, bridgeBaseUrl);
  const apply = await applyRunner();
  assert.strictEqual(apply.mode, "apply", `${caseName}: apply mode mismatch`);
  assert(apply.plan, `${caseName}: apply missing plan`);
  assert.strictEqual(apply.plan.origin, ORIGIN, `${caseName}: apply origin mismatch`);
  assert(
    noteTypes(apply.plan).includes("native_ai_breakdown_context"),
    `${caseName}: apply missing native_ai_breakdown_context note`
  );

  const appliedCount = Array.isArray(apply.results)
    ? apply.results.filter((item) => item && item.ok).length
    : 0;
  const skippedCount = Array.isArray(apply.results)
    ? apply.results.filter((item) => item && item.skipped).length
    : 0;

  if (caseName === "organized-enough") {
    assertOrganizedEnoughScenario(apply.plan, `${caseName}: apply`);
    assert.strictEqual(appliedCount, 0, `${caseName}: expected zero applied actions`);
    assert.strictEqual(skippedCount, 0, `${caseName}: expected zero skipped actions`);
  } else if (caseName === "grouped-overview") {
    assertGroupedOverviewScenario(apply.plan, `${caseName}: apply`);
    assert(appliedCount > 0, `${caseName}: expected at least one applied action`);
  } else {
    assertVisibleScenario(apply.plan, `${caseName}: apply`);
    assert(appliedCount > 0, `${caseName}: expected at least one applied action`);
  }

  return {
    case: caseName,
    preview: summarizePlan(preview.plan),
    apply: {
      mode: apply.mode,
      origin: apply.plan.origin,
      actionCount: (apply.plan.actions || []).length,
      appliedCount,
      skippedCount,
      actionDispositionCounts: apply.actionDispositionCounts || null,
      actionPhaseCounts: apply.actionPhaseCounts || null,
      strategyTypes: strategyTypes(apply.plan),
      noteTypes: noteTypes(apply.plan),
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(
      [
        "Usage: node scripts/check-native-ai-breakdown-smoke.js [--case visible|grouped-overview|organized-enough|all] [--json|--compact]",
        "",
        "Default: runs the visible-action case, the grouped-overview case, and the organized-enough zero-action case.",
        "Use --case visible, --case grouped-overview, or --case organized-enough to run one path at a time.",
        "By default the smoke self-hosts a temporary local bridge and cleans its temp workspace on exit.",
        "Pass --bridge-base-url or MN_AGENT_BASE_URL to point the smoke at an existing bridge instead.",
      ].join("\n") + "\n"
    );
    return;
  }

  const caseNames =
    options.caseName === "all"
      ? ["visible", "grouped-overview", "organized-enough"]
      : [options.caseName];
  const scenarios = [];
  const selfHosted = !options.bridgeBaseUrl;
  const tempDir = selfHosted ? fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-breakdown-smoke-")) : null;
  const bridgeDir = selfHosted ? path.join(tempDir, "bridge") : null;
  const vaultPath = selfHosted ? path.join(tempDir, "vault") : null;
  if (selfHosted) {
    fs.mkdirSync(bridgeDir, { recursive: true });
    fs.mkdirSync(vaultPath, { recursive: true });
  }
  const bridgeBaseUrl = selfHosted ? null : options.bridgeBaseUrl;
  const bridgeProcess = selfHosted
    ? startBridgeServer(await getFreePort(), bridgeDir, vaultPath)
    : { child: null, logs: { stdout: "", stderr: "" }, baseUrl: bridgeBaseUrl };
  const report = {
    ok: false,
    cases: caseNames,
    scenarios,
    bridge: {
      baseUrl: bridgeProcess.baseUrl,
      tempDir,
      vaultPath,
      selfHosted,
      mode: selfHosted ? "self-hosted" : "external",
    },
  };

  const silentHud = options.output !== "pretty";

  try {
    await waitForBridgeStatus(bridgeProcess.baseUrl, bridgeProcess);
    for (const caseName of caseNames) {
      scenarios.push(await runScenario(caseName, silentHud, bridgeProcess.baseUrl));
    }
    report.ok = true;
  } catch (error) {
    report.error = error && error.stack ? error.stack : String(error);
  } finally {
    if (selfHosted) {
      await stopBridgeServer(bridgeProcess);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore best-effort cleanup failures for temp smoke files.
      }
    }
  }

  if (!report.ok && !report.error) {
    report.error = "breakdown_smoke_failed";
  }
  process.stdout.write(`${formatReport(report, options.output)}\n`);
  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
