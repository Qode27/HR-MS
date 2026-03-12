import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type Level = "INFO" | "WARN" | "ERROR" | "SECURITY";

const logDir = path.resolve(process.cwd(), "logs");

async function write(level: Level, message: string, payload?: unknown) {
  await mkdir(logDir, { recursive: true });
  const line = `${new Date().toISOString()} [${level}] ${message}${payload ? ` ${JSON.stringify(payload)}` : ""}\n`;
  const file = level === "ERROR" ? "error.log" : level === "SECURITY" ? "security.log" : "app.log";
  await appendFile(path.join(logDir, file), line, "utf8");
}

export const logger = {
  info: (message: string, payload?: unknown) => write("INFO", message, payload),
  warn: (message: string, payload?: unknown) => write("WARN", message, payload),
  error: (message: string, payload?: unknown) => write("ERROR", message, payload),
  security: (message: string, payload?: unknown) => write("SECURITY", message, payload)
};
