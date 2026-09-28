import { Address, beginCell } from "@ton/core";

type ReceiptLine = { name: string; quantity: number; price: string; currency: "USDT" | "GRAM"; photo?: string };
type PaymentLink = { id: string; createdAt: string; expiresAt: string; title: string; amount: string; currency: "USDT" | "GRAM"; assets: Array<"USDT" | "GRAM">; products: ReceiptLine[]; note: string; message: string; oneTime: boolean; status: "Активне" | "Оплачено" | "Прострочено" };

const config = () => { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; };
const apiHeaders = (key: string, extra: HeadersInit = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, ...extra });

async function locate(id: string) {
  const connection = config();
  if (!connection) throw new Error("Storage unavailable");
  const response = await fetch(`${connection.url}/rest/v1/acquiring_stores?select=account,businesses,products_by_business`, { headers: apiHeaders(connection.key), cache: "no-store" });
  if (!response.ok) throw new Error("Storage unavailable");
  const rows = await response.json() as Array<{ account: string; businesses: Array<{ name: string; logo?: string }>; products_by_business: Record<string, unknown> }>;
  for (const row of rows) { const store = row.products_by_business || {}; const links = store.linksByBusiness as Record<string, PaymentLink[]> | undefined; if (!links) continue; for (const [businessName, items] of Object.entries(links)) { const index = items.findIndex((item) => item.id === id); if (index >= 0) return { connection, row, store, businessName, index, link: items[index] }; }
  }
  return null;
}

async function serverRecipient() {
  const walletApi = (process.env.NEZERIYA_WALLET_API_URL || "https://bot-5k6u.onrender.com").replace(/\/+$/, "");
  const response = await fetch(`${walletApi}/api/wallet/acquiring-recipient`, { cache: "no-store" });
  const data = response.ok ? await response.json() as { recipient?: unknown } : null;
  return typeof data?.recipient === "string" ? data.recipient.trim() : "";
}

/**
 * A `ton://transfer` URI is only safe for native TON/GRAM payments. USDT on
 * TON is a jetton transfer, which requires an asset-specific payload; putting
 * USDT into a generic URI would make many wallets send TON instead.
 */
function gramPaymentUri(recipient: string, amount: string, memo: string) {
  const [whole = "0", decimal = ""] = amount.trim().replace(",", ".").split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(decimal)) return "";
  const nano = BigInt(whole) * 1_000_000_000n + BigInt((decimal + "000000000").slice(0, 9));
  if (nano <= 0n) return "";
  return `ton://transfer/${recipient}?amount=${nano.toString()}&text=${encodeURIComponent(`Nezeriya Pay ${memo}`)}`;
}

function tokenUnits(amount: string, decimals: number) {
  const [whole = "0", decimal = ""] = amount.trim().replace(",", ".").split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(decimal)) return 0n;
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt((decimal + "0".repeat(decimals)).slice(0, decimals));
}

function commentPayload(memo: string) {
  return beginCell().storeUint(0, 32).storeStringTail(`Nezeriya Pay ${memo}`).endCell().toBoc().toString("base64");
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const found = await locate((await context.params).id);
    if (!found) return Response.json({ error: "Посилання не знайдено" }, { status: 404 });
    const business = found.row.businesses.find((item) => item.name === found.businessName);
    const expired = found.link.status === "Активне" && new Date(found.link.expiresAt).getTime() < Date.now();
    const recipient = await serverRecipient();
    if (!recipient) return Response.json({ error: "Серверний гаманець Nezeriya тимчасово недоступний" }, { status: 503 });
    const bot = (process.env.NEZERIYA_WALLET_BOT || "Nezeriya_Wallet_Bot").replace(/^@/, "");
    const id = found.link.id;
    const externalUri = found.link.currency === "GRAM" ? gramPaymentUri(recipient, found.link.amount, id) : "";
    return Response.json({ link: { ...found.link, status: expired ? "Прострочено" : found.link.status }, business: { name: found.businessName, logo: business?.logo }, recipient, recipientType: "server", walletUrl: `https://t.me/${bot}?startapp=pay_${encodeURIComponent(id)}`, externalPayment: { uri: externalUri, supported: Boolean(externalUri), message: externalUri ? "QR заповнить адресу, суму та memo у сумісному TON-гаманці." : "Оплата USDT через сторонній гаманець ще не підтримується без захищеної Jetton/TonConnect-інтеграції. Скористайтеся Nezeriya Wallet." } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Посилання тимчасово недоступне" }, { status: 503 }); }
}

/** Builds a TonConnect transaction; it never marks an invoice paid on a client claim. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const input = await request.json().catch(() => ({})) as { wallet?: unknown };
    const owner = typeof input.wallet === "string" ? input.wallet.trim() : "";
    if (!owner) return Response.json({ error: "Підключіть TON-гаманець" }, { status: 400 });
    Address.parse(owner);
    const found = await locate((await context.params).id);
    if (!found || found.link.status !== "Активне" || new Date(found.link.expiresAt).getTime() < Date.now()) return Response.json({ error: "Посилання вже недійсне" }, { status: 409 });
    const recipient = await serverRecipient();
    if (!recipient) return Response.json({ error: "Серверний гаманець тимчасово недоступний" }, { status: 503 });
    const validUntil = Math.floor(Date.now() / 1000) + 5 * 60;
    if (found.link.currency === "GRAM") {
      const amount = tokenUnits(found.link.amount, 9);
      if (amount <= 0n) return Response.json({ error: "Некоректна сума" }, { status: 400 });
      return Response.json({ validUntil, network: "-239", messages: [{ address: recipient, amount: amount.toString(), payload: commentPayload(found.link.id) }] });
    }
    const secret = process.env.NEZERIYA_PAYMENT_CALLBACK_SECRET;
    const walletApi = (process.env.NEZERIYA_WALLET_API_URL || "https://bot-5k6u.onrender.com").replace(/\/+$/, "");
    if (!secret) return Response.json({ error: "Сервіс оплати ще налаштовується" }, { status: 503 });
    const resolved = await fetch(`${walletApi}/api/wallet/acquiring-jetton-wallet?owner=${encodeURIComponent(owner)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
    const data = resolved.ok ? await resolved.json().catch(() => ({})) as { jettonWallet?: unknown } : {};
    const senderJettonWallet = typeof data.jettonWallet === "string" ? data.jettonWallet : "";
    if (!senderJettonWallet) return Response.json({ error: "Не вдалося знайти USDT-гаманець. Переконайтеся, що в ньому є USDT у мережі TON." }, { status: 422 });
    const amount = tokenUnits(found.link.amount, 6);
    if (amount <= 0n) return Response.json({ error: "Некоректна сума" }, { status: 400 });
    const forwardPayload = beginCell().storeUint(0, 32).storeStringTail(`Nezeriya Pay ${found.link.id}`).endCell();
    const jettonPayload = beginCell().storeUint(0xf8a7ea5, 32).storeUint(0, 64).storeCoins(amount)
      .storeAddress(Address.parse(recipient)).storeAddress(Address.parse(owner)).storeBit(0)
      .storeCoins(1n).storeBit(1).storeRef(forwardPayload).endCell().toBoc().toString("base64");
    return Response.json({ validUntil, network: "-239", messages: [{ address: senderJettonWallet, amount: "50000000", payload: jettonPayload }] });
  } catch { return Response.json({ error: "Не вдалося підготувати безпечний платіж" }, { status: 503 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const secret = process.env.NEZERIYA_PAYMENT_CALLBACK_SECRET; if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Підтвердження доступне лише для Nezeriya Wallet" }, { status: 403 }); const proof = await request.json().catch(() => ({})) as { transaction?: string; wallet?: string; amount?: string; currency?: string }; const found = await locate((await context.params).id); if (!found) return Response.json({ error: "Посилання не знайдено" }, { status: 404 }); if (found.link.status !== "Активне" || new Date(found.link.expiresAt).getTime() < Date.now()) return Response.json({ error: "Посилання вже недійсне" }, { status: 409 }); const paidCurrency = proof.currency === "USDT" || proof.currency === "GRAM" ? proof.currency : found.link.currency; const paidAmount = typeof proof.amount === "string" && /^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(proof.amount) && Number(proof.amount) > 0 ? proof.amount : found.link.amount; if (!(found.link.assets || [found.link.currency]).includes(paidCurrency)) return Response.json({ error: "Цей актив не дозволений для посилання" }, { status: 409 }); const links = found.store.linksByBusiness as Record<string, PaymentLink[]>; const nextLink = { ...found.link, status: "Оплачено" as const }; links[found.businessName] = [...links[found.businessName]]; links[found.businessName][found.index] = nextLink; const payments = (found.store.paymentsByBusiness as Record<string, unknown[]> | undefined) || {}; const existing = Array.isArray(payments[found.businessName]) ? payments[found.businessName] : []; payments[found.businessName] = [{ id: `P-${Date.now().toString().slice(-6)}`, createdAt: new Date().toISOString(), source: "Платіжне посилання", sourceName: "Платіжне посилання", status: "Оплачено", currency: paidCurrency, amount: paidAmount, products: found.link.products, transaction: proof.transaction, wallet: proof.wallet }, ...existing]; found.store.linksByBusiness = links; found.store.paymentsByBusiness = payments; const response = await fetch(`${found.connection.url}/rest/v1/acquiring_stores?account=eq.${encodeURIComponent(found.row.account)}`, { method: "PATCH", headers: apiHeaders(found.connection.key, { "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify({ products_by_business: found.store, updated_at: new Date().toISOString() }) }); if (!response.ok) throw new Error("Save failed"); return Response.json({ ok: true, message: found.link.message }); } catch { return Response.json({ error: "Не вдалося підтвердити оплату" }, { status: 503 }); } }
