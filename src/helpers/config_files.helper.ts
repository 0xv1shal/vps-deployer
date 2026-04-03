import fs from "fs";
import path from "path";
import { getPort, getWorkDirPath } from "./arg.helper.ts";

export const createProxyAndLogConfigs = () => {

  const dir  = getWorkDirPath()
  const port = getPort()

  const nginxPath = path.join(dir, "nginx.conf");
  const caddyPath = path.join(dir, "Caddyfile");
  const logFile = path.join(dir, "vps-deployer.log");

  // NGINX config
  const nginxConfig = `
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`.trim();

  // Caddy config
  const caddyConfig = `
:80 {
    reverse_proxy 127.0.0.1:${port}
}
`.trim();

  if (!fs.existsSync(nginxPath)) {
    fs.writeFileSync(nginxPath, nginxConfig);
  }

  if (!fs.existsSync(caddyPath)) {
    fs.writeFileSync(caddyPath, caddyConfig);
  }

  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, 'file created');
  }

  console.log('proxy config files created successfully')
};