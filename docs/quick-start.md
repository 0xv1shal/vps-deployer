# Quick Start Guide

This guide walks you through installing VPS Deployer, starting the service, creating your first project, and triggering an automatic deployment via GitHub webhooks.

## Step 1: Install

Install the CLI globally using npm:

```bash
npm install -g vps-deployer
```

Verify the installation:

```bash
vps-deployer --version
```

## Step 2: Create a Working Directory

Create a directory where VPS Deployer will store its database, project files, and generated configs:

```bash
mkdir -p /opt/vps-deployer
```

## Step 3: One-Time Setup

Enable user-level systemd services so they persist after you log out:

```bash
loginctl enable-linger $USER
```

> This is the only command that may require sudo (depending on your distro). After this, everything else runs as your user.

## Step 4: Configure

Run VPS Deployer to generate the user-level systemd service file, database, and reference configs:

```bash
vps-deployer config -w /opt/vps-deployer -p 3000 -s my-secret-session-key
```

This command will:

- Initialize the SQLite database (`vps-deployer.db`)
- Generate Caddy and Nginx reference configs
- Create a user-level systemd service file at `~/.config/systemd/user/vps-deployer.service`
- **Exit immediately** (the server does NOT start)

> **Dev mode:** To run the server in the foreground without systemd (for local development), use:
>
> ```bash
> vps-deployer dev -w /opt/vps-deployer -p 3000 -s my-secret-session-key
> ```
>
> This starts the server directly in your terminal. Press `Ctrl+C` to stop.

## Step 5: Start the Service

Enable and start the user-level systemd service:

```bash
vps-deployer start
```

The terminal is freed immediately. The server is now running in the background.

Check the status:

```bash
systemctl --user status vps-deployer
```

View live logs:

```bash
journalctl --user -u vps-deployer -f
```

## Step 6: Register an Account

Open your browser and navigate to:

```
http://<your-server-ip>:3000/register
```

Create your admin account with a username, password, and email address.

## Step 7: Configure Email Notifications (Optional)

1. Navigate to **Settings** from the dashboard
2. Enter your SMTP credentials:
   - SMTP host (e.g., `smtp.gmail.com`)
   - SMTP port (e.g., `587`)
   - Username and password
   - From email address
3. Click **Send Test Email** to verify the configuration
4. Save the settings

See [Email Setup](./email-setup.md) for detailed SMTP configuration.

## Step 8: Create a Project

1. Go to **Projects** → **Create Project**
2. Fill in the project details:
   - **Name**: A friendly name for your project
   - **GitHub URL**: The full URL to your repository (e.g., `https://github.com/user/my-app`)
   - **Branch**: The branch to deploy from (e.g., `main`)
   - **Auto Deploy**: Toggle on to trigger deployments on every webhook push
   - **Email Notifications**: Toggle on to receive emails for this project's deployments
3. Click **Create**

## Step 9: Add Build/Deploy Commands

After creating the project, you'll be taken to the project details page. Add the commands that should run during deployment, in order:

```
1. git pull origin main
2. npm install
3. npm run build
4. pm2 restart my-app
```

Each command runs sequentially. If any command fails, the deployment stops and you'll be notified.

> **Important:** Every command runs inside the project directory (`<working-dir>/<project-id>/`). If you need to run a command in a different directory, chain it with `cd`. For example, to list files in `/var/www`, use `cd /var/www && ls` — you cannot add two separate commands and expect them to run in different directories.

## Step 10: Add Environment Variables (Optional)

On the project details page, add any environment variables your application needs. These are written to a `.env` file in the project directory.

## Step 11: Configure the GitHub Webhook

1. On the project details page, copy the **Webhook URL** and **Webhook Secret**
2. Go to your GitHub repository → **Settings** → **Webhooks** → **Add webhook**
3. Paste the URL into the **Payload URL** field (use `https://` if you have a reverse proxy)
4. Set **Content type** to `application/json`
5. Paste the webhook secret into the **Secret** field
6. Select **Just the push event**
7. Click **Add webhook**

See [Webhook Setup](./webhook-setup.md) for more details.

## Step 12: Trigger Your First Deployment

Push a commit to your configured branch:

```bash
git add .
git commit -m "trigger deployment"
git push origin main
```

VPS Deployer will:

1. Receive the webhook
2. Execute your commands in sequence
3. Send you an email notification with the results

> **Important:** VPS Deployer does **not** automatically pull your repository on webhook receipt. You must explicitly add a `git pull` (or `git clone`) command as the first step in your project's command list.

## Step 13: Monitor Deployments

- View all deployments from the **Dashboard** or **Deployments** page
- Click on any deployment to see real-time logs, command output, and success/failure status

## Managing the Service

```bash
# Start the service
vps-deployer start

# Check status
systemctl --user status vps-deployer

# View logs
journalctl --user -u vps-deployer -f

# Stop the service
systemctl --user stop vps-deployer

# Remove the service entirely
vps-deployer uninstall
```

## What's Next?

- [CLI Reference](./cli-reference.md) — Learn about all available commands, flags, and options
- [Architecture](./architecture.md) — Understand how VPS Deployer works under the hood
- [Database Schema](./schema.md) — Review the data model
