# Architecture

This document explains how VPS Deployer works under the hood — its components, data flow, and file structure.

## Overview

VPS Deployer is a lightweight, self-hosted CD system built on Node.js with Express. It consists of:

- A **CLI** for generating configs and managing the systemd service
- A **web UI** (server-rendered with Pug) for managing projects and monitoring deployments
- A **webhook receiver** for accepting GitHub push events
- An **SQLite database** for persisting all state
- An **email notification system** for deployment alerts

## Components

### CLI (`src/index.ts`)

The entry point. It operates in three modes depending on how it's invoked:

**Mode 1: Config Generation** (default — `vps-deployer -w ... -p ... -s ...`)
1. Parses CLI arguments (`-w`, `-p`, `-s`)
2. Validates inputs (directory exists, port range, session key length)
3. Initializes the SQLite database
4. Generates reference config files (Caddy, Nginx)
5. Creates a systemd service file at `/etc/systemd/system/vps-deployer.service` (with `--daemon` injected into `ExecStart`)
6. Exits immediately

**Mode 2: Dev Mode** (`vps-deployer -w ... -p ... -s ... --dev`)
1. Steps 1–4 same as above
2. Skips systemd service creation
3. Starts the Express server in the foreground
4. Sets up graceful shutdown handlers (SIGINT, SIGTERM)

**Mode 3: Daemon Mode** (invoked by systemd with `--daemon` flag)
1. Steps 1–4 same as above
2. Skips systemd service creation (already running inside systemd)
3. Starts the Express server as a background daemon
4. Sets up graceful shutdown handlers

**Subcommands:**
- `vps-deployer start` — Enables and starts the systemd service
- `vps-deployer uninstall` — Stops, disables, and removes the systemd service

### Web Server (`src/app.ts`)

An Express 5 application that:

- Serves Pug templates from `dist/modules/*/views/`
- Serves static assets from `public/`
- Manages sessions via `express-session`
- Applies security headers via `helmet`
- Rate-limits auth endpoints via `limitngin`

### Database (`src/db/db.ts`)

Uses `better-sqlite3` for synchronous, file-based storage. The database is created automatically on first run in the working directory as `data.db`.

See [Database Schema](./schema.md) for full table definitions.

### Modules

The application follows a module-based structure:

```
src/modules/
├── auth/          # Login, register, session management
├── dashboard/     # Home page with stats and recent deployments
├── project/       # CRUD for projects, commands, and env vars
├── deployer/      # Manual deployment triggers and log viewing
├── webhook/       # GitHub webhook receiver (no auth required)
└── settings/      # SMTP configuration and test email
```

## Deployment Flow

### 1. Webhook Received

```
POST /webhook/:projectId
```

The webhook controller:

1. Looks up the project by ID
2. Verifies the HMAC-SHA256 signature using the project's `webhook_secret`
3. Checks if `auto_deploy` is enabled
4. Creates a new deployment record with status `running`
5. Begins executing deployment commands

### 2. Repository Clone/Pull

VPS Deployer does **not** automatically pull or clone the repository on webhook receipt. The user must explicitly include `git pull` (or `git clone`) as a command in their project's command list. The commands run inside the project directory (`<working-dir>/<project-id>/`), so the repository should already be cloned there from a previous deployment or manual setup.

### 3. Command Execution

Commands defined for the project are executed sequentially:

1. Each command runs via `child_process.exec` **inside the project directory** (`<working-dir>/<project-id>/`)
2. stdout and stderr are captured in real-time
3. Each command's output is logged to the `deployment_logs` table
4. If any command fails (non-zero exit code), the deployment stops
5. The deployment status is set to `success` or `failed`

> **Important:** Each command is a separate database entry and runs independently. If you need to change directories, you must chain it in the same command (e.g., `cd /var/www && ls`). You cannot create two separate command entries and expect the `cd` from the first to carry over to the second.

### 4. Email Notification

If email is configured and the project has notifications enabled:

1. An email is composed with deployment details
2. Sent via `nodemailer` using the configured SMTP settings
3. Includes commit info, status, duration, and a link to logs

## File Layout

After running `vps-deployer -w ... -p ... -s ...`, the working directory contains:

```
<working-dir>/
├── data.db                    # SQLite database (all state)
├── caddy.config               # Generated reverse proxy reference config
├── nginx.config               # Generated reverse proxy reference config
├── vps-deployer.log           # Application log file
├── systemd.file.copy.txt      # Systemd unit file reference
└── <project-id>/              # Per-project workspace
    ├── .env                   # Environment variables (from UI)
    └── ...                    # Cloned repository files
```

The systemd service file is written to `/etc/systemd/system/vps-deployer.service`.

## Reverse Proxy Configs

VPS Deployer generates `caddy.config` and `nginx.config` as **reference files**. These show you how to configure a reverse proxy to expose VPS Deployer behind a domain with HTTPS. They are not actively applied — you copy the relevant sections into your own proxy configuration.

## Systemd Service

When you run `vps-deployer -w ... -p ... -s ...`, a systemd unit file is created at `/etc/systemd/system/vps-deployer.service`. The `ExecStart` line includes a hidden `--daemon` flag so that when systemd starts the process, it runs the server directly instead of recreating the service file.

To start the service:

```bash
sudo vps-deployer start
```

This ensures:

- Auto-restart on crash
- Auto-start on boot
- Proper logging via `journalctl`

To remove the service:

```bash
sudo vps-deployer uninstall
```

## Session Management

- Sessions are stored in memory via `express-session`
- The session secret is provided via the `-s` CLI flag
- Authentication middleware (`requireAuth`) protects all routes except `/webhook/*`, `/login`, and `/register`

## Graceful Shutdown

When running in dev or daemon mode, VPS Deployer handles `SIGINT` and `SIGTERM` by:

1. Stopping the HTTP server (no new connections)
2. Setting a 5-second timeout on existing connections
3. Closing the SQLite database
4. Flushing all pending log writes
5. Exiting with code 0

A 10-second fallback forcefully closes all connections if graceful shutdown stalls.

## Logging

All operations are logged with:

- Timestamp (IST)
- Log level (INFO, WARN, ERROR)
- Source component (SERVER, SYSTEM, DEPLOY, etc.)
- Optional metadata (error messages, deployment IDs, etc.)

Logs are written to both the console and a log file (`vps-deployer.log`) in the working directory.
