import { Command, Option } from "commander";
import fs from "fs";
import { removeSystemdService } from "../helpers/remove_systemd_service.helper.ts";
import { startSystemdService } from "../helpers/start_systemd_service.helper.ts";
import { closeLogger } from "../helpers/logging.helper.ts";
import { setPort, setSessKey, setWorkDirPath } from "../helpers/arg.helper.ts";
import { closeDB, initalizeDB } from "../db/db.ts";
import { createProxyAndLogConfigs } from "../helpers/config_files.helper.ts";
import { createSystemdService } from "../helpers/create_systemd_service.helper.ts";

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


const parseCommonOptions = (opts: { workingDir: string; port: string; sessionKey: string }) => {

  const workingDir = opts.workingDir.toString();
  const port = Number.parseInt(opts.port, 10);
  const sessionKey = opts.sessionKey.toString();
  checkArgsValidation(workingDir, port, sessionKey);
  return { workingDir, port, sessionKey };
};

export const setupCLI = () => {
  const program = new Command();
  program.description("a utility that helps u auto deploy things").version("1.1.1");
  // ---- config subcommand ----
  program
    .command("config")
    .description("generate systemd service file, database, and configs")
    .requiredOption("-w, --working-dir <dir>", "sets the working directory where all the projects will be fetched")
    .requiredOption("-p, --port <port>", "sets the port of the server")
    .requiredOption("-s, --session-key <sessKey>", "sets the session key of the server")
    .action(async (opts) => {
      try {
        const { workingDir, port, sessionKey } = parseCommonOptions(opts);
        
        setWorkDirPath(workingDir);
        setPort(port);
        setSessKey(sessionKey);
        initalizeDB();
        createProxyAndLogConfigs();
        await createSystemdService({
          serviceName: "vps-deployer",
          execPath: process.argv[1] ?? "",
          args: process.argv.slice(3), // skip "config"
          workingDir,
        });
        console.log("Please run:  loginctl enable-linger $USER to persists the server")
        console.log(`Systemd service file created. Run "vps-deployer start" to start the service.`);
        closeDB();
        await closeLogger();
        process.exit(0);
      } catch (err: any) {
        console.log(err.message);
        process.exit(1);
      }
    });
  // ---- start subcommand ----
  program
    .command("start")
    .description("enable and start the vps-deployer systemd service (runs as daemon)")
    .action(async () => {
      try {
        await startSystemdService("vps-deployer");
        console.log("vps-deployer service started. Check logs: journalctl --user -u vps-deployer -f");
        process.exit(0);
      } catch (err: any) {
        console.error(`Failed to start service: ${err.message}`);
        process.exit(1);
      }
    });
  // ---- uninstall subcommand ----
  program
    .command("uninstall")
    .description("stop, disable, and remove the vps-deployer systemd service [Doesn't delete the working folder]")
    .action(async () => {
      try {
        await removeSystemdService("vps-deployer");
        console.log("vps-deployer service removed please remove the folder manually.");
        process.exit(0);
      } catch (err: any) {
        console.error(`Failed to remove service: ${err.message}`);
        process.exit(1);
      }
    });
  // ---- dev subcommand ----
  program
    .command("dev")
    .description("run in development mode (foreground, no systemd)")
    .requiredOption("-w, --working-dir <dir>", "sets the working directory where all the projects will be fetched")
    .requiredOption("-p, --port <port>", "sets the port of the server")
    .requiredOption("-s, --session-key <sessKey>", "sets the session key of the server")
    .action(async (opts) => {
      const { workingDir, port, sessionKey } = parseCommonOptions(opts);
      // Signal to index.ts to run in dev mode
      process.env.VPS_DEPLOYER_MODE = "dev";
      process.env.VPS_WORK_DIR = workingDir;
      process.env.VPS_PORT = port.toString();
      process.env.VPS_SESS_KEY = sessionKey;
    });
  // ---- daemon subcommand (hidden, used by systemd ExecStart) ----
  program
    .command("daemon")
    .description("")
    .requiredOption("-w, --working-dir <dir>", "")
    .requiredOption("-p, --port <port>", "")
    .requiredOption("-s, --session-key <sessKey>", "")
    .addOption(new Option("--daemon", "").hideHelp())
    .action(async (opts) => {
      const { workingDir, port, sessionKey } = parseCommonOptions(opts);
      // Signal to index.ts to run in daemon mode
      process.env.VPS_DEPLOYER_MODE = "daemon";
      process.env.VPS_WORK_DIR = workingDir;
      process.env.VPS_PORT = port.toString();
      process.env.VPS_SESS_KEY = sessionKey;
    });
  program.parse();
};