export type Connection = { merchant: string; wallet: string; connectedAt: number; session: string; expiresAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __nezeriyaPayConnections: Map<string, Connection> | undefined;
}

const connections = globalThis.__nezeriyaPayConnections ??= new Map<string, Connection>();
const pendingTtlMs = 15 * 60 * 1000;
const sessionTtlMs = 24 * 60 * 60 * 1000;

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

export function validSession(session: string, account: string, wallet: string) {
  const now = Date.now();
  for (const connection of connections.values()) {
    if (connection.session === session && connection.expiresAt > now
      && connection.merchant.trim().toLocaleLowerCase("uk-UA") === account.trim().toLocaleLowerCase("uk-UA")
      && connection.wallet === wallet) return true;
  }
  return false;
}
