import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type Level = "INFO" | "WARN" | "ERROR" | "SECURITY";

const logDir = process.env.WEBSITE_INSTANCE_ID ? "/home/site/logs" : path.resolve(process.cwd(), "logs");

async function write(level: Level, message: string, payload?: unknown) {
  try {
    await mkdir(logDir, { recursive: true });
    const line = `${new Date().toISOString()} [${level}] ${message}${payload ? ` ${JSON.stringify(payload)}` : ""}\n`;
    const file = level === "ERROR" ? "error.log" : level === "SECURITY" ? "security.log" : "app.log";
    await appendFile(path.join(logDir, file), line, "utf8");
  } catch (error) {
    // Logging must never break request handling; fall back to console noise if the filesystem is unavailable.
    console.error(`[${level}] ${message}`, payload, error);
  }
}

export const logger = {
  info: (message: string, payload?: unknown) => write("INFO", message, payload),
  warn: (message: string, payload?: unknown) => write("WARN", message, payload),
  error: (message: string, payload?: unknown) => write("ERROR", message, payload),
  security: (message: string, payload?: unknown) => write("SECURITY", message, payload)
};
