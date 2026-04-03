import type { Request, Response } from "express";
import crypto from "crypto";
import { getDB } from "../../../db/db.ts";
import { triggerDeployment } from "../../deployer/helper/deployer.ts";
import { sendDeploymentEmail } from "../../../helpers/email.helper.ts";

export const githubWebhook = (req: Request, res: Response) => {
  const signature = req.headers["x-hub-signature-256"] as string;
  const event = req.headers["x-github-event"] as string;

  if (!signature) {
    return res.status(401).send("Missing signature");
  }

  const payload = JSON.stringify(req.body);

  const db = getDB();

  // get project using webhook (we assume route has projectId)
  const { projectId } = req.params;

  const project = db
    .prepare(`SELECT * FROM project WHERE id = ?`)
    .get(projectId) as any;

  if (!project) {
    return res.status(404).send("Project not found");
  }

  // verify signature
  const expected =
    `sha256=` +
    crypto
      .createHmac("sha256", project.webhook_secret)
      .update(payload)
      .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).send("Invalid signature");
  }

  // only handle push events
  if (event !== "push") {
    return res.status(200).send("Ignored");
  }

  const branch = req.body.ref?.replace("refs/heads/", "");

  if (branch !== project.branch_name) {
    return res.status(200).send("Branch mismatch, ignored");
  }

  // check auto deploy
  if (project.auto_deploy !== 1) {
    return res.status(200).send("Auto deploy disabled");
  }

  // create deployment
  const deployId = crypto.randomUUID();

  db.prepare(
    `
    INSERT INTO deployment (id, proj_id, status)
    VALUES (?, ?, 'running')
  `,
  ).run(deployId, project.id);

  // get commands
  const commands = (
    db
      .prepare(
        `
      SELECT cmd FROM project_commands
      WHERE proj_id = ?
      ORDER BY seq_no ASC
    `,
      )
      .all(project.id) as { cmd: string }[]
  ).map((c) => c.cmd);

  if (commands.length === 0) {
    return res.status(400).send("No commands configured");
  }

  // enqueue
  triggerDeployment(deployId, project.id, commands);

  if (project.receive_email_notf === 1) {
    sendDeploymentEmail({
      project,
      deployId,
      branch,
      commit: req.body.head_commit?.message || "No message",
      author: req.body.head_commit?.author?.name || "Unknown",
    });
  }

  return res.status(200).send("Deployment triggered");
};
