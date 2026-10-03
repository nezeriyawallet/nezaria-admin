type Terminal = { id: string; name: string; location: string; business: string; assets: Array<"USDT" | "GRAM">; online: boolean; createdAt: string };
type Ticket = { id: string; code: string; account: string; business: string; name: string; location: string; expiresAt: string; used: boolean };type Product = { name?: unknown; price?: unknown; currency?: unknown; category?: unknown; description?: unknown; photo?: unknown; quantity?: unknown };
type Store = { productsByBusiness?: Record<string, Product[]>; terminalsByBusiness?: Record<string, Terminal[]>; terminalPairings?: Record<string, Ticket> };
type Row = { account: string; products_by_business: Store };

const TEN_MINUTES = 10 * 60 * 1000;
const config = () => { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; };
const headers = (key: string, extra: HeadersInit = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, ...extra });
const secure = () => crypto.getRandomValues(new Uint32Array(1))[0];
const clean = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";const serviceAllowed = (request: Request) => { const secret = process.env.NEZERIYA_PAYMENT_CALLBACK_SECRET; return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`; };
const catalogueProduct = (product: Product) => {
  const name = clean(product.name, 120);
  const price = Number(product.price);
  if (!name || !Number.isFinite(price) || price <= 0) return null;
  const currency = product.currency === "GRAM" ? "GRAM" : "USDT";
  const photo = clean(product.photo, 2_000_000);
  return { name, price: Number(price.toFixed(6)), currency, category: clean(product.category, 80), description: clean(product.description, 240), photo };
};

async function rows() {
  const connection = config();
  if (!connection) return null;
  const response = await fetch(`${connection.url}/rest/v1/acquiring_stores?select=account,products_by_business`, { headers: headers(connection.key), cache: "no-store" });
  return response.ok ? { connection, rows: await response.json() as Row[] } : null;
}

async function persist(connection: NonNullable<ReturnType<typeof config>>, account: string, store: Store) {
  return fetch(`${connection.url}/rest/v1/acquiring_stores?account=eq.${encodeURIComponent(account)}`, { method: "PATCH", headers: headers(connection.key, { "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify({ products_by_business: store, updated_at: new Date().toISOString() }) });
}

export async function GET(request: Request) {
  const account = clean(new URL(request.url).searchParams.get("account"), 120).toLocaleLowerCase("uk-UA");
  const business = clean(new URL(request.url).searchParams.get("business"), 120);
  const code = clean(new URL(request.url).searchParams.get("code"), 8);
  if (!account || !business) return Response.json({ error: "Не вказано бізнес" }, { status: 400 });
  const found = await rows(); if (!found) return Response.json({ error: "Сховище недоступне" }, { status: 503 });
  const row = found.rows.find((item) => item.account === account);
  if (!row) return Response.json({ error: "Бізнес не знайдено" }, { status: 404 });
  const store = row?.products_by_business && typeof row.products_by_business === "object" ? row.products_by_business : {};
  const ticket = code ? Object.values(store.terminalPairings || {}).find((item) => item.code === code && item.business === business && item.account === account) : undefined;
  return Response.json({ terminals: Array.isArray(store.terminalsByBusiness?.[business]) ? store.terminalsByBusiness[business] : [], pairing: ticket ? { used: ticket.used, expiresAt: ticket.expiresAt } : null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = clean(body.action, 24);
  const account = clean(body.account, 120).toLocaleLowerCase("uk-UA");
  const business = clean(body.business, 120);
  const found = await rows(); if (!found) return Response.json({ error: "Сховище недоступне" }, { status: 503 });  if (action === "catalog") {
    if (!serviceAllowed(request)) return Response.json({ error: "Недійсний службовий запит" }, { status: 403 });
    const terminalId = clean(body.terminalId, 80);
    if (!terminalId) return Response.json({ error: "Не вказано термінал" }, { status: 400 });
    for (const row of found.rows) {
      const store = row.products_by_business || {};
      for (const [businessName, terminals] of Object.entries(store.terminalsByBusiness || {})) {
        const terminal = Array.isArray(terminals) ? terminals.find((item) => item.id === terminalId && item.online) : undefined;
        if (!terminal) continue;
        const products = (Array.isArray(store.productsByBusiness?.[businessName]) ? store.productsByBusiness[businessName] : [])
          .map(catalogueProduct)
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .slice(0, 60);
        return Response.json({ terminal: { id: terminal.id, name: terminal.name, business: terminal.business }, products }, { headers: { "Cache-Control": "no-store" } });
      }
    }
    return Response.json({ error: "Термінал не знайдено або відключено" }, { status: 404 });
  }

  if (action === "activate") {
    if (!serviceAllowed(request)) return Response.json({ error: "Недійсний службовий запит" }, { status: 403 });
    const code = clean(body.code, 8);
    let owner: Row | undefined; let ticket: Ticket | undefined;
    for (const row of found.rows) { const entries = Object.values(row.products_by_business?.terminalPairings || {}); const matched = entries.find((item) => item.code === code); if (matched) { owner = row; ticket = matched; break; } }
    if (!owner || !ticket || ticket.used || new Date(ticket.expiresAt).getTime() <= Date.now()) return Response.json({ error: "Код не знайдено або його строк дії минув" }, { status: 400 });
    const terminal: Terminal = { id: `trm_${crypto.randomUUID().replaceAll("-", "")}`, name: ticket.name || "Термінал", location: ticket.location, business: ticket.business, assets: ["USDT", "GRAM"], online: true, createdAt: new Date().toISOString() };
    const store = owner.products_by_business || {}; const pairing = { ...(store.terminalPairings || {}) }; pairing[ticket.id] = { ...ticket, used: true };
    const terminals = { ...(store.terminalsByBusiness || {}) }; terminals[ticket.business] = [terminal, ...(Array.isArray(terminals[ticket.business]) ? terminals[ticket.business] : [])];
    const saved = await persist(found.connection, owner.account, { ...store, terminalPairings: pairing, terminalsByBusiness: terminals });
    return saved.ok ? Response.json({ terminal }) : Response.json({ error: "Не вдалося додати термінал" }, { status: 503 });
  }

  if (!account || !business) return Response.json({ error: "Не вказано бізнес" }, { status: 400 });
  const owner = found.rows.find((row) => row.account === account); if (!owner) return Response.json({ error: "Бізнес не знайдено" }, { status: 404 });
  const store = owner.products_by_business || {};

  if (action === "create") {
    const name = clean(body.name, 80) || "Термінал";
    const location = clean(body.location, 120);
    const activeCodes = new Set(found.rows.flatMap((row) => Object.values(row.products_by_business?.terminalPairings || {}).filter((item) => !item.used && new Date(item.expiresAt).getTime() > Date.now()).map((item) => item.code)));
    let code = ""; for (let attempt = 0; attempt < 16; attempt++) { const candidate = String(10_000_000 + secure() % 90_000_000); if (!activeCodes.has(candidate)) { code = candidate; break; } }
    if (!code) return Response.json({ error: "Не вдалося створити унікальний код" }, { status: 503 });
    const ticket: Ticket = { id: crypto.randomUUID(), code, account, business, name, location, expiresAt: new Date(Date.now() + TEN_MINUTES).toISOString(), used: false };
    const pairings = { ...(store.terminalPairings || {}), [ticket.id]: ticket };
    const saved = await persist(found.connection, account, { ...store, terminalPairings: pairings });
    return saved.ok ? Response.json({ code, expiresAt: ticket.expiresAt, ticketId: ticket.id }, { status: 201 }) : Response.json({ error: "Не вдалося зберегти код" }, { status: 503 });
  }

  if (action === "edit") {
    const id = clean(body.id, 80); const current = store.terminalsByBusiness?.[business] || [];
    const next = current.map((item) => item.id === id ? { ...item, name: clean(body.name, 80) || item.name, location: clean(body.location, 120), assets: Array.isArray(body.assets) && body.assets.includes("GRAM") ? ["USDT", "GRAM"] : ["USDT"] as Array<"USDT" | "GRAM"> } : item);
    if (next.length === current.length && !current.some((item) => item.id === id)) return Response.json({ error: "Термінал не знайдено" }, { status: 404 });
    const saved = await persist(found.connection, account, { ...store, terminalsByBusiness: { ...(store.terminalsByBusiness || {}), [business]: next } });
    return saved.ok ? Response.json({ terminals: next }) : Response.json({ error: "Не вдалося зберегти зміни" }, { status: 503 });
  }

  if (action === "delete") {
    const id = clean(body.id, 80);
    const current = store.terminalsByBusiness?.[business] || [];
    const next = current.filter((item) => item.id !== id);
    if (next.length === current.length) return Response.json({ error: "Термінал не знайдено" }, { status: 404 });
    const saved = await persist(found.connection, account, { ...store, terminalsByBusiness: { ...(store.terminalsByBusiness || {}), [business]: next } });
    return saved.ok ? Response.json({ terminals: next }) : Response.json({ error: "Не вдалося видалити термінал" }, { status: 503 });
  }
  return Response.json({ error: "Невідома дія" }, { status: 400 });
}
