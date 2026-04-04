# CLI Reference

VPS Deployer is controlled via the command line. This document covers all available commands, flags, validation rules, and usage examples.

## Usage

```bash
vps-deployer <command> [options]
```

> **Note:** VPS Deployer runs as a **user-level systemd service** — no `sudo` required.

## Commands

| Command | Description |
|---------|-------------|
| `config` | Generate user-level systemd service file, database, and configs |
| `start` | Enable and start the vps-deployer systemd service (runs as daemon) |
| `dev` | Run in development mode (foreground, no systemd) |
| `uninstall` | Stop, disable, and remove the vps-deployer systemd service |

### `vps-deployer config`

Generates the user-level systemd service file at `~/.config/systemd/user/vps-deployer.service`, initializes the database, and creates reference configs. Exits immediately.

```bash
vps-deployer config -w /opt/vps-deployer -p 3000 -s my-secret-key
```

| Flag | Alias | Required | Description |
|------|-------|----------|-------------|
| `--working-dir` | `-w` | Yes | Directory where projects and data will be stored |
| `--port` | `-p` | Yes | Port for the web UI and API (1024–50000) |
| `--session-key` | `-s` | Yes | Secret key for session encryption (min 6 characters) |

### `vps-deployer start`

Enables and starts the user-level systemd service. Requires that you have already run `vps-deployer config` at least once.

```bash
vps-deployer start
```

After running, the terminal is freed. Check status and logs:

```bash
systemctl --user status vps-deployer
journalctl --user -u vps-deployer -f
```

### `vps-deployer dev`

Runs the server directly in the foreground (no systemd). Useful for local development.

```bash
vps-deployer dev -w /opt/vps-deployer -p 3000 -s dev-session-key
```

Press `Ctrl+C` to stop gracefully.

### `vps-deployer uninstall`

Stops, disables, and removes the user-level systemd service file. Does **not** delete your working directory, database, or project files.

```bash
vps-deployer uninstall
```

## Validation Rules

### Working Directory (`-w`)

- Must be an **existing** directory on the filesystem
- The tool will **not** create the directory for you
- Must be created before running VPS Deployer

```bash
# Create the directory first
mkdir -p /opt/vps-deployer

# Then configure
vps-deployer config -w /opt/vps-deployer -p 3000 -s my-secret-key
```

### Port (`-p`)

- Must be a **number**
- Must be in the range **1024–50000**
- Ports below 1024 are reserved for system services

```bash
# Valid
vps-deployer config -w /opt/vps-deployer -p 3000 -s my-secret-key
vps-deployer config -w /opt/vps-deployer -p 8080 -s my-secret-key

# Invalid (below 1024)
vps-deployer config -w /opt/vps-deployer -p 80 -s my-secret-key
# Error: 80 is not a valid port. Range is 1024-50000.

# Invalid (above 50000)
vps-deployer config -w /opt/vps-deployer -p 65000 -s my-secret-key
# Error: 65000 is not a valid port. Range is 1024-50000.
```

### Session Key (`-s`)

- Must be at least **6 characters** long
- Used to sign and encrypt session cookies
- Should be a strong, unique string in production

```bash
# Valid
vps-deployer config -w /opt/vps-deployer -p 3000 -s my-super-secret-key-123

# Invalid (too short)
vps-deployer config -w /opt/vps-deployer -p 3000 -s abc
# Error: Session key length should be >= 6
```

## Examples

### Production Setup

```bash
# Step 1: One-time setup
loginctl enable-linger $USER

# Step 2: Generate configs (exits immediately)
vps-deployer config -w /opt/vps-deployer -p 4430 -s "$(openssl rand -hex 32)"

# Step 3: Start the daemon
vps-deployer start
```

### Development Mode (Foreground)

```bash
vps-deployer dev -w /opt/vps-deployer -p 3000 -s dev-session-key
```

Runs the server directly in your terminal. Press `Ctrl+C` to stop gracefully.

### Using Long Flags

```bash
vps-deployer config --working-dir /opt/vps-deployer --port 3000 --session-key my-session-key
```

## What Happens on Each Command

### `config`

1. **Argument parsing** — Validates all flags against the rules above
2. **Database initialization** — Creates `vps-deployer.db` in the working directory if it doesn't exist
3. **Config generation** — Generates `caddy.config` and `nginx.config` reference files
4. **Systemd service file** — Writes `~/.config/systemd/user/vps-deployer.service` (with absolute node path and `daemon` subcommand in `ExecStart`)
5. **Exit** — Closes DB, flushes logs, exits with code 0

> The server does **not** start. Run `vps-deployer start` to launch the daemon.

### `dev`

1. **Argument parsing** — Validates all flags
2. **Database initialization** — Creates `vps-deployer.db` if it doesn't exist
3. **Config generation** — Generates reference configs
4. **Starts the server** — Binds to `0.0.0.0:<port>` and runs in the foreground
5. Graceful shutdown on `Ctrl+C` (SIGINT) or SIGTERM

### `start`

1. **Validates** — Checks that the service file exists at `~/.config/systemd/user/vps-deployer.service`
2. **Reloads systemd** — `systemctl --user daemon-reload`
3. **Enables** — `systemctl --user enable vps-deployer`
4. **Starts** — `systemctl --user start vps-deployer`
5. **Exits** — Terminal is freed

### `uninstall`

1. **Stops** — `systemctl --user stop vps-deployer`
2. **Disables** — `systemctl --user disable vps-deployer`
3. **Removes** — Deletes `~/.config/systemd/user/vps-deployer.service`
4. **Reloads** — `systemctl --user daemon-reload`
5. **Exits**

## Graceful Shutdown

When running in `dev` mode, VPS Deployer handles `SIGINT` (Ctrl+C) and `SIGTERM` gracefully:

- Stops accepting new connections
- Waits for in-flight requests to complete (10-second timeout)
- Closes the database connection
- Flushes all logs

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `given DIR:<path> doesn't exists` | Working directory not created | `mkdir -p <path>` |
| `<port> is not a valid port` | Port outside 1024–50000 range | Use a port within the valid range |
| `Session key length should be >=6` | Session key too short | Use a longer, more secure key |
| `Service file not found` | Ran `start` before running `config` | Run `vps-deployer config -w ... -p ... -s ...` first |
| `systemctl --user failed` | User-level systemd not enabled | Run `loginctl enable-linger $USER` |
