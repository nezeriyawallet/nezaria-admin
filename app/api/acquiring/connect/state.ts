export type Connection = { merchant: string; wallet: string; connectedAt: number; session: string; expiresAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __nezeriyaPayConnections: Map<string, Connection> | undefined;
}

const connections = globalThis.__nezeriyaPayConnections ??= new Map<string, Connection>();
const pendingTtlMs = 15 * 60 * 1000;
const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;

export function connectWallet(token: string, merchant: string, wallet: string) {
  const now = Date.now();
  const connection: Connection = { merchant, wallet, connectedAt: now, session: crypto.randomUUID().replace(/-/g, ""), expiresAt: now + sessionTtlMs };
  connections.set(token, connection);
  return connection;
}

export function getConnection(token: string) {
  const connection = connections.get(token);
  if (!connection) return undefined;
  if (Date.now() > connection.expiresAt || (!connection.session && Date.now() - connection.connectedAt > pendingTtlMs)) {
    connections.delete(token);
    return undefined;
  }
  return connection;
}

function matchesSession(connection: Connection, session: string, account: string, wallet: string) {
  return connection.session === session && connection.expiresAt > Date.now()
    && connection.merchant.trim().toLocaleLowerCase("uk-UA") === account.trim().toLocaleLowerCase("uk-UA")
    && connection.wallet === wallet;
}

export async function validSession(session: string, account: string, wallet: string) {
  const now = Date.now();
  for (const connection of connections.values()) {
    if (matchesSession(connection, session, account, wallet)) return true;
  }
  // Render replaces the Node process on every deployment. Connections are also
  // saved in acquiring_stores, so recover a valid wallet session rather than
  // incorrectly logging an active merchant out after a deploy.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!session || !url || !key) return false;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/acquiring_stores?select=products_by_business`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
    });
    if (!response.ok) return false;
    const rows = await response.json() as Array<{ products_by_business?: unknown }>;
    for (const row of rows) {
      const store = row.products_by_business && typeof row.products_by_business === "object" ? row.products_by_business as Record<string, unknown> : {};
      const saved = store.acquiringConnections && typeof store.acquiringConnections === "object" ? store.acquiringConnections as Record<string, Connection> : {};
      for (const connection of Object.values(saved)) {
        const sameWallet = connection.session === session
          && connection.merchant.trim().toLocaleLowerCase("uk-UA") === account.trim().toLocaleLowerCase("uk-UA")
          && connection.wallet === wallet;
        // Sessions created before this release had a short 24-hour lifetime.
        // Give a stored Wallet connection a 30-day renewal window so a Render
        // restart never locks the merchant out of their own cabinet.
        if (sameWallet && Number(connection.connectedAt) > now - sessionTtlMs) {
          const restored = { ...connection, expiresAt: now + sessionTtlMs };
          connections.set(`restored_${session}`, restored);
          return true;
        }
      }
    }
  } catch {
    // The caller will retry on the next action if storage is temporarily down.
  }
  return false;
}
