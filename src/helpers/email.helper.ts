import nodemailer from "nodemailer";
import { getDB } from "../db/db.ts";

type EmailPayload = {
  project: any;
  deployId: string;
  branch: string;
  commit: string;
  author: string;
};

export const sendDeploymentEmail = async ({
  project,
  deployId,
  branch,
  commit,
  author,
}: EmailPayload) => {
  const db = getDB();

  const emailConfig = db
    .prepare(`SELECT * FROM email LIMIT 1`)
    .get() as any;

  if (!emailConfig) return;

  const transporter = nodemailer.createTransport({
    host: emailConfig.smtp,
    port: emailConfig.smtp_port,
    secure: emailConfig.smtp_port === 465,
    auth: {
      user: emailConfig.username,
      pass: emailConfig.password,
    },
  });

  const html = `
  <div style="font-family: Arial; padding: 20px;">
    <h2 style="color: #333;">🚀 Deployment Triggered</h2>

    <p><strong>Project:</strong> ${project.name}</p>
    <p><strong>Branch:</strong> ${branch}</p>
    <p><strong>Deployment ID:</strong> ${deployId}</p>

    <hr/>

    <h3>Commit Info</h3>
    <p><strong>Author:</strong> ${author}</p>
    <p><strong>Message:</strong></p>
    <pre style="background:#f4f4f4; padding:10px;">${commit}</pre>

    <hr/>

    <p style="font-size: 12px; color: gray;">
      VPS Deployer Notification
    </p>
  </div>
  `;

  const user = db.prepare(`SELECT email FROM user LIMIT 1`).get() as { email: string };

  try {
    await transporter.sendMail({
      from: emailConfig.from,
      to: user.email,
      subject: `🚀 Deployment Triggered - ${project.name}`,
      html,
    });
  } catch (err) {
    console.error("Email failed:", err);
  }
};





export const sendDeploymentResultEmail = async (
  deployId: string,
  status: "success" | "failed"
) => {
  const db = getDB();

  const deployment = db
    .prepare(`
      SELECT d.*, p.name, p.receive_email_notf
      FROM deployment d
      JOIN project p ON d.proj_id = p.id
      WHERE d.id = ?
    `)
    .get(deployId) as any;

  if (!deployment || deployment.receive_email_notf !== 1) return;

  const logs = db
    .prepare(`
      SELECT cmd, status
      FROM deployment_logs
      WHERE deploy_id = ?
    `)
    .all(deployId) as { cmd: string; status: string }[];

  const emailConfig = db
    .prepare(`SELECT * FROM email LIMIT 1`)
    .get() as any;

  if (!emailConfig) return;

  const transporter = nodemailer.createTransport({
    host: emailConfig.smtp,
    port: emailConfig.smtp_port,
    secure: emailConfig.smtp_port === 465,
    auth: {
      user: emailConfig.username,
      pass: emailConfig.password,
    },
  });

  const statusColor = status === "success" ? "#28a745" : "#dc3545";

  const logsHtml = logs
    .map(
      (l) => `
        <li>
          <strong>${l.cmd}</strong> → 
          <span style="color:${l.status === "success" ? "green" : "red"}">
            ${l.status}
          </span>
        </li>
      `
    )
    .join("");

  const html = `
  <div style="font-family: Arial; padding: 20px;">
    
    <h2 style="color:${statusColor}">
      ${status === "success" ? "✅ Deployment Successful" : "❌ Deployment Failed"}
    </h2>

    <p><strong>Project:</strong> ${deployment.name}</p>
    <p><strong>Deployment ID:</strong> ${deployId}</p>

    <hr/>

    <h3>Command Results</h3>
    <ul>
      ${logsHtml}
    </ul>

    <hr/>

    <p>
      View details: 
      <a href="http://your-domain/deployment/${deployId}">
        Open Deployment
      </a>
    </p>

    <p style="font-size:12px; color:gray;">
      VPS Deployer Notification
    </p>
  </div>
  `;

  const user = db.prepare(`SELECT email FROM user LIMIT 1`).get() as { email: string };

  try {
    await transporter.sendMail({
      from: emailConfig.from,
      to: user.email,
      subject:
        status === "success"
          ? `✅ Deployment Success - ${deployment.name}`
          : `❌ Deployment Failed - ${deployment.name}`,
      html,
    });
  } catch (err) {
    console.error("Deployment result email failed:", err);
  }
};