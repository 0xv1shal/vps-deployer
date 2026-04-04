# Running Privileged Commands

VPS Deployer runs as a **user-level systemd service** — no root required. However, some deployment commands (like `pm2 restart`, `systemctl reload nginx`, binding to port 80/443) may need elevated privileges.

This guide shows you how to configure `sudoers` so your deployment commands can run privileged operations **without a password prompt**.

## The Problem

When VPS Deployer runs a deployment command like `pm2 restart my-app`, it runs as your user (not root). If `pm2` was installed globally with `sudo`, or if you need to restart a system service, the command will fail with a permission error.

## The Solution: `sudoers` NOPASSWD

You can grant your user passwordless `sudo` access to **specific commands only**. This is safe because you explicitly whitelist which commands are allowed.

## Step 1: Find the Full Path to Each Command

```bash
which pm2
# /home/vpsmanager/.nvm/versions/node/v24.14.0/bin/pm2

which systemctl
# /usr/bin/systemctl
```

## Step 2: Edit the Sudoers File

```bash
sudo visudo -f /etc/sudoers.d/vps-deployer
```

> Always use `visudo` — it validates the syntax before saving, preventing lockout from typos.

## Step 3: Add Rules

Add one line per command you want to allow:

```
vpsmanager ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart *, /usr/bin/systemctl reload *
vpsmanager ALL=(ALL) NOPASSWD: /home/vpsmanager/.nvm/versions/node/v24.14.0/bin/pm2 *
vpsmanager ALL=(ALL) NOPASSWD: /usr/bin/docker *
```

Replace `vpsmanager` with your actual username.

### Wildcard Rules

The `*` at the end allows any arguments after the command. For example:

```
sudo pm2 restart my-app    # allowed
sudo pm2 restart another   # allowed
```

### Specific Rules (More Secure)

If you want to restrict to specific arguments:

```
vpsmanager ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
vpsmanager ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload caddy
vpsmanager ALL=(ALL) NOPASSWD: /home/vpsmanager/.nvm/versions/node/v24.14.0/bin/pm2 restart my-app
```

## Step 4: Test

```bash
sudo pm2 restart my-app
# Should work without a password prompt
```

## Step 5: Update Your Project Commands

In your VPS Deployer project's command list, prefix privileged commands with `sudo`:

```
1. git pull origin main
2. npm install
3. npm run build
4. sudo pm2 restart my-app
```

## Common Commands to Whitelist

| Command | Sudoers Rule |
|---------|-------------|
| `pm2` | `username ALL=(ALL) NOPASSWD: /path/to/pm2 *` |
| `systemctl restart/reload` | `username ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart *, /usr/bin/systemctl reload *` |
| `docker` | `username ALL=(ALL) NOPASSWD: /usr/bin/docker *` |
| `nginx -s reload` | `username ALL=(ALL) NOPASSWD: /usr/sbin/nginx -s reload` |
| `setcap` (for port binding) | `username ALL=(ALL) NOPASSWD: /usr/sbin/setcap *` |

## Binding to Port 80/443 Without Root

If your app needs to listen on port 80 or 443, you don't need `sudo` at runtime. Instead, grant the `cap_net_bind_service` capability to the Node.js binary **once**:

```bash
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

After this, Node.js can bind to privileged ports without running as root. This is a one-time setup — no sudoers rule needed.

## Security Notes

- Only whitelist commands you actually need
- Use specific argument rules when possible (e.g., `pm2 restart my-app` instead of `pm2 *`)
- Never whitelist `sudo` itself or `visudo`
- Review your rules periodically with `sudo cat /etc/sudoers.d/vps-deployer`
- To revoke access, simply delete the file: `sudo rm /etc/sudoers.d/vps-deployer`
