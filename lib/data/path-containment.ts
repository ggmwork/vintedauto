import path from "node:path";

export function isPathInsideDirectory(directory: string, targetPath: string) {
  const relativePath = path.relative(
    path.resolve(directory),
    path.resolve(targetPath)
  );

  return (
    relativePath === "" ||
    (relativePath.length > 0 &&
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath))
  );
}
