type Business = { name: string; type: string; ownership: string; owner: string; email: string; phone: string; iban: string; taxId: string; description: string; logo?: string; assets: string[] };
type Product = { name: string; category: string; sku: string; price: string; currency: "USDT" | "GRAM"; quantity: string; description: string; terminals: string[]; photo?: string };
type Store = { businesses: Business[]; productsByBusiness: Record<string, Product[]> };

declare global { var __nezeriyaPayStore: Map<string, Store> | undefined; }
const stores = globalThis.__nezeriyaPayStore ??= new Map<string, Store>();
const key = (value: string) => value.trim().toLocaleLowerCase("uk-UA").slice(0, 120);

export function GET(request: Request) {
  const account = key(new URL(request.url).searchParams.get("account") || "");
  return Response.json(stores.get(account) || { businesses: [], productsByBusiness: {} }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const data = await request.json() as { account?: string; businesses?: Business[]; productsByBusiness?: Record<string, Product[]> };
  const account = key(data.account || "");
  if (!account) return Response.json({ error: "Account is required" }, { status: 400 });
  const businesses = Array.isArray(data.businesses) ? data.businesses.slice(0, 50) : [];
  const productsByBusiness = data.productsByBusiness && typeof data.productsByBusiness === "object" ? data.productsByBusiness : {};
  stores.set(account, { businesses, productsByBusiness });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
