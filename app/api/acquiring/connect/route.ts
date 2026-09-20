type Connection = { merchant: string; wallet: string; connectedAt: number };

declare global {
  // Keep a short-lived bridge between the Wallet WebApp and the browser that
  // displayed the QR code. The acquiring service runs as a single instance.
  // This avoids relying on localStorage, which is isolated per browser/app.
  // eslint-disable-next-line no-var
  var __nezeriyaPayConnections: Map<string, Connection> | undefined;
}

const connections = globalThis.__nezeriyaPayConnections ??= new Map<string, Connection>();
const walletOrigin = "https://bot-5k6u.onrender.com";
const connectionTtlMs = 15 * 60 * 1000;

function getActiveConnection(token: string) {
  const connection = connections.get(token);
  if (!connection) return undefined;
  if (Date.now() - connection.connectedAt > connectionTtlMs) {
    connections.delete(token);
    return undefined;
  }
  return connection;
}

function cors() {
  return {
    "Access-Control-Allow-Origin": walletOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
}

function validToken(token: string) {
  return /^pay_[A-Za-z0-9_-]{6,80}$/.test(token);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function POST(request: Request) {
  const fields = new URLSearchParams(await request.text());
  const token = (fields.get("token") || "").trim();
  const merchant = (fields.get("merchant") || "Кав'ярня Nezeriya").trim().slice(0, 80) || "Кав'ярня Nezeriya";
  // The Wallet provides only its public address or public Wallet ID here.
  // Never accept, store, or transmit any private key or recovery phrase.
  const wallet = (fields.get("wallet") || fields.get("wallet_id") || fields.get("address") || merchant).trim().slice(0, 180);
  if (!validToken(token)) return Response.json({ error: "Invalid connection token" }, { status: 400, headers: cors() });
  connections.set(token, { merchant, wallet, connectedAt: Date.now() });
  console.info("[acquiring-connect] Wallet confirmation received", { tokenSuffix: token.slice(-6) });
  return Response.json({ ok: true }, { headers: cors() });
}

export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const connection = getActiveConnection(token);
  if (!connection) return Response.json({ connected: false }, { headers: cors() });
  // Do not consume the status on the first poll. Browsers may pause/resume or
  // have more than one registration tab; each tab needs to see the confirmation.
  return Response.json({ connected: true, merchant: connection.merchant, wallet: connection.wallet, connectedAt: connection.connectedAt }, { headers: cors() });
}
