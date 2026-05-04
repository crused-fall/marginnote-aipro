const { createCommandRunner } = require("../plugin");
const { createMockApi, createSampleSelection } = require("../plugin/mock-api");

async function main() {
  const nodes = createSampleSelection();
  const api = createMockApi(nodes);
  const runCommand = createCommandRunner({
    objective: "整理当前选中分支",
    mode: "preview",
    api,
  });

  const preview = await runCommand();
  console.log(JSON.stringify(preview, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
