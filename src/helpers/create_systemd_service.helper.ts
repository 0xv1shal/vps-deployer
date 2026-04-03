import { execSync } from "child_process";
import fs from "fs";
import { writeToLogFile } from "./logging.helper.ts";

type ServiceConfig = {
  serviceName: string;
  execPath: string;   // path to your binary
  args: string[];     // cli args
  workingDir: string;
};

export const createSystemdService = ({
  serviceName,
  execPath,
  args,
  workingDir,
}: ServiceConfig) => {
  const serviceFilePath = `/etc/systemd/system/${serviceName}.service`;

  const execCmd = [execPath, ...args, "--daemon"].join(" ");

  const serviceContent = `
[Unit]
Description=VPS Deployer Service (${serviceName})
After=network.target

[Service]
Type=simple
ExecStart=${execCmd}
WorkingDirectory=${workingDir}
Restart=always
RestartSec=5
User=root

# logs go to journald
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;

  try {
    // 1. write service file
    fs.writeFileSync(serviceFilePath, serviceContent.trim());

    // 2. reload systemd
    execSync("systemctl daemon-reexec");
    execSync("systemctl daemon-reload");

    

    writeToLogFile(`Service file created at ${serviceFilePath}. Run "vps-deployer start" to enable and start it.`, {level:"INFO", source:"SYS"});
  } catch (err: any) {
    writeToLogFile(`Systemd setup failed:${err.message}`,{level:"ERROR",source:"SYS"})
    throw err;
  }
};