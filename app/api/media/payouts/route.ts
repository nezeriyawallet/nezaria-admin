import { verifyGoogleUser } from "../../owner/auth";

type Config = { url: string; key: string };

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const applicationResponse = await rest(config, `/media_applications?user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`);
  const [application] = applicationResponse.ok ? await applicationResponse.json() as { id: string }[] : [];
  if (!application) return Response.json({ payouts: [] });
  const payoutsResponse = await rest(config, `/media_payouts?media_application_id=eq.${encodeURIComponent(application.id)}&select=*&order=created_at.desc`);
  return Response.json({ payouts: payoutsResponse.ok ? await payoutsResponse.json() : [] });
}

function getConfig(): Config | null { const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; }
function headers(config: Config) { return { apikey: config.key, Authorization: `Bearer ${config.key}` }; }
function rest(config: Config, path: string, init: RequestInit = {}) { return fetch(`${config.url}/rest/v1${path}`, { ...init, headers: { ...headers(config), ...(init.headers || {}) } }); }
