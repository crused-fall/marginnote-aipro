#!/usr/bin/env node

require("../cli/mnaipro").main().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
