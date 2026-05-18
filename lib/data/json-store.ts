import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

declare global {
  var __vintedautoJsonWriteQueues: Map<string, Promise<void>> | undefined;
}

function getWriteQueues() {
  if (!globalThis.__vintedautoJsonWriteQueues) {
    globalThis.__vintedautoJsonWriteQueues = new Map();
  }

  return globalThis.__vintedautoJsonWriteQueues;
}

function queueJsonWrite<T>(filePath: string, operation: () => Promise<T>) {
  const queues = getWriteQueues();
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
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      const fallback = createFallback();
      await writeJsonFile(filePath, fallback);
      return fallback;
    }

    throw error;
  }
}

export async function writeJsonFile(filePath: string, value: unknown) {
  return queueJsonWrite(filePath, () =>
    writeFileAtomically(filePath, JSON.stringify(value, null, 2))
  );
}
