import { Command, Option } from "commander";
import fs from "fs";
import { removeSystemdService } from "../helpers/remove_systemd_service.helper.ts";
import { startSystemdService } from "../helpers/start_systemd_service.helper.ts";

const checkDirExists = (dirPath: string): boolean => {
  return fs.existsSync(dirPath);
};

const checkArgsValidation = (path: string, port: number,sessionKey:string): void => {
  if(sessionKey.trim().length<=6) throw new Error('Session key length should be >=6')
  const pathExists = checkDirExists(path);

  if (!pathExists) throw new Error(`given DIR:${path} dosent exists, make sure you create it before calling the tool`);

  if (Number.isNaN(port) || port >= 50000 || port<=1024)
    throw new Error(`${port} is not a valid port curr limitation is 1024-50000.`);
};

export const getArgs = (): [path: string, port: number,sessionkey:string,isDev:boolean,isDaemon: boolean] => {
  const program = new Command();

  program
    .description("a utility that helps u auto deploy things")
    .version("1.0.0")
    .requiredOption(
      "-w, --working-dir <dir>",
      "sets the working directory where all the projects will be fetched",
    )
    .requiredOption("-p, --port <port>", "sets the port of the server")
    .requiredOption("-s, --session-key <sessKey>", "sets the session key of the server")
    .option("--dev", "run in development mode (foreground, no systemd)")
    .addOption(new Option( '--daemon').hideHelp())
    .action(()=>{});

    program
  .command("start")
  .description("enable and start the vps-deployer systemd service (runs as daemon)")
  .action(() => {
    if (process.getuid && process.getuid() !== 0) {
      console.error("This command must be run as root. Use sudo.");
      process.exit(1);
    }
    try {
      startSystemdService("vps-deployer");
      console.log("vps-deployer service started. Check logs: journalctl -u vps-deployer -f");
      process.exit(0);
    } catch (err: any) {
      console.error(`Failed to start service: ${err.message}`);
      process.exit(1);
    }
  });

  program
  .command("uninstall")
  .description("stop, disable, and remove the vps-deployer systemd service [Dosen't delete the working folder]")
  .action(() => {
    if (process.getuid && process.getuid() !== 0) {
      console.error("This command must be run as root. Use sudo.");
      process.exit(1);
    }
    removeSystemdService("vps-deployer");
    console.log("vps-deployer service removed.");
    process.exit(0);
  });

  program.parse();

  const requiredOptions = program.opts();
  const workingDir = requiredOptions["workingDir"].toString();
  const port = Number.parseInt(requiredOptions["port"], 10);
  const sessionKey = requiredOptions['sessionKey'].toString()
  const isDev = requiredOptions.dev ?? false;
  const isDaemon = requiredOptions.daemon ?? false;

  checkArgsValidation(workingDir, port,sessionKey);

  return [workingDir, port,sessionKey,isDev,isDaemon];
};
