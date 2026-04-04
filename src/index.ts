#!/usr/bin/env node
import { closeDB, initalizeDB } from "./db/db.ts";
import { setPort, setSessKey, setWorkDirPath } from "./helpers/arg.helper.ts";
import { createProxyAndLogConfigs } from "./helpers/config_files.helper.ts";
import { convertDateToIST } from "./helpers/date.helper.ts";
import { closeLogger, writeToLogFile } from "./helpers/logging.helper.ts";
import { setupCLI } from "./utils/cli.ts";
import app, { initSessionAndRoutes } from "./app.ts";

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
  setTimeout(
    () => {
      server?.closeAllConnections();
      process.exit(1);
    },
    2 * 60 * 1000,
  );
}

function startServer(port: number) {
  initSessionAndRoutes(app);
  server = app.listen(port, "0.0.0.0", () => {
    writeToLogFile(`Server started`, {
      source: "SERVER",
      meta: { port },
    });
  });
  server.on("connection", (socket) => {
    socket.setTimeout(5000);
    socket.on("timeout", () => socket.destroy());
  });
}

function initFromEnv() {
  const mode = process.env.VPS_DEPLOYER_MODE;
  const workDir = process.env.VPS_WORK_DIR;
  const portStr = process.env.VPS_PORT;
  const sessKey = process.env.VPS_SESS_KEY;
  if (!mode || !workDir || !portStr || !sessKey) return;
  const port = Number.parseInt(portStr, 10);
  setWorkDirPath(workDir);
  setPort(port);
  setSessKey(sessKey);
  initalizeDB();
  createProxyAndLogConfigs();
  if (mode === "dev" || mode === "daemon") {
    startServer(port);
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

setupCLI();
initFromEnv();
