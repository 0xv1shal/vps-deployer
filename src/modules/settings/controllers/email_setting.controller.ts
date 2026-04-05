import type { Request, Response } from "express";
import nodemailer from "nodemailer";
import { getDB } from "../../../db/db.ts";
import { convertDateToIST } from "../../../helpers/date.helper.ts";

export const viewMainSettings = (_req: Request, res: Response) => {
  const db = getDB();
  const user = db.prepare("SELECT * FROM user LIMIT 1").get();
  const email = db.prepare("SELECT * FROM email LIMIT 1").get();
  const paths = db.prepare("SELECT * FROM path_settings ORDER BY sequence ASC").all();
  return res.render("settings/views/main", {
    user: user || {},
    email: email || {},
    paths,
    convertDateToIST,
    active: "settings",
    error: null,
    success: null,
  });
};

export const viewEmailSettings = (_req: Request, res: Response) => {
  const db = getDB();

  const email = db.prepare("SELECT * FROM email LIMIT 1").get();

  return res.render("settings/views/email", {
    email: email || {},
    active: "settings",
    error: null,
    success: null,
  });
};

// UPSERT EMAIL CONFIG
export const upsertEmail = (req: Request, res: Response) => {
  const { username, password, smtp, smtp_port, from } = req.body;

  if (!smtp || !smtp_port || !from) {
    const db = getDB();
    const emailData = db.prepare("SELECT * FROM email LIMIT 1").get();
    return res.render("settings/views/email", {
      email: emailData || {},
      active: "settings",
      error: "SMTP host, port, and from email are required",
      success: null,
    });
  }
  const db = getDB();

  try {
    const existing = db.prepare("SELECT id FROM email LIMIT 1").get();

    if (existing) {
      db.prepare(
        `
        UPDATE email 
        SET username=?, password=?, smtp=?, smtp_port=?, "from"=?
      `,
      ).run(username, password, smtp, smtp_port, from);
    } else {
      db.prepare(
        `
        INSERT INTO email (username, password, smtp, smtp_port, "from")
        VALUES (?, ?, ?, ?, ?)
      `,
      ).run(username, password, smtp, smtp_port, from);
    }

    const emailData = db.prepare("SELECT * FROM email LIMIT 1").get();

    return res.render("settings/views/email", {
      email: emailData || {},
      active: "settings",
      error:null,
      success: "Email settings saved successfully",
    });
  } catch (error: any) {
    const emailData = db.prepare("SELECT * FROM email LIMIT 1").get();

    return res.render("settings/views/email", {
      email: emailData || {},
      active: "settings",
      error: error.message || "Failed to save email settings",
      success:null
    });
  }
};

// TEST EMAIL
export const sendTestEmail = async (_req: Request, res: Response) => {
  const db = getDB();

  const emailConfig: any = db.prepare("SELECT * FROM email LIMIT 1").get();
  const user: any = db.prepare("SELECT * FROM user LIMIT 1").get();

  if (!emailConfig || !user) {
     return res.render("settings/views/email", {
      email: emailConfig || {},
      active: "settings",
      error: "Email settings not configured",
      success: null,
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp,
      port: emailConfig.smtp_port,
      secure: false,
      auth: {
        user: emailConfig.username,
        pass: emailConfig.password,
      },
    });

    await transporter.sendMail({
      from: emailConfig.from,
      to: user.email,
      subject: "Test Email - VPS Deployer",
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPS Deployer - Test Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table width="100%" max-width="500" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          
          <!-- Header with SVG Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">              
              <h1 style="margin: 20px 0 0 0; font-size: 24px; font-weight: 600; color: #1a1f36;">VPS Deployer</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #6c757d;">Test Email</p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td align="center" style="padding: 0 40px;">
              <hr style="border: none; height: 1px; background-color: #e9ecef; margin: 0;">
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1a1f36; line-height: 1.5;">
                Hello <strong style="color: #0066ff;">${user.username}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #4a5568; line-height: 1.6;">
                This is a test email from <strong>VPS Deployer</strong>. Your email configuration is working correctly!
              </p>
              
              <!-- Success Checkmark -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9f0; border-radius: 8px; border-left: 4px solid #10b981;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 20px; margin-right: 12px;">✅</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 14px; color: #0a6e2f; font-weight: 500;">Email configuration verified successfully!</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td align="center" style="padding: 0 40px;">
              <hr style="border: none; height: 1px; background-color: #e9ecef; margin: 0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 25px 40px 35px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                      VPS Deployer — Deployment Made Easy
                    </p>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });

     return res.render("settings/views/email", {
      email: emailConfig || {},
      active: "settings",
      error: null,
      success: "Test email sent successfully",
    });
  } catch (err: any) {
    return res.render("settings/views/email", {
      email: emailConfig || {},
      active: "settings",
      error: err.message || "Failed to send test email",
      success: null,
    });
  }
};
