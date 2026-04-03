import { execSync } from "child_process";
import fs from "fs";
import { writeToLogFile } from "./logging.helper.ts";

export const startSystemdService = (serviceName: string) => {
  const serviceFilePath = `/etc/systemd/system/${serviceName}.service`;
  if (!fs.existsSync(serviceFilePath)) {
    throw new Error(
      `Service file not found at ${serviceFilePath}. Run "vps-deployer -w <dir> -p <port> -s <key>" first to generate it.`,
    );
  }
  try {
    execSync("systemctl daemon-reload", { stdio: "inherit" });
    execSync(`systemctl enable ${serviceName}`, { stdio: "inherit" });
    execSync(`systemctl start ${serviceName}`, { stdio: "inherit" });
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