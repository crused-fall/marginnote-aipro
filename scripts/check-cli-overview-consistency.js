const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { bridgeStatus } = require("../bridge/server");

const ROOT_DIR = path.resolve(__dirname, "..");
const CLI_PATH = path.join(ROOT_DIR, "cli", "mnaipro.js");

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function createStatusServer() {
  let statusRequestCount = 0;
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/status") {
      statusRequestCount += 1;
      if (statusRequestCount === 1) {
        sendJson(res, 200, bridgeStatus());
      } else {
        sendJson(res, 500, {
          ok: false,
          error: "transient_bridge_failure",
        });
      }
      return;
    }

    sendJson(res, 404, {
      ok: false,
      error: "not_found",
    });
  });

  return {
    server,
    getStatusRequestCount: () => statusRequestCount,
  };
}

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      cwd: ROOT_DIR,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({
        code,
        signal,
        stdout,
        stderr,
      });
    });
  });
}

async function main() {
  const tempVaultPath = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-overview-vault-"));
  const { server, getStatusRequestCount } = createStatusServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const result = await runCli([
      "--base-url",
      baseUrl,
      "--obsidian-vault-path",
      tempVaultPath,
      "overview",
      "--json",
    ]);

    assert.strictEqual(result.code, 0, `overview should pass\n${result.stderr || result.stdout}`);

    const report = JSON.parse(result.stdout);
    assert.strictEqual(
      getStatusRequestCount(),
      1,
      `overview should reuse the initial /status probe once\n${result.stdout}`
    );
    assert.strictEqual(report.status.source, "live_http", "overview status should stay live");
    assert.strictEqual(
      report.doctor.source,
      "live_http",
      "overview doctor should reuse the same live status"
    );
    assert.strictEqual(
      report.highlights.bridgeLive,
      true,
      "overview should keep the bridge-live highlight aligned with the shared status probe"
    );

    process.stdout.write("CLI overview consistency checks OK\n");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tempVaultPath, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message || String(error)}\n`);
  process.exitCode = 1;
});
