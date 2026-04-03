# CLI Reference

VPS Deployer is controlled via the command line. This document covers all available flags, subcommands, validation rules, and usage examples.

## Usage

```bash
sudo vps-deployer [options]
sudo vps-deployer <subcommand>
```

> **Note:** VPS Deployer must be run as root (`sudo`) because it creates systemd services and executes deployment commands on your system.

## Flags

| Flag | Alias | Required | Type | Description |
|------|-------|----------|------|-------------|
| `--working-dir` | `-w` | Yes* | `string` | Sets the working directory where all project data, the database, and configs will be stored |
| `--port` | `-p` | Yes* | `number` | Sets the port for the web UI and API server |
| `--session-key` | `-s` | Yes* | `string` | Sets the secret key used for session encryption |
| `--dev` | - | No | `boolean` | Run in development mode (foreground, no systemd) |
| `--help` | `-h` | No | - | Show help message |
| `--version` | `-V` | No | - | Show version number |

\* Required when running the main program (not a subcommand).

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `start` | Enable and start the vps-deployer systemd service (runs as daemon) |
| `uninstall` | Stop, disable, and remove the vps-deployer systemd service (does not delete the working folder) |

### `vps-deployer start`

Enables and starts the systemd service. Requires that you have already run `vps-deployer -w ... -p ... -s ...` at least once to generate the service file.

```bash
sudo vps-deployer start
```

After running, the terminal is freed. Check status and logs:

```bash
systemctl status vps-deployer
journalctl -u vps-deployer -f
```

### `vps-deployer uninstall`

Stops, disables, and removes the systemd service file. Does **not** delete your working directory, database, or project files.

```bash
sudo vps-deployer uninstall
```

## Validation Rules

### Working Directory (`-w`)

- Must be an **existing** directory on the filesystem
- The tool will **not** create the directory for you
- Must be created before running VPS Deployer

```bash
# Create the directory first
sudo mkdir -p /opt/vps-deployer

# Then generate configs
sudo vps-deployer -w /opt/vps-deployer -p 3000 -s my-secret-key
```

### Port (`-p`)

- Must be a **number**
- Must be in the range **1024–50000**
- Ports below 1024 are reserved for system services

```bash
# Valid
sudo vps-deployer -w /opt/vps-deployer -p 3000 -s my-secret-key
sudo vps-deployer -w /opt/vps-deployer -p 8080 -s my-secret-key

# Invalid (below 1024)
sudo vps-deployer -w /opt/vps-deployer -p 80 -s my-secret-key
# Error: 80 is not a valid port. Range is 1024-50000.

# Invalid (above 50000)
sudo vps-deployer -w /opt/vps-deployer -p 65000 -s my-secret-key
# Error: 65000 is not a valid port. Range is 1024-50000.
```

### Session Key (`-s`)

- Must be at least **6 characters** long
- Used to sign and encrypt session cookies
- Should be a strong, unique string in production

```bash
# Valid
sudo vps-deployer -w /opt/vps-deployer -p 3000 -s my-super-secret-key-123

# Invalid (too short)
sudo vps-deployer -w /opt/vps-deployer -p 3000 -s abc
# Error: Session key length should be >= 6
```

## Examples

### Production Setup (Two-Step)

```bash
# Step 1: Generate configs (exits immediately)
sudo vps-deployer -w /opt/vps-deployer -p 4430 -s "$(openssl rand -hex 32)"

# Step 2: Start the daemon
sudo vps-deployer start
```

### Development Mode (Foreground)

```bash
sudo vps-deployer -w /opt/vps-deployer -p 3000 -s dev-session-key --dev
```

Runs the server directly in your terminal. Press `Ctrl+C` to stop gracefully.

### Using Long Flags

```bash
sudo vps-deployer --working-dir /opt/vps-deployer --port 3000 --session-key my-session-key
```

## What Happens on Each Command

### Main Program (`vps-deployer -w ... -p ... -s ...`)

1. **Root check** — Exits if not run as root
2. **Argument parsing** — Validates all flags against the rules above
3. **Database initialization** — Creates `data.db` in the working directory if it doesn't exist
4. **Config generation** — Generates `caddy.config` and `nginx.config` reference files
5. **Systemd service file** — Writes `/etc/systemd/system/vps-deployer.service` (with `--daemon` in `ExecStart`)
6. **Exit** — Closes DB, flushes logs, exits with code 0

> The server does **not** start. Run `vps-deployer start` to launch the daemon.

### Dev Mode (`vps-deployer -w ... -p ... -s ... --dev`)

1. Steps 1–4 same as above
2. **Skips systemd** — No service file is created
3. **Starts the server** — Binds to `0.0.0.0:<port>` and runs in the foreground
4. Graceful shutdown on `Ctrl+C` (SIGINT) or SIGTERM

### Start Subcommand (`vps-deployer start`)

1. **Root check** — Exits if not run as root
2. **Validates** — Checks that the service file exists at `/etc/systemd/system/vps-deployer.service`
3. **Reloads systemd** — `systemctl daemon-reload`
4. **Enables** — `systemctl enable vps-deployer`
5. **Starts** — `systemctl start vps-deployer`
6. **Exits** — Terminal is freed

### Uninstall Subcommand (`vps-deployer uninstall`)

1. **Root check** — Exits if not run as root
2. **Stops** — `systemctl stop vps-deployer`
3. **Disables** — `systemctl disable vps-deployer`
4. **Removes** — Deletes `/etc/systemd/system/vps-deployer.service`
5. **Reloads** — `systemctl daemon-reload`
6. **Exits**

## Graceful Shutdown

When running in `--dev` mode, VPS Deployer handles `SIGINT` (Ctrl+C) and `SIGTERM` gracefully:

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
| `This command must be run as root` | Missing `sudo` | Prefix command with `sudo` |
| `Service file not found` | Ran `start` before generating configs | Run `vps-deployer -w ... -p ... -s ...` first |
