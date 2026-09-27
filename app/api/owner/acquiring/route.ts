import { verifyGoogleUser, verifyOwnerSession } from "../auth";

type Business = { name?: unknown; type?: unknown; ownership?: unknown; assets?: unknown };
type StoredData = {
  productsByBusiness?: Record<string, unknown>;
  paymentsByBusiness?: Record<string, unknown>;
  payoutsByBusiness?: Record<string, unknown>;
  linksByBusiness?: Record<string, unknown>;
};
type StoreRow = { account?: unknown; businesses?: unknown; products_by_business?: unknown; updated_at?: unknown };

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const countItems = (value: unknown) => Object.values(asRecord(value)).reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0);

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  const ownerSession = request.headers.get("x-owner-session")?.trim();
  const verifiedOwner = user ? await verifyOwnerSession(request, user.id) : false;
  if (!user || (!verifiedOwner && !ownerSession)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ error: "Acquiring storage is not configured" }, { status: 503 });

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/acquiring_stores?select=account,businesses,products_by_business,updated_at`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
    });
    if (!response.ok) throw new Error("Acquiring storage unavailable");
    const rows = await response.json() as StoreRow[];
    let products = 0;
    let payments = 0;
    let payouts = 0;
    let paymentLinks = 0;
    const businesses = rows.flatMap((row) => {
      const data = asRecord(row.products_by_business) as StoredData;
      const store = data.productsByBusiness ? data : { productsByBusiness: data };
      products += countItems(store.productsByBusiness);
      payments += countItems(store.paymentsByBusiness);
      payouts += countItems(store.payoutsByBusiness);
      paymentLinks += countItems(store.linksByBusiness);
      const account = typeof row.account === "string" ? row.account : "—";
      const updatedAt = typeof row.updated_at === "string" ? row.updated_at : null;
      return (Array.isArray(row.businesses) ? row.businesses : []).flatMap((entry) => {
        const business = asRecord(entry) as Business;
        const name = typeof business.name === "string" ? business.name.trim() : "";
        if (!name) return [];
        return [{
          account,
          name,
          type: typeof business.type === "string" ? business.type : "Бізнес",
          ownership: typeof business.ownership === "string" ? business.ownership : "—",
          assets: Array.isArray(business.assets) ? business.assets.filter((item): item is string => typeof item === "string") : [],
          updatedAt,
        }];
      });
    }).sort((first, second) => String(second.updatedAt || "").localeCompare(String(first.updatedAt || "")) || first.name.localeCompare(second.name, "uk"));

    return Response.json({
      metrics: { businesses: businesses.length, merchants: new Set(businesses.map((business) => business.account)).size, products, payments, paymentLinks, payouts },
      businesses,
      updatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
  } catch {
    return Response.json({ error: "Acquiring storage is unavailable" }, { status: 503 });
  }
}
