/**
 * Render runs the dashboard with Node.js, which cannot resolve the
 * `cloudflare:workers` URL scheme. The dashboard's normal pages do not need
 * D1; this shim allows the server to boot and keeps the Telegram/D1 endpoints
 * unavailable unless equivalent Node services are configured.
 */
export const env = process.env as {
  DB?: any;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  [key: string]: unknown;
};
