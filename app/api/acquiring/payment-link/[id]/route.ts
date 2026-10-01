import { Address, beginCell, Cell } from "@ton/core";

type ReceiptLine = { name: string; quantity: number; price: string; currency: "USDT" | "GRAM"; photo?: string };
type PaymentLink = { id: string; createdAt: string; expiresAt: string; title: string; amount: string; currency: "USDT" | "GRAM"; assets: Array<"USDT" | "GRAM">; products: ReceiptLine[]; note: string; message: string; oneTime: boolean; status: "Активне" | "Оплачено" | "Прострочено" };

declare global {
  // eslint-disable-next-line no-var
  var __nezeriyaPaymentLinkLocks: Set<string> | undefined;
}

const paymentLinkLocks = globalThis.__nezeriyaPaymentLinkLocks ??= new Set<string>();

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

type ChainTransaction = { transaction_id?: { hash?: unknown }; utime?: unknown; in_msg?: { source?: unknown; value?: unknown; msg_data?: { text?: unknown; body?: unknown } } };

async function serverJettonWallet(owner: string) {
  const secret = process.env.NEZERIYA_PAYMENT_CALLBACK_SECRET;
  if (!secret) return "";
  try {
    const walletApi = (process.env.NEZERIYA_WALLET_API_URL || "https://bot-5k6u.onrender.com").replace(/\/+$/, "");
    const response = await fetch(`${walletApi}/api/wallet/acquiring-jetton-wallet?owner=${encodeURIComponent(owner)}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: "no-store"
    });
    const data = response.ok ? await response.json().catch(() => ({})) as { jettonWallet?: unknown } : {};
    return typeof data.jettonWallet === "string" ? data.jettonWallet.trim() : "";
  } catch {
    return "";
  }
}

function jettonNotification(body: unknown) {
  if (typeof body !== "string" || !body) return null;
  try {
    const slice = Cell.fromBase64(body).beginParse();
    // TEP-74: transfer_notification#7362d09c query_id amount sender forward_payload
    if (slice.remainingBits < 32 || slice.loadUint(32) !== 0x7362d09c) return null;
    slice.skip(64);
    const amount = slice.loadCoins();
    const sender = slice.loadAddress()?.toString() || "";
    const forwardPayload = slice.loadBit() ? slice.loadRef() : slice.asCell();
    const textSlice = forwardPayload.beginParse();
    if (textSlice.remainingBits < 32 || textSlice.loadUint(32) !== 0) return null;
    return { amount, sender, text: textSlice.loadStringTail() };
  } catch {
    return null;
  }
}

/**
 * A direct TON transfer is credited only when its on-chain comment contains
 * the unique payment-link memo. This prevents assigning a different incoming
 * transfer (even with the same amount) to the wrong merchant order.
 */
async function findGramReceipt(recipient: string, link: PaymentLink) {
  try {
    const address = Address.parse(recipient).toRawString();
    const response = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(address)}&limit=20&archival=true`, { cache: "no-store" });
    const data = response.ok ? await response.json() as { result?: ChainTransaction[] } : null;
    const expected = tokenUnits(link.amount, 9);
    const createdAt = Math.floor(new Date(link.createdAt).getTime() / 1000) - 60;
    const memo = `Nezeriya Pay ${link.id}`;
    for (const transaction of data?.result || []) {
      const incoming = transaction.in_msg;
      const text = typeof incoming?.msg_data?.text === "string" ? incoming.msg_data.text : "";
      const value = typeof incoming?.value === "string" && /^\d+$/.test(incoming.value) ? BigInt(incoming.value) : 0n;
      const receivedAt = typeof transaction.utime === "number" ? transaction.utime : 0;
      if (text !== memo || value < expected || receivedAt < createdAt) continue;
      return {
        transaction: typeof transaction.transaction_id?.hash === "string" ? transaction.transaction_id.hash : "",
        wallet: typeof incoming?.source === "string" ? incoming.source : "",
      };
    }
  } catch {
    // Chain providers are best-effort here. The authenticated Wallet callback
    // remains the primary confirmation path and will retry on the next poll.
  }
  return null;
}

/**
 * TonConnect sends USDT as a TEP-74 jetton transfer. Unlike a native TON
 * transfer it cannot be verified from the owner's wallet transaction list:
 * the notification arrives at Nezeriya's jetton wallet. Scan that wallet and
 * require both the exact memo and amount before creating a receipt.
 */
async function findUsdtReceipt(recipient: string, link: PaymentLink) {
  const expected = tokenUnits(link.amount, 6);
  const createdAt = Math.floor(new Date(link.createdAt).getTime() / 1000) - 60;
  const memo = `Nezeriya Pay ${link.id}`;
  const scan = async (candidate: string) => {
    try {
      const address = Address.parse(candidate).toRawString();
      const response = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(address)}&limit=100&archival=true`, { cache: "no-store" });
      const data = response.ok ? await response.json() as { result?: ChainTransaction[] } : null;
      for (const transaction of data?.result || []) {
        const receivedAt = typeof transaction.utime === "number" ? transaction.utime : 0;
        const notification = jettonNotification(transaction.in_msg?.msg_data?.body);
        if (!notification || notification.text !== memo || notification.amount < expected || receivedAt < createdAt) continue;
        return {
          transaction: typeof transaction.transaction_id?.hash === "string" ? transaction.transaction_id.hash : "",
          wallet: notification.sender,
        };
      }
    } catch {
      // A second address is still checked if the provider rejects one query.
    }
    return null;
  };
  try {
    // USDT notifications are delivered to the recipient owner wallet. This
    // must be checked before any optional wallet-service request can fail.
    const ownerReceipt = await scan(recipient);
    if (ownerReceipt) return ownerReceipt;
    const jettonWallet = await serverJettonWallet(recipient);
    if (jettonWallet && jettonWallet !== recipient) return scan(jettonWallet);
  } catch {
    // The next short poll retries when the public chain provider is delayed.
  }
  return null;
}

async function saveReceipt(found: NonNullable<Awaited<ReturnType<typeof locate>>>, proof: { transaction?: string; wallet?: string; amount?: string; currency?: string }) {
  const linkId = found.link.id;
  if (paymentLinkLocks.has(linkId)) return false;
  paymentLinkLocks.add(linkId);
  try {
    // Reload while holding the lock, so a polling request and a Wallet callback
    // cannot both turn the same link into separate receipts.
    const current = await locate(linkId);
    if (!current) throw new Error("Посилання не знайдено");
    if (current.link.status === "Оплачено") return false;
    if (current.link.status !== "Активне" || new Date(current.link.expiresAt).getTime() < Date.now()) throw new Error("Посилання вже недійсне");

    const paidCurrency = proof.currency === "USDT" || proof.currency === "GRAM" ? proof.currency : current.link.currency;
    const paidAmount = typeof proof.amount === "string" && /^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(proof.amount) && Number(proof.amount) > 0 ? proof.amount : current.link.amount;
    if (!(current.link.assets || [current.link.currency]).includes(paidCurrency)) throw new Error("Цей актив не дозволений для посилання");

    const links = current.store.linksByBusiness as Record<string, PaymentLink[]>;
    links[current.businessName] = [...links[current.businessName]];
    links[current.businessName][current.index] = { ...current.link, status: "Оплачено" as const };
    const payments = (current.store.paymentsByBusiness as Record<string, unknown[]> | undefined) || {};
    const existing = Array.isArray(payments[current.businessName]) ? payments[current.businessName] : [];
    const duplicate = existing.some((payment) => {
      const saved = payment && typeof payment === "object" ? payment as { paymentLinkId?: unknown; transaction?: unknown } : {};
      return saved.paymentLinkId === linkId || Boolean(proof.transaction && saved.transaction === proof.transaction);
    });
    if (!duplicate) payments[current.businessName] = [{ id: `P-${Date.now().toString().slice(-6)}`, paymentLinkId: linkId, createdAt: new Date().toISOString(), source: "Платіжне посилання", sourceName: "Платіжне посилання", status: "Оплачено", currency: paidCurrency, amount: paidAmount, products: current.link.products, transaction: proof.transaction, wallet: proof.wallet }, ...existing];
    current.store.linksByBusiness = links;
    current.store.paymentsByBusiness = payments;
    const response = await fetch(`${current.connection.url}/rest/v1/acquiring_stores?account=eq.${encodeURIComponent(current.row.account)}`, { method: "PATCH", headers: apiHeaders(current.connection.key, { "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify({ products_by_business: current.store, updated_at: new Date().toISOString() }) });
    if (!response.ok) throw new Error("Save failed");
    return !duplicate;
  } finally {
    paymentLinkLocks.delete(linkId);
  }
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
    const active = !expired && found.link.status === "Активне";
    const supportsGram = (found.link.assets || [found.link.currency]).includes("GRAM");
    const supportsUsdt = (found.link.assets || [found.link.currency]).includes("USDT");
    const gramReceipt = active && supportsGram ? await findGramReceipt(recipient, found.link) : null;
    const usdtReceipt = !gramReceipt && active && supportsUsdt ? await findUsdtReceipt(recipient, found.link) : null;
    const receipt = gramReceipt || usdtReceipt;
    if (receipt) await saveReceipt(found, { ...receipt, amount: found.link.amount, currency: gramReceipt ? "GRAM" : "USDT" });
    const externalUri = found.link.currency === "GRAM" ? gramPaymentUri(recipient, found.link.amount, id) : "";
    return Response.json({ link: { ...found.link, status: receipt ? "Оплачено" : expired ? "Прострочено" : found.link.status }, business: { name: found.businessName, logo: business?.logo }, recipient, recipientType: "server", walletUrl: `https://t.me/${bot}?startapp=pay_${encodeURIComponent(id)}`, externalPayment: { uri: externalUri, supported: Boolean(externalUri), message: externalUri ? "QR заповнить адресу, суму та memo у сумісному TON-гаманці." : "Оплата USDT через сторонній гаманець ще не підтримується без захищеної Jetton/TonConnect-інтеграції. Скористайтеся Nezeriya Wallet." } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Посилання тимчасово недоступне" }, { status: 503 }); }
}

/** Builds a TonConnect transaction; the later chain scan, never a client claim, marks an invoice paid. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const input = await request.json().catch(() => ({})) as { wallet?: unknown; currency?: unknown };
    const owner = typeof input.wallet === "string" ? input.wallet.trim() : "";
    if (!owner) return Response.json({ error: "Підключіть TON-гаманець" }, { status: 400 });
    Address.parse(owner);
    const found = await locate((await context.params).id);
    if (!found || found.link.status !== "Активне" || new Date(found.link.expiresAt).getTime() < Date.now()) return Response.json({ error: "Посилання вже недійсне" }, { status: 409 });
    const recipient = await serverRecipient();
    if (!recipient) return Response.json({ error: "Серверний гаманець тимчасово недоступний" }, { status: 503 });
    const validUntil = Math.floor(Date.now() / 1000) + 5 * 60;
    const currency = input.currency === "GRAM" || input.currency === "USDT" ? input.currency : found.link.currency;
    if (!(found.link.assets || [found.link.currency]).includes(currency)) return Response.json({ error: "Цей актив не дозволений для посилання" }, { status: 400 });
    if (currency === "GRAM") {
      const amount = tokenUnits(found.link.amount, 9);
      if (amount <= 0n) return Response.json({ error: "Некоректна сума" }, { status: 400 });
      return Response.json({ validUntil, network: "-239", messages: [{ address: recipient, amount: amount.toString(), payload: commentPayload(found.link.id) }] });
    }
    const senderJettonWallet = await serverJettonWallet(owner);
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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const secret = process.env.NEZERIYA_PAYMENT_CALLBACK_SECRET; if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Підтвердження доступне лише для Nezeriya Wallet" }, { status: 403 }); const proof = await request.json().catch(() => ({})) as { transaction?: string; wallet?: string; amount?: string; currency?: string }; const found = await locate((await context.params).id); if (!found) return Response.json({ error: "Посилання не знайдено" }, { status: 404 }); if (found.link.status !== "Активне" || new Date(found.link.expiresAt).getTime() < Date.now()) return Response.json({ error: "Посилання вже недійсне" }, { status: 409 }); await saveReceipt(found, proof); return Response.json({ ok: true, message: found.link.message }); } catch { return Response.json({ error: "Не вдалося підтвердити оплату" }, { status: 503 }); } }
