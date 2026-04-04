import {  spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getHomeDir } from "./get_home_dir.helper.ts";
import { writeToLogFile } from "./logging.helper.ts";
const runSystemctl = (args: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn("systemctl", ["--user", ...args], { stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`systemctl --user ${args.join(" ")} exited with code ${code}`));
    });
  });
};
export const startSystemdService = async (serviceName: string) => {
  const serviceFilePath = path.join(getHomeDir(), ".config", "systemd", "user", `${serviceName}.service`);
  if (!fs.existsSync(serviceFilePath)) {
    throw new Error(
      `Service file not found at ${serviceFilePath}. Run "vps-deployer config -w <dir> -p <port> -s <key>" first to generate it.`,
    );
  }
  try {
    await runSystemctl(["daemon-reload"]);
    await runSystemctl(["enable", serviceName]);
    await runSystemctl(["start", serviceName]);
    writeToLogFile(`Service ${serviceName} enabled and started`, {
      level: "INFO",
      source: "SYS",
    });
  } catch (err: any) {
    writeToLogFile(`Failed to start service: ${err.message}`, {
      level: "ERROR",
      source: "SYS",
    });
    throw err;
  }
};