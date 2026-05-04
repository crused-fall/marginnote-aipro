const fs = require("fs");
const os = require("os");
const path = require("path");
const { planResponse } = require("../bridge/planner");

const BRIDGE_DIR =
  process.env.MN_AGENT_BRIDGE_DIR ||
  path.join(
    os.homedir(),
    "Library",
    "Containers",
    "QReader.MarginStudy.easy",
    "Data",
    "Library",
    "Caches",
    "MNAIProBridge"
  );
const REQUESTS_DIR = path.join(BRIDGE_DIR, "requests");
const RESPONSES_DIR = path.join(BRIDGE_DIR, "responses");

function parseArgs(argv) {
  const args = {
    all: false,
    latest: false,
    requestPath: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--all") {
      args.all = true;
      continue;
    }
    if (value === "--latest") {
      args.latest = true;
      continue;
    }
    if (value === "--request" && argv[i + 1]) {
      args.requestPath = argv[i + 1];
      i += 1;
    }
  }

  if (!args.all && !args.latest && !args.requestPath) {
    args.latest = true;
  }

  return args;
}

function listRequestFiles() {
  return fs
    .readdirSync(REQUESTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const fullPath = path.join(REQUESTS_DIR, file);
      return {
        file,
        fullPath,
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((a, b) => a.mtimeMs - b.mtimeMs);
}

function selectRequests(args) {
  if (args.requestPath) {
    return [{ file: path.basename(args.requestPath), fullPath: args.requestPath }];
  }

  const files = listRequestFiles();
  if (args.all) return files;
  if (!files.length) return [];
  return [files[files.length - 1]];
}

function summarizePlan(plan) {
  return {
    actions: Array.isArray(plan?.actions) ? plan.actions.length : 0,
    notes: Array.isArray(plan?.notes) ? plan.notes.length : 0,
    unsupportedActions: Array.isArray(plan?.unsupportedActions)
      ? plan.unsupportedActions.length
      : 0,
  };
}

function loadCachedResponse(requestFileName) {
  const responsePath = path.join(RESPONSES_DIR, requestFileName);
  if (!fs.existsSync(responsePath)) return null;
  return JSON.parse(fs.readFileSync(responsePath, "utf8"));
}

function compareResponses(generated, cached) {
  if (!cached) {
    return {
      matches: false,
      reason: "missing_cached_response",
      generated: summarizePlan(generated.plan),
      cached: null,
    };
  }

  const generatedText = JSON.stringify(generated);
  const cachedText = JSON.stringify(cached);
  if (generatedText === cachedText) {
    return {
      matches: true,
      reason: "exact_match",
      generated: summarizePlan(generated.plan),
      cached: summarizePlan(cached.plan),
    };
  }

  return {
    matches: false,
    reason: "response_changed",
    generated: summarizePlan(generated.plan),
    cached: summarizePlan(cached.plan),
  };
}

function replayRequest(requestInfo) {
  const payload = JSON.parse(fs.readFileSync(requestInfo.fullPath, "utf8"));
  const generated = planResponse(payload);
  const cached = loadCachedResponse(requestInfo.file);
  const comparison = compareResponses(generated, cached);

  return {
    request: requestInfo.file,
    requestPath: requestInfo.fullPath,
    comparison,
  };
}

function formatResult(result) {
  const lines = [
    `Request: ${result.request}`,
    `Path: ${result.requestPath}`,
    `Status: ${result.comparison.matches ? "MATCH" : "DIFF"}`,
    `Reason: ${result.comparison.reason}`,
    `Generated: actions=${result.comparison.generated.actions}, notes=${result.comparison.generated.notes}, unsupported=${result.comparison.generated.unsupportedActions}`,
  ];

  if (result.comparison.cached) {
    lines.push(
      `Cached: actions=${result.comparison.cached.actions}, notes=${result.comparison.cached.notes}, unsupported=${result.comparison.cached.unsupportedActions}`
    );
  }

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const requests = selectRequests(args);

  if (!requests.length) {
    process.stdout.write(`No request files found in ${REQUESTS_DIR}\n`);
    return;
  }

  const results = requests.map(replayRequest);
  const mismatchCount = results.filter((item) => !item.comparison.matches).length;

  results.forEach((result, index) => {
    process.stdout.write(`${formatResult(result)}\n`);
    if (index < results.length - 1) {
      process.stdout.write("\n---\n");
    }
  });

  process.stdout.write(`\nTotal: ${results.length}, mismatches: ${mismatchCount}\n`);
  if (mismatchCount > 0) {
    process.exitCode = 1;
  }
}

main();
