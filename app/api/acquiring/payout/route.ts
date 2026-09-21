type Payout = { id: string; createdAt: string; amount: string; currency: "USDT" | "GRAM"; status: "В обробці" | "Виконано"; wallet: string; transaction?: string; serverWallet?: string; business: string };
type Store = { payoutsByBusiness?: Record<string, Payout[]> };
type Row = { account: string; products_by_business: Store };

function config() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; }
function headers(key: string, extra: HeadersInit = {}) { return { apikey: key, Authorization: `Bearer ${key}`, ...extra }; }
const number = (value: unknown) => typeof value === "string" && /^(0|[1-9]\d*)(\.\d{1,6})?$/.test(value) && Number(value) > 0;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { account?: unknown; business?: unknown; amount?: unknown; currency?: unknown; wallet?: unknown };
  const account = typeof body.account === "string" ? body.account.trim().toLowerCase().slice(0, 120) : "";
  const business = typeof body.business === "string" ? body.business.trim().slice(0, 120) : "";
  const wallet = typeof body.wallet === "string" ? body.wallet.trim().slice(0, 180) : "";
  const currency = body.currency === "GRAM" ? "GRAM" : body.currency === "USDT" ? "USDT" : null;
  if (!account || !business || !wallet || !currency || !number(body.amount)) return Response.json({ error: "Некоректні дані виплати" }, { status: 400 });
  const connection = config(); if (!connection) return Response.json({ error: "Сховище недоступне" }, { status: 503 });
  const found = await fetch(`${connection.url}/rest/v1/acquiring_stores?account=eq.${encodeURIComponent(account)}&select=account,products_by_business&limit=1`, { headers: headers(connection.key), cache: "no-store" });
  const [row] = found.ok ? await found.json() as Row[] : [];
  if (!row) return Response.json({ error: "Бізнес не знайдено" }, { status: 404 });
  const store = row.products_by_business && typeof row.products_by_business === "object" ? row.products_by_business : {};
  const payouts = store.payoutsByBusiness && typeof store.payoutsByBusiness === "object" ? store.payoutsByBusiness : {};
  const payout: Payout = { id: `W-${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`, createdAt: new Date().toISOString(), amount: String(body.amount), currency, status: "В обробці", wallet, business };
  payouts[business] = [payout, ...(Array.isArray(payouts[business]) ? payouts[business] : [])];
  store.payoutsByBusiness = payouts;
  const saved = await fetch(`${connection.url}/rest/v1/acquiring_stores?account=eq.${encodeURIComponent(account)}`, { method: "PATCH", headers: headers(connection.key, { "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify({ products_by_business: store, updated_at: new Date().toISOString() }) });
  if (!saved.ok) return Response.json({ error: "Не вдалося створити заявку" }, { status: 503 });
  const bot = (process.env.NEZERIYA_WALLET_BOT || "Nezeriya_Wallet_Bot").replace(/^@/, "");
  return Response.json({ payout, walletUrl: `https://t.me/${bot}?startapp=payout_${payout.id}` });
}
