import { env } from "cloudflare:workers";

const encoder = new TextEncoder();

export type TelegramIdentity = { id: number; first_name?: string; last_name?: string; username?: string };

export function botToken() {
  const token = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram payments are not configured");
  return token;
}

export function database() {
  if (!env.DB) throw new Error("Points database is not configured");
  return env.DB;
}

export function webhookSecret() {
  const secret = env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) throw new Error("Telegram webhook is not configured");
  return secret;
}

export async function verifyMiniAppUser(initData: string, token: string): Promise<TelegramIdentity | null> {
  const values = new URLSearchParams(initData);
  const hash = values.get("hash");
  const authDate = Number(values.get("auth_date"));
  const rawUser = values.get("user");
  if (!hash || !rawUser || !Number.isFinite(authDate) || Date.now() / 1000 - authDate > 86_400) return null;

  values.delete("hash");
  const dataCheckString = [...values.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("\n");
  const webAppDataKey = await crypto.subtle.importKey("raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const secret = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(token));
  const checkKey = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", checkKey, encoder.encode(dataCheckString)));
  const received = hexToBytes(hash);
  if (!received || !safeEqual(signature, received)) return null;

  try {
    const user = JSON.parse(rawUser) as TelegramIdentity;
    return Number.isInteger(user.id) ? user : null;
  } catch {
    return null;
  }
}

export async function callTelegram(token: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as { ok?: boolean; result?: unknown; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description || "Telegram request failed");
  return result.result;
}

export async function ensurePaymentWebhook(token: string, requestUrl: string) {
  const webhookUrl = new URL("/api/telegram/webhook", requestUrl).toString();
  const info = await callTelegram(token, "getWebhookInfo", {}) as { url?: string };
  if (info.url === webhookUrl) return;
  await callTelegram(token, "setWebhook", {
    url: webhookUrl,
    secret_token: webhookSecret(),
    allowed_updates: ["pre_checkout_query", "message"],
  });
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

function safeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}
