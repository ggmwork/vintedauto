import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

declare global {
  var __vintedautoJsonFileQueues: Map<string, Promise<void>> | undefined;
}

function getFileQueues() {
  if (!globalThis.__vintedautoJsonFileQueues) {
    globalThis.__vintedautoJsonFileQueues = new Map();
  }

  return globalThis.__vintedautoJsonFileQueues;
}

function queueJsonFileOperation<T>(
  filePath: string,
  operation: () => Promise<T>
) {
  const queues = getFileQueues();
  const key = path.resolve(filePath);
  const current = queues.get(key) ?? Promise.resolve();
  const next = current.then(operation, operation);

  queues.set(
    key,
    next.then(
      () => undefined,
      () => undefined
    )
  );

  return next;
}

async function writeFileAtomically(filePath: string, contents: string) {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${randomUUID()}.tmp`
  );

  await mkdir(directory, { recursive: true });
  await writeFile(temporaryPath, contents);

  try {
    await rename(temporaryPath, filePath);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "EEXIST" || error.code === "EPERM")
    ) {
      await rm(filePath, { force: true });
      await rename(temporaryPath, filePath);
      return;
    }

    await rm(temporaryPath, { force: true });
    throw error;
  }
}

function isFileNotFoundError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function readJsonFileFromDisk<T>(
  filePath: string,
  createFallback: () => T,
  normalize: (value: unknown) => T
) {
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    const raw = await readFile(filePath, "utf8");
    return normalize(JSON.parse(raw));
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return createFallback();
    }

    throw error;
  }
}

export async function readJsonFile<T>(
  filePath: string,
  createFallback: () => T,
  normalize: (value: unknown) => T
) {
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    const raw = await readFile(filePath, "utf8");
    return normalize(JSON.parse(raw));
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }
  }

  return queueJsonFileOperation(filePath, async () => {
    try {
      const raw = await readFile(filePath, "utf8");
      return normalize(JSON.parse(raw));
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }
    }

    const fallback = createFallback();
    await writeFileAtomically(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  });
}

export async function writeJsonFile(filePath: string, value: unknown) {
  return queueJsonFileOperation(filePath, () =>
    writeFileAtomically(filePath, JSON.stringify(value, null, 2))
  );
}

export async function mutateJsonFile<T>(
  filePath: string,
  createFallback: () => T,
  normalize: (value: unknown) => T,
  mutator: (value: T) => T | Promise<T>
) {
  return queueJsonFileOperation(filePath, async () => {
    const current = await readJsonFileFromDisk(
      filePath,
      createFallback,
      normalize
    );
    const next = await mutator(current);

    await writeFileAtomically(filePath, JSON.stringify(next, null, 2));
    return next;
  });
}
