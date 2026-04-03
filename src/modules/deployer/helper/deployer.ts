import path from "path";
import { getDB } from "../../../db/db.ts";
import { getWorkDirPath } from "../../../helpers/arg.helper.ts";
import { runCmdSeq } from "../../../helpers/cmd_executer.helper.ts";
import { sendDeploymentResultEmail } from "../../../helpers/email.helper.ts";

type DeploymentJob = {
  deployId: string;
  run: () => Promise<void>;
};

/* =========================
   IN-MEM QUEUE (FIFO, 1 worker)
========================= */

const queue: DeploymentJob[] = [];
let isRunning = false;

export const enqueueDeployment = (job: DeploymentJob) => {
  queue.push(job);
  processQueue();
};

const processQueue = async () => {
  if (isRunning) return;
  if (queue.length === 0) return;

  isRunning = true;

  const job = queue.shift();
  if (!job) {
    isRunning = false;
    return;
  }

  try {
    await job.run();
  } catch (err) {
    // deployment handles its own failure logging
  } finally {
    isRunning = false;
    processQueue(); // next job
  }
};

export const runDeployment = async (
  deployId: string,
  projId: string,
  commands: string[],
) => {
  try {
    markDeploymentRunning(deployId);

    const projDir = path.join(getWorkDirPath(), projId);

    await runCmdSeq(commands, projDir, deployId);

    markDeploymentSuccess(deployId);
    await sendDeploymentResultEmail(deployId, "success");
  } catch (err) {
    markDeploymentFailed(deployId);

    await sendDeploymentResultEmail(deployId, "failed");
  }
};

/* =========================
   PUBLIC API (ENTRY POINT)
========================= */

export const triggerDeployment = (
  deployId: string,
  projId: string,
  cmds: string[],
) => {
  enqueueDeployment({
    deployId,
    run: async () => {
      await runDeployment(deployId, projId, cmds);
    },
  });
};

const markDeploymentRunning = async (deployId: string) => {
  const db = getDB();

  db.prepare(
    `
    UPDATE deployment
    SET status = 'running',
        started_at = datetime('now'),
        finished_at = NULL
    WHERE id = ?
  `,
  ).run(deployId);
};

const markDeploymentSuccess = async (deployId: string) => {
  const db = getDB();

  db.prepare(
    `
    UPDATE deployment
    SET status = 'success',
        finished_at = datetime('now')
    WHERE id = ?
  `,
  ).run(deployId);
};

const markDeploymentFailed = async (deployId: string) => {
  const db = getDB();

  db.prepare(
    `
    UPDATE deployment
    SET status = 'failed',
        finished_at = datetime('now')
    WHERE id = ?
  `,
  ).run(deployId);
};
