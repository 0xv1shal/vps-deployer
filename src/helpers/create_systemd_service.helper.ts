import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getHomeDir } from "./get_home_dir.helper.ts";
import { writeToLogFile } from "./logging.helper.ts";

type ServiceConfig = {
  serviceName: string;
  execPath: string;   // path to your binary
  args: string[];     // cli args
  workingDir: string;
};

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

export const createSystemdService = async ({
  serviceName,
  execPath,
  args,
  workingDir,
}: ServiceConfig) => {
  const userDir = path.join(getHomeDir(), ".config", "systemd", "user");
  
  const serviceFilePath = path.join(userDir, `${serviceName}.service`);
  
  const nodePath = execSync("which node").toString().trim();
  const safeArgs = args.map((a) => `"${a}"`).join(" ");
  const execCmd = `${nodePath} ${execPath} daemon ${safeArgs}`;

  const serviceContent = `[Unit]
Description=VPS Deployer Service (${serviceName})
After=network.target
[Service]
Type=simple
ExecStart=${execCmd}
WorkingDirectory=${workingDir}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=default.target`;

  try {
    // Ensure user systemd dir exists
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    // Write service file (no sudo needed — user's own home dir)
    fs.writeFileSync(serviceFilePath, serviceContent);
    // Reload user systemd
    await runSystemctl(["daemon-reload"]);
    writeToLogFile(`Service file created at ${serviceFilePath}. Run "vps-deployer start" to enable and start it.`, {
      level: "INFO",
      source: "SYS",
    });
  } catch (err: any) {
    writeToLogFile(`Systemd setup failed: ${err.message}`, { level: "ERROR", source: "SYS" });
    throw err;
  }
};