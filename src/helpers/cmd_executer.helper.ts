import { spawn } from "child_process";
import { getDB } from "../db/db.ts";

const startCmdLog = (deployId: string, cmd: string) => {
  const db = getDB();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO deployment_logs (id, deploy_id, cmd,status)
    VALUES (?, ?, ?,?)
  `).run(id, deployId, cmd,'running');

  return id;
};

const finishCmdLog = (
  logId: string,
  log: string,
  status: "success" | "failed"
) => {
  const db = getDB();

  db.prepare(`
    UPDATE deployment_logs
    SET log = ?, status = ?, finished_at = datetime('now')
    WHERE id = ?
  `).run(log, status, logId);
};

export const dangerCmdDetector = (cmd: string) => {
  const dangerous = [
    "rm -rf /",
    "shutdown",
    "reboot",
    "mkfs",
    ":(){:|:&};:", // fork bomb
  ];

  return dangerous.some((d) => cmd.includes(d));
};

const getMergedPath = () => {
  const db = getDB();
  const paths = db
    .prepare("SELECT path FROM path_settings ORDER BY sequence ASC")
    .all() as { path: string }[];
  if (paths.length === 0) {
    return process.env.PATH || "";
  }
  const userPath = paths.map((p) => p.path).join(":");
  return userPath + ":" + (process.env.PATH || "");
};

export const runCmd =  (
  cmd: string,
  projDir: string,
  deployId: string
) => {
  if (dangerCmdDetector(cmd)) {
    throw new Error("Dangerous command blocked");
  }

  const logId =  startCmdLog(deployId, cmd);

  let stderr = "";
  let stdout = "";
  let isFinished = false;

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const mergedEnv = { ...process.env, PATH: getMergedPath() };
    const child = spawn(cmd, {
      cwd: projDir,
      shell: true,
      env:mergedEnv
    });

    // ⏱️ 5 min timeout
    const timeout = setTimeout(() => {
      if (!isFinished) {
        child.kill("SIGKILL");
      }
    }, 5 * 60 * 1000);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", async (err) => {
      if (isFinished) return;
      isFinished = true;

      clearTimeout(timeout);
       finishCmdLog(logId, err.message, "failed");

      reject(new Error(`Failed to exec ${cmd}: ${err.message}`));
    });

    child.on("close", async (code, signal) => {
      if (isFinished) return;
      isFinished = true;

      clearTimeout(timeout);

      const combinedLog = stdout + "\n" + stderr;

      // If killed by timeout
      if (signal === "SIGKILL") {
         finishCmdLog(logId, combinedLog + "\n[Timeout: Killed]", "failed");
        return reject(new Error(`Command timed out: ${cmd}`));
      }

      if (code === 0) {
         finishCmdLog(logId, combinedLog, "success");
        return resolve({ stdout, stderr });
      }

       finishCmdLog(logId, combinedLog, "failed");

      reject(
        new Error(
          stderr.trim() || `Command failed: ${cmd} (code ${code})`
        )
      );
    });
  });
};

export const runCmdSeq = async (
  commands: string[],
  projDir: string,
  deployId: string
) => {
  for (const cmd of commands) {
    await runCmd(cmd, projDir, deployId);
  }
};