import { connectWallet, getConnection } from "./state";
type StoredConnection = { merchant: string; wallet: string; connectedAt: number; session: string; expiresAt: number };
type StoreRow = { account?: string; businesses?: unknown; products_by_business?: unknown };

function cors() {
  return {
    // The Wallet can be served from its Telegram Web App domain or a custom
    // domain. This endpoint accepts an unguessable one-time token and does
    // not use browser cookies, so it is safe to accept that cross-origin call.
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
}

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function accountKey(merchant: string) {
  return merchant.trim().toLocaleLowerCase("uk-UA").slice(0, 120) || "nezeriya-wallet";
}

async function persistConnection(token: string, connection: StoredConnection) {
  const connectionStore = storage();
  if (!connectionStore) return;
  const account = accountKey(connection.merchant);
  try {
    const current = await fetch(`${connectionStore.url}/rest/v1/acquiring_stores?account=eq.${encodeURIComponent(account)}&select=businesses,products_by_business&limit=1`, { headers: headers(connectionStore.key), cache: "no-store" });
    const rows = current.ok ? await current.json() as StoreRow[] : [];
    const row = rows[0];
    const saved = row?.products_by_business && typeof row.products_by_business === "object" ? row.products_by_business as Record<string, unknown> : {};
    const connections = saved.acquiringConnections && typeof saved.acquiringConnections === "object" ? saved.acquiringConnections as Record<string, StoredConnection> : {};
    const nextConnections = { ...connections, [token]: connection };
    const products = { ...saved, acquiringConnections: nextConnections };
    await fetch(`${connectionStore.url}/rest/v1/acquiring_stores?on_conflict=account`, { method: "POST", headers: { ...headers(connectionStore.key), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ account, businesses: Array.isArray(row?.businesses) ? row.businesses : [], products_by_business: products, updated_at: new Date().toISOString() }) });
  } catch {
    // The in-memory channel remains available if persistent storage is down.
  }
}

async function storedConnection(token: string): Promise<StoredConnection | undefined> {
  const connectionStore = storage();
  if (!connectionStore) return undefined;
  try {
    const response = await fetch(`${connectionStore.url}/rest/v1/acquiring_stores?select=products_by_business&limit=1000`, { headers: headers(connectionStore.key), cache: "no-store" });
    if (!response.ok) return undefined;
    const rows = await response.json() as StoreRow[];
    for (const row of rows) {
      const saved = row.products_by_business && typeof row.products_by_business === "object" ? row.products_by_business as Record<string, unknown> : {};
      const connections = saved.acquiringConnections && typeof saved.acquiringConnections === "object" ? saved.acquiringConnections as Record<string, StoredConnection> : {};
      const connection = connections[token];
      if (connection && Number(connection.expiresAt) > Date.now()) return connection;
    }
  } catch {
    // Polling returns `connected: false` and will try again on the next cycle.
  }
  return undefined;
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
  const connection = connectWallet(token, merchant, wallet);
  await persistConnection(token, connection);
  console.info("[acquiring-connect] Wallet confirmation received", { tokenSuffix: token.slice(-6) });
  return Response.json({ ok: true }, { headers: cors() });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const connection = getConnection(token) || await storedConnection(token);
  if (!connection) return Response.json({ connected: false }, { headers: cors() });
  // Do not consume the status on the first poll. Browsers may pause/resume or
  // have more than one registration tab; each tab needs to see the confirmation.
  return Response.json({ connected: true, merchant: connection.merchant, wallet: connection.wallet, connectedAt: connection.connectedAt, session: connection.session, expiresAt: connection.expiresAt }, { headers: cors() });
}
