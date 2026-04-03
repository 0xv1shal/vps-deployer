#!/usr/bin/env node
import { closeDB, initalizeDB } from "./db/db.ts";
import { setPort, setSessKey, setWorkDirPath } from "./helpers/arg.helper.ts";
import { createProxyAndLogConfigs } from "./helpers/config_files.helper.ts";
import { convertDateToIST } from "./helpers/date.helper.ts";
import { closeLogger, writeToLogFile } from "./helpers/logging.helper.ts";
import { getArgs } from "./utils/cli.ts";
import app, { initSessionAndRoutes } from "./app.ts";
import { createSystemdService } from "./helpers/create_systemd_service.helper.ts";

let server: ReturnType<typeof app.listen> | null = null;
let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  writeToLogFile(`Shutdown initiated`, {
    level: "WARN",
    source: "SYSTEM",
    meta: { signal, time: convertDateToIST(Date.now()) },
  });

  const exit = async (code: number) => {
    await closeLogger(); // ensure logs flushed
    process.exit(code);
  };

  if (!server) {
    writeToLogFile(`Server not initialized, closing DB`, {
      source: "SYSTEM",
    });
    closeDB();
    return exit(0);
  }

  server.close(async (err) => {
    if (err) {
      writeToLogFile(`Error closing server`, {
        level: "ERROR",
        source: "SERVER",
        meta: { error: err.message },
      });
      return exit(1);
    }

    try {
      writeToLogFile(`Server closed successfully`, {
        source: "SERVER",
      });

      closeDB();

      writeToLogFile(`DB closed, shutdown complete`, {
        source: "SYSTEM",
      });

      return exit(0);
    } catch (e: any) {
      writeToLogFile(`Error during shutdown`, {
        level: "ERROR",
        source: "SYSTEM",
        meta: { error: e.message },
      });

      return exit(1);
    }
  });

  // hard timeout fallback (no await here)
  setTimeout(() => {
    server?.closeAllConnections();
    process.exit(1);
  }, 10000);
}

function main() {
  try {
    if (process.getuid && process.getuid() !== 0) {
      console.error("This command must be run as root. Use sudo.");
      process.exit(1);
    }
    const [path, port, sessKey, isDev, isDaemon] = getArgs();
    setWorkDirPath(path);
    setPort(port);
    setSessKey(sessKey);
    initalizeDB();
    createProxyAndLogConfigs();

    if (isDev || isDaemon) {
      initSessionAndRoutes(app);
      server = app.listen(port, "0.0.0.0", () => {
        writeToLogFile(`Server started`, {
          source: "SERVER",
          meta: { port },
        });
      });

      server.on("connection", (socket) => {
        // VERY IMP : SOMETIMES A OLD STALE CONN WHICH IS IN OS LAYER GETS TO NODE AFTER THE NODE INSTANCE RESTARTS SO SERVER CANT BE CLOSED PROPERLY LEADING INTO FORCE SHUTDOWN INSTEAD OF GRACEFUL
        // USE THIS SETTIMEOUT SO EVEN IF STALE CONN OPENS AGAiN IT GETS CLOSED
        socket.setTimeout(5000);
        socket.on("timeout", () => socket.destroy());
      });
    } else {
      createSystemdService({
        serviceName: "vps-deployer",
        execPath: process.argv[1] ?? "",
        args: process.argv.slice(2),
        workingDir: path,
      });

      writeToLogFile(
        `Systemd service file created. Run "vps-deployer start" to start the service.`,
        {
          source: "SYSTEM",
        },
      );
      closeDB();
      closeLogger();
      console.log(`Systemd service file created. Run "vps-deployer start" to start the service.`)
      process.exit(0);
    }
  } catch (error: any) {
    console.log(error.message);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  writeToLogFile("Uncaught Exception", {
    level: "ERROR",
    source: "SYSTEM",
    meta: { error: err.message },
  });
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  writeToLogFile("Unhandled Rejection", {
    level: "ERROR",
    source: "SYSTEM",
    meta: { reason },
  });
  shutdown("unhandledRejection");
});

main();
