# Webhook Setup

VPS Deployer uses GitHub webhooks to trigger automatic deployments. When you push to your configured branch, GitHub sends a POST request to VPS Deployer, which then runs your deployment commands.

## How It Works

```
You push to GitHub
       ↓
GitHub sends POST to your webhook URL
       ↓
VPS Deployer receives the webhook
       ↓
Executes your project commands in sequence (inside the project directory)
       ↓
Sends email notification (if enabled)
```

> **Important:** VPS Deployer does **not** automatically pull your repository when a webhook arrives. You must explicitly include a `git pull` (or `git clone`) command in your project's command list. For example:
>
> ```
> 1. git pull origin main
> 2. npm install
> 3. npm run build
> ```

## Finding Your Webhook URL and Secret

1. Navigate to your project in the VPS Deployer web UI
2. On the project details page, you'll see:
   - **Webhook URL** — the endpoint GitHub should send requests to
   - **Webhook Secret** — a randomly generated secret key used to verify request authenticity

The URL format is:

```
http://<your-server-ip>:<port>/webhook/<project-id>
```

If you're using a reverse proxy with HTTPS (e.g., Caddy), use:

```
https://deploy.yourdomain.com/webhook/<project-id>
```

> **Important:** Always use `https://` in your GitHub webhook URL if you have a reverse proxy. GitHub does not follow redirects, so `http://` will fail with a 302 error.

The `<project-id>` is a UUID that uniquely identifies your project. The **webhook secret** is a 64-character hex string generated automatically when you create the project.

## Configuring GitHub Webhooks

### Step 1: Go to Your Repository Settings

Navigate to your GitHub repository and click **Settings** → **Webhooks** → **Add webhook**.

### Step 2: Fill in the Webhook Form

| Field | Value |
|-------|-------|
| **Payload URL** | Your VPS Deployer webhook URL (e.g., `http://203.0.113.50:3000/webhook/abc-123-def`) |
| **Content type** | `application/json` |
| **Secret** | **Required** — paste the webhook secret shown on your project details page |
| **SSL verification** | Enable if using HTTPS |

> **Important:** You must paste the exact webhook secret from the project details page. VPS Deployer verifies every incoming webhook using HMAC-SHA256 against this secret. If the secret doesn't match, the request will be rejected with a 401 error.

### Step 3: Select Events

Choose **Just the push event**. This ensures deployments only trigger on code pushes.

### Step 4: Save

Click **Add webhook**. GitHub will send a test ping to verify the endpoint.

## Auto Deploy vs Manual Deploy

Each project has an **Auto Deploy** toggle:

- **Auto Deploy ON**: Every push to the configured branch triggers an automatic deployment
- **Auto Deploy OFF**: Webhooks are received but deployments must be triggered manually from the web UI

## Supported Branches

VPS Deployer deploys from the branch you specified when creating the project. Pushes to other branches will not trigger deployments.

## Webhook Payload

VPS Deployer expects a standard GitHub push webhook payload. The key fields it uses:

- `ref` — The branch reference (e.g., `refs/heads/main`)
- `repository.clone_url` — The repository URL
- `repository.name` — The repository name
- `head_commit.id` — The commit SHA
- `head_commit.message` — The commit message
- `head_commit.author.name` — The commit author

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Webhook not received | Incorrect URL | Double-check the webhook URL in project settings |
| Deployment not triggered | Pushing to wrong branch | Verify the branch name matches your project config |
| GitHub shows "Connection refused" | Server not running or wrong port | Ensure VPS Deployer is running and accessible |
| Deployment fails | Command error in project | Check deployment logs in the web UI |

## Security Notes

- Every webhook is verified using HMAC-SHA256 with the project's secret — requests without a valid signature are rejected
- The webhook URL contains the project ID (UUID) — keep it private
- Never share your webhook secret or commit it to version control
- Consider placing VPS Deployer behind a reverse proxy with HTTPS in production
- Rate limiting is applied to auth endpoints to prevent abuse
