import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "VPS Deployer Docs",
      disable404Route: true,
      logo: {
        src: "../public/favicon.svg",
      },
      sidebar: [
  {
    label: 'Getting Started',
    items: [
      { slug: 'getting-started/overview' },
      { slug: 'getting-started/installation' },
      { slug: 'getting-started/first-deployment' },
    ],
  },
  {
    label: 'Configuration',
    collapsed: true,
    items: [
      { slug: 'configuration/working-directory' },
      { slug: 'configuration/cli-commands' },
      { slug: 'configuration/systemd-service' },
    ],
  },
  {
    label: 'Projects',
    collapsed: true,
    items: [
      { slug: 'projects/managing-projects' },
      { slug: 'projects/build-commands' },
      { slug: 'projects/environment-variables' },
    ],
  },
  {
    label: 'Deployments',
    collapsed: true,
    items: [
      { slug: 'deployments/manual-deploys' },
      { slug: 'deployments/deployment-queue' },
      { slug: 'deployments/viewing-logs' },
    ],
  },
  {
    label: 'Webhooks',
    collapsed: true,
    items: [
      { slug: 'webhooks/github-setup' },
      { slug: 'webhooks/hmac-verification' },
      { slug: 'webhooks/troubleshooting' },
    ],
  },
  {
    label: 'Settings',
    collapsed: true,
    items: [
      { slug: 'settings/overview' },
      { slug: 'settings/email-settings' },
      { slug: 'settings/path-settings' },
    ],
  },
  {
    label: 'Security',
    collapsed: true,
    items: [
      { slug: 'security/auth-model' },
      { slug: 'security/command-blocking' },
      { slug: 'security/best-practices' },
    ],
  },
  {
    label: 'Production',
    collapsed: true,
    items: [
      { slug: 'production/https-setup' },
      { slug: 'production/reverse-proxy' },
      { slug: 'production/backups-upgrades' },
    ],
  },
  {
    label: 'API Reference',
    collapsed: true,
    items: [
      { slug: 'api-reference/overview' },
      { slug: 'api-reference/endpoints' },
      { slug: 'api-reference/webhook-payload' },
    ],
  },
  {
    label: 'Contributing',
    collapsed: true,
    items: [
      { slug: 'contributing/setup' },
      { slug: 'contributing/guidelines' },
    ],
  },
],
    }),
  ],
});
