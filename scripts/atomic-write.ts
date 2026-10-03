import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Grava num temporário e renomeia: nunca deixa um arquivo pela metade. */
export async function writeFileAtomic(
  target: string,
  data: string | Uint8Array,
): Promise<void> {
  const temporary = `${target}.${randomUUID().slice(0, 8)}.tmp`;
  await mkdir(path.dirname(target), { recursive: true });

  try {
    await writeFile(temporary, data);
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}
