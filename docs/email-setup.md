# Email Setup

VPS Deployer can send email notifications when deployments succeed or fail. This guide covers configuring SMTP settings through the web UI.

## Why Email Notifications?

- Get alerted immediately when a deployment fails
- Track successful deployments without logging into the dashboard
- Useful for team awareness and audit trails

## Configuring SMTP

### Step 1: Navigate to Settings

From the dashboard, click **Settings → Email Settings** in the sidebar.

### Step 2: Enter SMTP Credentials

| Field | Description | Example |
|-------|-------------|---------|
| **Username** | Display name for the sender | `VPS Deployer` |
| **Password** | SMTP account password or app password | `your-app-password` |
| **SMTP Host** | The SMTP server address | `smtp.gmail.com` |
| **SMTP Port** | The SMTP server port | `587` |
| **From Email** | The email address emails are sent from | `deployer@yourdomain.com` |

> **Note:** All fields are optional. If left blank, email notifications will be disabled.

### Step 3: Send a Test Email

Before saving, click **Send Test Email** to verify your SMTP configuration works. You'll receive a test message at your account's registered email address.

### Step 4: Save

Click **Save** to persist the settings. They are stored in the database and used for all future deployment notifications.

## Common SMTP Providers

### Gmail

| Setting | Value |
|---------|-------|
| SMTP Host | `smtp.gmail.com` |
| SMTP Port | `587` |
| Authentication | App Password (not your regular password) |

To generate an App Password:
1. Go to your Google Account → Security
2. Enable 2-Step Verification (if not already enabled)
3. Go to App Passwords
4. Generate a password for "Mail" and use it

### Outlook / Microsoft 365

| Setting | Value |
|---------|-------|
| SMTP Host | `smtp-mail.outlook.com` |
| SMTP Port | `587` |

### SendGrid

| Setting | Value |
|---------|-------|
| SMTP Host | `smtp.sendgrid.net` |
| SMTP Port | `587` |
| Username | `apikey` |
| Password | Your SendGrid API key |

### AWS SES

| Setting | Value |
|---------|-------|
| SMTP Host | `email-smtp.<region>.amazonaws.com` |
| SMTP Port | `587` |
| Username | Your SES SMTP username |
| Password | Your SES SMTP password |

## Per-Project Email Toggle

Each project has its own **Receive Email Notifications** toggle:

- **ON**: You'll receive emails for this project's deployments
- **OFF**: Deployments run silently (still logged in the web UI)

This lets you enable notifications for critical projects while silencing less important ones.

## Notification Content

Deployment emails include:

- Project name
- Deployment status (success/failure)
- Commit message and author
- Deployment start and end time
- Link to view full deployment logs in the web UI

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Test email fails | Wrong SMTP credentials | Double-check username, password, host, and port |
| Test email fails | Port blocked by firewall | Ensure outbound traffic on the SMTP port is allowed |
| No notifications received | Project email toggle is OFF | Enable notifications in project settings |
| Gmail "less secure app" error | Using regular password | Generate an App Password instead |
