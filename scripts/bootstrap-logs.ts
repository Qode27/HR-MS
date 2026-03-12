import { mkdir } from "node:fs/promises";
import path from "node:path";

async function main() {
  const logs = path.resolve(process.cwd(), "logs");
  await mkdir(logs, { recursive: true });
  console.log(`logs-ready:${logs}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
