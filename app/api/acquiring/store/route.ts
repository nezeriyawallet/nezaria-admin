type Business = { name: string; type: string; ownership: string; owner: string; email: string; phone: string; iban: string; taxId: string; description: string; logo?: string; assets: string[] };
type Product = { name: string; category: string; sku: string; price: string; currency: "USDT" | "GRAM"; quantity: string; description: string; terminals: string[]; photo?: string };
type ReceiptLine = { name: string; quantity: number; price: string; currency: "USDT" | "GRAM"; photo?: string };
type Payment = { id: string; createdAt: string; source: "Термінал" | "Платіжне посилання" | "Сайт"; sourceName: string; status: "Оплачено" | "Очікує підтвердження" | "Недоплата"; currency: "USDT" | "GRAM"; amount: string; products: ReceiptLine[]; transaction?: string; wallet?: string };
type Payout = { id: string; createdAt: string; amount: string; currency: "USDT" | "GRAM"; status: "В обробці" | "Виконано"; wallet: string; transaction?: string };
type Store = { businesses: Business[]; productsByBusiness: Record<string, Product[]>; paymentsByBusiness: Record<string, Payment[]>; payoutsByBusiness: Record<string, Payout[]>; payoutWallet: string };
type Config = { url: string; key: string };

const emptyStore: Store = { businesses: [], productsByBusiness: {}, paymentsByBusiness: {}, payoutsByBusiness: {}, payoutWallet: "" };
const normalizeAccount = (value: string) => value.trim().toLocaleLowerCase("uk-UA").slice(0, 120);

function config(): Config | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

function headers(connection: Config, extra: HeadersInit = {}) {
  return { apikey: connection.key, Authorization: `Bearer ${connection.key}`, ...extra };
}

async function fetchStore(connection: Config, account: string): Promise<Store> {
  const response = await fetch(`${connection.url}/rest/v1/acquiring_stores?account=eq.${encodeURIComponent(account)}&select=businesses,products_by_business&limit=1`, {
    headers: headers(connection), cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load acquiring store");
  const rows = await response.json() as Array<{ businesses?: unknown; products_by_business?: unknown }>;
  const row = rows[0];
  const saved = row?.products_by_business && typeof row.products_by_business === "object" ? row.products_by_business as Record<string, unknown> : {};
  const wrapped = saved.productsByBusiness && typeof saved.productsByBusiness === "object";
  return {
    businesses: Array.isArray(row?.businesses) ? row.businesses as Business[] : [],
    productsByBusiness: (wrapped ? saved.productsByBusiness : saved) as Record<string, Product[]>,
    paymentsByBusiness: wrapped && saved.paymentsByBusiness && typeof saved.paymentsByBusiness === "object" ? saved.paymentsByBusiness as Record<string, Payment[]> : {},
    payoutsByBusiness: wrapped && saved.payoutsByBusiness && typeof saved.payoutsByBusiness === "object" ? saved.payoutsByBusiness as Record<string, Payout[]> : {},
    payoutWallet: wrapped && typeof saved.payoutWallet === "string" ? saved.payoutWallet : "",
  };
}

export async function GET(request: Request) {
  const account = normalizeAccount(new URL(request.url).searchParams.get("account") || "");
  if (!account) return Response.json(emptyStore, { headers: { "Cache-Control": "no-store" } });
  const connection = config();
  if (!connection) return Response.json({ error: "Persistent storage is not configured" }, { status: 503 });
  try {
    return Response.json(await fetchStore(connection, account), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Persistent storage is unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const data = await request.json() as { account?: string; businesses?: Business[]; productsByBusiness?: Record<string, Product[]>; paymentsByBusiness?: Record<string, Payment[]>; payoutsByBusiness?: Record<string, Payout[]>; payoutWallet?: string };
  const account = normalizeAccount(data.account || "");
  if (!account) return Response.json({ error: "Account is required" }, { status: 400 });
  const connection = config();
  if (!connection) return Response.json({ error: "Persistent storage is not configured" }, { status: 503 });
  const businesses = Array.isArray(data.businesses) ? data.businesses.slice(0, 50) : [];
  const productsByBusiness = data.productsByBusiness && typeof data.productsByBusiness === "object" ? data.productsByBusiness : {};
  const paymentsByBusiness = data.paymentsByBusiness && typeof data.paymentsByBusiness === "object" ? data.paymentsByBusiness : {};
  const payoutsByBusiness = data.payoutsByBusiness && typeof data.payoutsByBusiness === "object" ? data.payoutsByBusiness : {};
  const payoutWallet = typeof data.payoutWallet === "string" ? data.payoutWallet.trim().slice(0, 180) : "";
  const response = await fetch(`${connection.url}/rest/v1/acquiring_stores?on_conflict=account`, {
    method: "POST",
    headers: headers(connection, { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ account, businesses, products_by_business: { productsByBusiness, paymentsByBusiness, payoutsByBusiness, payoutWallet }, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) return Response.json({ error: "Unable to save acquiring store" }, { status: 503 });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
