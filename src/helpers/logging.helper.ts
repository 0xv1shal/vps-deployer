import fs from "fs";
import path from "path";
import { getWorkDirPath } from "./arg.helper.ts";

type LogLevel = "INFO" | "ERROR" | "WARN" | "DEBUG";

let writeStream: fs.WriteStream | null = null;

const getStream = () => {
  if (writeStream) return writeStream;

  const dir = getWorkDirPath();
  const filePath = path.join(dir, "vps-deployer.log");

  writeStream = fs.createWriteStream(filePath, { flags: "a" });

  return writeStream;
};

export const writeToLogFile = (
  message: string,
  options?: {
    level?: LogLevel;
    source?: string;
    meta?: Record<string, any>;
  }
) => {
  const stream = getStream();

  const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
  const level = options?.level || "INFO";
  const source = options?.source || "APP";
  const meta = options?.meta ? ` | ${JSON.stringify(options.meta)}` : "";

  const logLine = `[${timestamp}] [${level}] [${source}] ${message}${meta}\n`;

  stream.write(logLine);
};

export const closeLogger = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!writeStream) return resolve();

    writeStream.end(() => {
      writeStream = null;
      resolve();
    });
  });
};