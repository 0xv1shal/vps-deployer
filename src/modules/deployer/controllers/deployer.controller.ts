import { type Request, type Response } from "express";
import { getDB } from "../../../db/db.ts";
import { triggerDeployment } from "../helper/deployer.ts";

export const createDeployment = (req: Request, res: Response) => {
  const { projId } = req.body;

  if (!projId || typeof projId !== "string" || projId.trim() === "") {
    return res.status(400).json({ message: "projId is invalid" });
  }

  const db = getDB();

  const project = db
    .prepare(`SELECT id FROM project WHERE id = ?`)
    .get(projId) as { id: string } | undefined;

  if (!project) {
    return res.status(404).json({ message: "project not found" });
  }

  // fetch commands (ordered)
  const commands = (
    db
      .prepare(
        `
        SELECT cmd 
        FROM project_commands 
        WHERE proj_id = ?
        ORDER BY seq_no ASC
        `,
      )
      .all(projId) as { cmd: string }[]
  ).map((row) => row.cmd);

  if (commands.length === 0) {
    return res.status(400).json({
      message: "No commands configured for this project",
    });
  }

  // generate deployment id
  const deployId = crypto.randomUUID();

  // create deployment row
  db.prepare(
    `
    INSERT INTO deployment (id, proj_id, status)
    VALUES (?, ?, 'running')
    `,
  ).run(deployId, projId);

  // enqueue (non-blocking)
  triggerDeployment(deployId, projId, commands);

  return res.json({
    message: "deployment queued",
    deployId,
  });
};

export const getDeploymentDetails = (req: Request, res: Response) => {
  const { deployId } = req.params;

  if (!deployId) {
    return res.status(400).json({ message: "deployId required" });
  }

  const db = getDB();

  const deployment = db
    .prepare(
      `
      SELECT d.id, d.proj_id, d.status, d.started_at, d.finished_at,
             p.name, p.github_url, p.branch_name
      FROM deployment d
      JOIN project p ON d.proj_id = p.id
      WHERE d.id = ?
    `,
    )
    .get(deployId);

  if (!deployment) {
    return res.status(404).json({ message: "deployment not found" });
  }

  const logs = db
    .prepare(
      `
      SELECT id, cmd, log, status, started_at, finished_at
      FROM deployment_logs
      WHERE deploy_id = ?
      ORDER BY started_at ASC
    `,
    )
    .all(deployId);

  return res.json({
    deployment,
    logs,
  });
};

export const getDeploymentDetailsView = (req: Request, res: Response) => {
  const { deployId } = req.params;
  const db = getDB();

  const deployment = db
    .prepare(
      `
      SELECT d.id, d.proj_id, d.status, d.started_at, d.finished_at,
             p.name, p.github_url, p.branch_name
      FROM deployment d
      JOIN project p ON d.proj_id = p.id
      WHERE d.id = ?
    `,
    )
    .get(deployId);

  if (!deployment) {
    return res.status(404).render("common/views/404");
  }

  const logs = db
    .prepare(
      `
      SELECT id, cmd, log, status, started_at, finished_at
      FROM deployment_logs
      WHERE deploy_id = ?
      ORDER BY started_at ASC
    `,
    )
    .all(deployId);

  return res.render("deployer/views/details", {
    deployment,
    logs,
    active: "deployments",
  });
};

export const getDeploymentView = (_req: Request, res: Response) => {
  const db = getDB();

  const deployments = db
    .prepare(
      `
      SELECT d.*, p.name
      FROM deployment d
      JOIN project p ON d.proj_id = p.id
      ORDER BY d.started_at DESC
    `,
    )
    .all();

  return res.render("deployer/views/index", {
    deployments,
    active: "deployments",
  });
};
