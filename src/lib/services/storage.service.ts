import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.env.FILE_STORAGE_PATH || "uploads";

export async function saveFile(buffer: Buffer, fileName: string) {
  await fs.mkdir(root, { recursive: true });
  const safe = `${Date.now()}-${fileName.replace(/\s+/g, "-")}`;
  const absPath = path.join(root, safe);
  await fs.writeFile(absPath, buffer);
  return { path: absPath, name: safe };
}
