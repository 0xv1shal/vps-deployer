<p align="center">
  <img src="https://raw.githubusercontent.com/0xv1shal/vps-deployer/main/public/favicon.svg" alt="VPS Deployer Logo" width="120" />
  <h1 align="center">VPS Deployer</h1>
  <p align="center"><strong>Deployment made easy.</strong></p>
</p>

<p align="center">
  A lightweight, self-hosted continuous deployment (CD) system with a built-in web UI — manages projects on your VPS, accepts GitHub webhooks for automatic deployments, and sends real-time email notifications on deployment events.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vps-deployer"><img src="https://img.shields.io/npm/v/vps-deployer.svg?style=flat-square&color=cb3837" alt="npm version" /></a>
  <a href="https://nodejs.org/en/about/releases/"><img src="https://img.shields.io/node/v/vps-deployer.svg?style=flat-square&color=339933" alt="Node.js version" /></a>
  <a href="https://github.com/0xv1shal/vps-deployer/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/vps-deployer.svg?style=flat-square&color=blue" alt="License" /></a>
  <a href="https://github.com/0xv1shal/vps-deployer"><img src="https://img.shields.io/badge/platform-linux-lightgrey.svg?style=flat-square" alt="Platform" /></a>
</p>

---

## Features

| | |
|---|---|
| 🖥️ **Web UI Dashboard** | Monitor projects, deployments, and logs from your browser |
| 🔄 **GitHub Webhooks** | Push to a branch and let VPS Deployer handle the rest |
| 📧 **Email Notifications** | Get notified on deployment success or failure via SMTP |
| ⚙️ **Custom Build Commands** | Define per-project command sequences (build, migrate, restart) |
| 🔐 **Per-Project Env Vars** | Manage `.env` files through the UI |
| 🪶 **Lightweight** | Single SQLite database, no external services required |
| 🚀 **CLI-Driven** | Configure with one command, manage everything from the web |
| 🔒 **No Root Required** | Runs entirely as a user-level systemd service |

## Prerequisites

- **Linux** with systemd (user-level services)
- **Node.js** >= 20
- **npm** or **pnpm**

## Quick Start

### 1. Install

```bash
npm install -g vps-deployer
```

### 2. One-Time Setup

Enable user-level systemd services to persist after logout:

```bash
loginctl enable-linger $USER
```

### 3. Configure

```bash
vps-deployer config -w /opt/vps-deployer -p 3000 -s your-super-secret-session-key
```

This creates the user-level systemd service file, database, and reference configs, then exits.

| Flag | Description |
|------|-------------|
| `-w, --working-dir` | Directory where projects and data will be stored |
| `-p, --port` | Port for the web UI and API (1024–50000) |
| `-s, --session-key` | Secret key for session encryption (min 6 characters) |

### 4. Start the Service

```bash
vps-deployer start
```

This enables and starts the systemd service. The terminal is freed immediately.

### 5. Open the Web UI

Navigate to `http://<your-server-ip>:3000` and register your account.

### 6. Create a Project

1. Go to **Projects** → **Create**
2. Enter your GitHub repo URL and branch name
3. Add build/deploy commands (e.g., `npm install`, `npm run build`, `pm2 restart app`)
4. Save — your unique webhook URL and secret will be displayed

### 7. Configure the Webhook

Copy the webhook URL and secret from the project details page, then add them to your GitHub repo:

`Settings → Webhooks → Add webhook → Paste URL → Set Content type to application/json → Paste Secret`

### 8. Deploy

Push to your configured branch. VPS Deployer will receive the webhook, run your commands, and notify you via email.

> **Important:** VPS Deployer does **not** automatically pull your repository on webhook receipt. You must explicitly add a `git pull` (or `git clone`) command as the first step in your project's command list. For example:
>
> ```
> 1. git pull origin main
> 2. npm install
> 3. npm run build
> ```

## CLI Commands

| Command | Description |
|---------|-------------|
| `vps-deployer config -w <dir> -p <port> -s <key>` | Generate systemd service file, database, and configs |
| `vps-deployer start` | Enable and start the user-level systemd service |
| `vps-deployer dev -w <dir> -p <port> -s <key>` | Run in development mode (foreground, no systemd) |
| `vps-deployer uninstall` | Stop, disable, and remove the systemd service |

## Screenshots

> ![Dashboard](https://raw.githubusercontent.com/0xv1shal/vps-deployer/main/docs/screenshots/dashboard.png)
>
> *Dashboard with project stats and recent deployments*

> ![Project Details](https://raw.githubusercontent.com/0xv1shal/vps-deployer/main/docs/screenshots/project-details.png)
>
> *Project configuration with commands and environment variables*

> ![Deployment Logs](https://raw.githubusercontent.com/0xv1shal/vps-deployer/main/docs/screenshots/deployment-logs.png)
>
> *Real-time deployment log output*

## Project Structure

When you run `vps-deployer config`, it creates the following structure in your working directory:

```
/opt/vps-deployer/
├── vps-deployer.db            # SQLite database
├── caddy.config               # Generated reverse proxy config
├── nginx.config               # Generated reverse proxy config
├── vps-deployer.log           # Application log file
└── <project-id>/              # Per-project workspace
    ├── .env                   # Environment variables
    └── ...                    # Cloned repository files
```

The systemd service file is created at `~/.config/systemd/user/vps-deployer.service`.

## Documentation

| Document | Description |
|----------|-------------|
| [Quick Start](https://github.com/0xv1shal/vps-deployer/blob/main/docs/quick-start.md) | Step-by-step walkthrough from install to first deployment |
| [CLI Reference](https://github.com/0xv1shal/vps-deployer/blob/main/docs/cli-reference.md) | All commands, flags, validation rules, and examples |
| [Webhook Setup](https://github.com/0xv1shal/vps-deployer/blob/main/docs/webhook-setup.md) | Configure GitHub webhooks for auto-deployment |
| [Email Setup](https://github.com/0xv1shal/vps-deployer/blob/main/docs/email-setup.md) | Configure SMTP for deployment notifications |
| [Architecture](https://github.com/0xv1shal/vps-deployer/blob/main/docs/architecture.md) | System design, database schema, and deployment flow |
| [Database Schema](https://github.com/0xv1shal/vps-deployer/blob/main/docs/schema.md) | Full table definitions |
| [Privileged Commands](https://github.com/0xv1shal/vps-deployer/blob/main/docs/privileged-commands.md) | Configure sudoers for commands like pm2, docker, systemctl |

## Managing the Service

```bash
# Start
vps-deployer start

# Status
systemctl --user status vps-deployer

# Logs
journalctl --user -u vps-deployer -f

# Stop
systemctl --user stop vps-deployer

# Remove entirely
vps-deployer uninstall
```

## Security

- Runs as a **user-level systemd service** — no root required
- The web UI is protected by session-based authentication (login/register)
- Rate limiting is applied on auth endpoints (40 req/min per IP)
- Every webhook is verified using HMAC-SHA256 with a per-project secret
- Dangerous commands (`rm -rf /`, `shutdown`, `reboot`, `mkfs`, fork bombs) are blocked
- Use a strong, unique session key (`-s` flag)
- Keep the working directory restricted to the tool only

## License

MIT — see [LICENSE](https://github.com/0xv1shal/vps-deployer/blob/main/LICENSE) for details.
