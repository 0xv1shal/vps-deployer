import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getHomeDir } from "./get_home_dir.helper.ts";
const runSystemctl = (args: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn("systemctl", ["--user", ...args], { stdio: "inherit" });
    child.on("error", (err) => reject(new Error(`systemctl --user ${args.join(" ")} failed: ${err.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`systemctl --user ${args.join(" ")} exited with code ${code}`));
    });
  });
};
export const removeSystemdService = async (serviceName: string) => {
  const serviceFilePath = path.join(getHomeDir(), ".config", "systemd", "user", `${serviceName}.service`);
  try {
    await runSystemctl(["stop", serviceName]);
    await runSystemctl(["disable", serviceName]);
    if (fs.existsSync(serviceFilePath)) {
      fs.unlinkSync(serviceFilePath);
    }
    await runSystemctl(["daemon-reload"]);
    console.log(`Service ${serviceName} removed`)
  } catch (err: any) {
    console.log(`Failed to remove service: ${err.message}`)
    throw err;
  }
};