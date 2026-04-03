import { execSync } from "child_process";
import fs from "fs";
import { writeToLogFile } from "./logging.helper.ts";
export const removeSystemdService = (serviceName: string) => {
  const serviceFilePath = `/etc/systemd/system/${serviceName}.service`;
  try {
    execSync(`systemctl stop ${serviceName}`, { stdio: "inherit" });
    execSync(`systemctl disable ${serviceName}`, { stdio: "inherit" });
    if (fs.existsSync(serviceFilePath)) {
      fs.unlinkSync(serviceFilePath);
    }
    execSync("systemctl daemon-reload", { stdio: "inherit" });
    writeToLogFile(`Service ${serviceName} removed`, { level: "INFO", source: "SYS" });
  } catch (err: any) {
    console.log(`Failed to remove service: ${err.message}`)
    writeToLogFile(`Failed to remove service: ${err.message}`, { level: "ERROR", source: "SYS" });
    throw err;
  }
};