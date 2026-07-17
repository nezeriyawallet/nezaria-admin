import { verifyGoogleUser, verifyOwnerSession } from "../../auth";

type Config = { url: string; key: string };

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const response = await rest(config, "/media_payouts?select=*&order=created_at.desc");
  return Response.json({ payouts: response.ok ? await response.json() : [] });
}

export async function POST(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.media_application_id !== "string" || typeof body.amount !== "number" || body.amount <= 0 || body.amount > 1000000) return Response.json({ error: "Некоректна виплата." }, { status: 400 });
  const applicationResponse = await rest(config, `/media_applications?id=eq.${encodeURIComponent(body.media_application_id)}&status=eq.approved&select=id&limit=1`);
  const applications = applicationResponse.ok ? await applicationResponse.json() as { id: string }[] : [];
  if (!applications.length) return Response.json({ error: "Оберіть прийняту медійку." }, { status: 400 });
  const status = body.status === "paid" ? "paid" : "pending";
  const response = await rest(config, "/media_payouts", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ media_application_id: body.media_application_id, amount: Math.round(body.amount * 100) / 100, status, note: typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null, paid_at: status === "paid" ? new Date().toISOString() : null }) });
  const [payout] = response.ok ? await response.json() as Record<string, unknown>[] : [];
  return payout ? Response.json({ payout }) : Response.json({ error: "Не вдалося створити виплату." }, { status: 502 });
}

export async function PATCH(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string") return Response.json({ error: "Некоректна виплата." }, { status: 400 });
  const response = await rest(config, `/media_payouts?id=eq.${encodeURIComponent(body.id)}&status=eq.pending`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ status: "paid", paid_at: new Date().toISOString() }) });
  const [payout] = response.ok ? await response.json() as Record<string, unknown>[] : [];
  return payout ? Response.json({ payout }) : Response.json({ error: "Не вдалося оновити виплату." }, { status: 502 });
}

function getConfig(): Config | null { const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; }
function headers(config: Config) { return { apikey: config.key, Authorization: `Bearer ${config.key}` }; }
function rest(config: Config, path: string, init: RequestInit = {}) { return fetch(`${config.url}/rest/v1${path}`, { ...init, headers: { ...headers(config), ...(init.headers || {}) } }); }
