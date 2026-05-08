const Module = require("node:module");
const path = require("node:path");

const buildRoot = path.join(process.cwd(), ".test-build");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolvePathAlias(
  request,
  parent,
  isMain,
  options
) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(buildRoot, request.slice(2)),
      parent,
      isMain,
      options
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
