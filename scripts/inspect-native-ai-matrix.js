const { inspect } = require("./inspect-native-ai");
const {
  buildSupervisionMatrix,
  renderSupervisionMatrixText
} = require("../bridge/native-ai-supervision");

function main() {
  const jsonMode = process.argv.includes("--json");
  const matrix = buildSupervisionMatrix(inspect());
  process.stdout.write(
    jsonMode ? `${JSON.stringify(matrix, null, 2)}\n` : `${renderSupervisionMatrixText(matrix)}\n`
  );
}

main();
