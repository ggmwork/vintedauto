const { rmSync } = require("node:fs");
const path = require("node:path");

rmSync(path.join(process.cwd(), ".test-build"), {
  force: true,
  recursive: true,
});
