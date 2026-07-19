import { verifyGoogleUser } from "../../owner/auth";

type Config = { url: string; key: string };

function config(): Config | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

function headers(c: Config) { return { apikey: c.key, Authorization: `Bearer ${c.key}` }; }

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  const c = config();
  if (!user || !c) return Response.json({ error: "Forbidden" }, { status: 403 });
  const response = await fetch(`${c.url}/rest/v1/worker_applications?user_id=eq.${encodeURIComponent(user.id)}&status=eq.approved&select=operator_status,active_chat_limit&limit=1`, { headers: headers(c) });
  const [worker] = response.ok ? await response.json() as { operator_status: string; active_chat_limit: number }[] : [];
  return worker ? Response.json(worker) : Response.json({ error: "Worker profile is unavailable" }, { status: 404 });
}

export async function PATCH(request: Request) {
  const user = await verifyGoogleUser(request);
  const c = config();
  const body = await request.json().catch(() => null) as { operator_status?: string } | null;
  if (!user || !c || !body || !["online", "break", "offline"].includes(body.operator_status || "")) return Response.json({ error: "Invalid operator status" }, { status: 400 });
  const response = await fetch(`${c.url}/rest/v1/worker_applications?user_id=eq.${encodeURIComponent(user.id)}&status=eq.approved`, { method: "PATCH", headers: { ...headers(c), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ operator_status: body.operator_status }) });
  return response.ok ? Response.json({ ok: true, operator_status: body.operator_status }) : Response.json({ error: "Could not update operator status" }, { status: 502 });
}
