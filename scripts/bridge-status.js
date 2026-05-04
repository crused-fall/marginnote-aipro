const http = require("http");
const { bridgeStatus } = require("../bridge/server");

const baseUrl = process.env.MN_AGENT_BASE_URL || "http://127.0.0.1:8765";

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function main() {
  let status;
  try {
    status = await getJson(`${baseUrl}/status`);
    status.source = "live_http";
  } catch (error) {
    status = bridgeStatus();
    status.source = "local_fallback";
    status.bridgeOffline = true;
    status.bridgeOfflineReason = error.message || String(error);
  }
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message || String(error)}\n`);
  process.exitCode = 1;
});
