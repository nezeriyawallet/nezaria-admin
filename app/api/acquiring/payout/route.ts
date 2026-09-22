type Payout = { id: string; createdAt: string; amount: string; currency: "USDT" | "GRAM"; status: "В обробці" | "Виконано"; wallet: string; transaction?: string; serverWallet?: string; business: string };
type Store = { payoutsByBusiness?: Record<string, Payout[]> };
type Row = { account: string; products_by_business: Store };

function config() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; }
function headers(key: string, extra: HeadersInit = {}) { return { apikey: key, Authorization: `Bearer ${key}`, ...extra }; }
const number = (value: unknown) => typeof value === "string" && /^(0|[1-9]\d*)(\.\d{1,6})?$/.test(value) && Number(value) > 0;

async function sendImmediately(payoutId: string) {
  const secret = process.env.NEZERIYA_PAYMENT_CALLBACK_SECRET;
  const walletApi = (process.env.NEZERIYA_WALLET_API_URL || "https://bot-5k6u.onrender.com").replace(/\/+$/, "");
  if (!secret) return { ok: false, error: "Сервіс виплат не налаштовано" };
  try {
    const response = await fetch(`${walletApi}/api/wallet/internal/acquiring-payout/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ payoutId }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({})) as { transaction?: unknown; message?: unknown };
    return response.ok && typeof data.transaction === "string" ? { ok: true, transaction: data.transaction } : { ok: false, error: typeof data.message === "string" ? data.message : "Не вдалося виконати виплату" };
  } catch {
    return { ok: false, error: "Не вдалося зв’язатися з Nezeriya Wallet" };
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { account?: unknown; business?: unknown; amount?: unknown; currency?: unknown; wallet?: unknown };
  const account = typeof body.account === "string" ? body.account.trim().toLowerCase().slice(0, 120) : "";
  const business = typeof body.business === "string" ? body.business.trim().slice(0, 120) : "";
  const wallet = typeof body.wallet === "string" ? body.wallet.trim().slice(0, 180) : "";
  const currency = body.currency === "GRAM" ? "GRAM" : body.currency === "USDT" ? "USDT" : null;
  if (!account || !business || !wallet || !currency || !number(body.amount)) return Response.json({ error: "Некоректні дані виплати" }, { status: 400 });
  const session = request.headers.get("x-acquiring-session") || "";
  if (!validSession(session, account, wallet)) return Response.json({ error: "Сесія закінчилась. Відскануйте QR-код у Nezeriya Wallet ще раз." }, { status: 401 });
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
  const sent = await sendImmediately(payout.id);
  if (!sent.ok) return Response.json({ error: sent.error }, { status: 503 });
  return Response.json({ payout: { ...payout, status: "Виконано", transaction: sent.transaction } });
}
import { validSession } from "../connect/state";
