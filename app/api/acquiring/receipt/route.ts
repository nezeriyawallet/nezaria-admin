type ReceiptLine = { name: string; quantity: number; price: string; currency: "USDT" | "GRAM"; photo?: string };
type Payment = { id: string; createdAt: string; source: "Термінал" | "Платіжне посилання" | "Сайт"; sourceName: string; status: "Оплачено" | "Очікує підтвердження" | "Недоплата"; currency: "USDT" | "GRAM"; amount: string; products: ReceiptLine[]; transaction?: string; wallet?: string };
type StoredData = { productsByBusiness: Record<string, unknown>; paymentsByBusiness: Record<string, Payment[]>; payoutsByBusiness: Record<string, unknown>; payoutWallet: string };

const normalizeAccount = (value: string) => value.trim().toLocaleLowerCase("uk-UA").slice(0, 120);
const connection = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
};
const headers = (key: string, extra: HeadersInit = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, ...extra });

function parseStored(value: unknown): StoredData {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (data.productsByBusiness && typeof data.productsByBusiness === "object") return { productsByBusiness: data.productsByBusiness as Record<string, unknown>, paymentsByBusiness: data.paymentsByBusiness && typeof data.paymentsByBusiness === "object" ? data.paymentsByBusiness as Record<string, Payment[]> : {}, payoutsByBusiness: data.payoutsByBusiness && typeof data.payoutsByBusiness === "object" ? data.payoutsByBusiness as Record<string, unknown> : {}, payoutWallet: typeof data.payoutWallet === "string" ? data.payoutWallet : "" };
  return { productsByBusiness: data, paymentsByBusiness: {}, payoutsByBusiness: {}, payoutWallet: "" };
}

function normalizePayment(value: Partial<Payment>): Payment | null {
  if (!value.id?.trim() || !value.sourceName?.trim() || !value.amount?.trim()) return null;
  const source = value.source === "Термінал" || value.source === "Сайт" ? value.source : "Платіжне посилання";
  const currency = value.currency === "GRAM" ? "GRAM" : "USDT";
  const status = value.status === "Очікує підтвердження" || value.status === "Недоплата" ? value.status : "Оплачено";
  const products = Array.isArray(value.products) ? value.products.slice(0, 50).map((item) => ({ name: String(item.name || "Товар").slice(0, 160), quantity: Math.max(1, Number(item.quantity) || 1), price: String(item.price || "0.00").slice(0, 40), currency: item.currency === "GRAM" ? "GRAM" as const : "USDT" as const, photo: typeof item.photo === "string" ? item.photo.slice(0, 1_000_000) : undefined })) : [];
  return { id: value.id.trim().slice(0, 100), createdAt: value.createdAt || new Date().toISOString(), source, sourceName: value.sourceName.trim().slice(0, 120), status, currency, amount: value.amount.trim().slice(0, 40), products, transaction: value.transaction?.slice(0, 180), wallet: value.wallet?.slice(0, 180) };
}

/** Records a confirmed checkout. Terminal, payment-link and site checkout handlers call this endpoint once a payment is confirmed. */
export async function POST(request: Request) {
  const input = await request.json() as { account?: string; business?: string; payment?: Partial<Payment> };
  const account = normalizeAccount(input.account || "");
  const business = input.business?.trim().slice(0, 160) || "";
  const payment = normalizePayment(input.payment || {});
  const config = connection();
  if (!account || !business || !payment) return Response.json({ error: "Account, business and payment details are required" }, { status: 400 });
  if (!config) return Response.json({ error: "Persistent storage is not configured" }, { status: 503 });
  const query = `${config.url}/rest/v1/acquiring_stores?account=eq.${encodeURIComponent(account)}&select=businesses,products_by_business&limit=1`;
  const current = await fetch(query, { headers: headers(config.key), cache: "no-store" });
  if (!current.ok) return Response.json({ error: "Unable to load acquiring store" }, { status: 503 });
  const row = (await current.json() as Array<{ businesses?: unknown; products_by_business?: unknown }>)[0];
  const businesses = Array.isArray(row?.businesses) ? row.businesses : [];
  if (!businesses.some((item) => item && typeof item === "object" && (item as { name?: string }).name === business)) return Response.json({ error: "Business was not found" }, { status: 404 });
  const stored = parseStored(row?.products_by_business);
  const existing = stored.paymentsByBusiness[business] || [];
  if (!existing.some((item) => item.id === payment.id || (payment.transaction && item.transaction === payment.transaction))) stored.paymentsByBusiness[business] = [payment, ...existing].slice(0, 500);
  const saved = await fetch(`${config.url}/rest/v1/acquiring_stores?on_conflict=account`, { method: "POST", headers: headers(config.key, { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify({ account, businesses, products_by_business: stored, updated_at: new Date().toISOString() }) });
  if (!saved.ok) return Response.json({ error: "Unable to save receipt" }, { status: 503 });
  return Response.json({ ok: true, receipt: payment }, { headers: { "Cache-Control": "no-store" } });
}
