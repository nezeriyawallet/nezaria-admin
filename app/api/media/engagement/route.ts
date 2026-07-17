import { verifyGoogleUser } from "../../owner/auth";

type Config = { url: string; key: string };

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const application = await getApplication(config, user.id);
  if (!application) return Response.json({ clicks: 0, reviews: [], average_rating: null });
  const [clicksResponse, reviewsResponse] = await Promise.all([
    rest(config, `/media_banner_clicks?media_application_id=eq.${encodeURIComponent(application.id)}&select=id`),
    rest(config, `/media_reviews?media_application_id=eq.${encodeURIComponent(application.id)}&select=*&order=created_at.desc`),
  ]);
  const clicks = clicksResponse.ok ? (await clicksResponse.json() as unknown[]).length : 0;
  const reviews = reviewsResponse.ok ? await reviewsResponse.json() as { rating: number }[] : [];
  const average_rating = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : null;
  return Response.json({ clicks, reviews, average_rating });
}

export async function POST(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.banner_id !== "string") return Response.json({ error: "Некоректний банер." }, { status: 400 });
  const application = await getApplication(config, user.id);
  if (!application || application.status !== "approved") return Response.json({ error: "Кабінет медійки ще не активовано." }, { status: 403 });
  const bannerResponse = await rest(config, `/media_banners?id=eq.${encodeURIComponent(body.banner_id)}&select=id&limit=1`);
  const banners = bannerResponse.ok ? await bannerResponse.json() as { id: string }[] : [];
  if (!banners.length) return Response.json({ error: "Банер не знайдено." }, { status: 404 });
  const response = await rest(config, "/media_banner_clicks", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ media_application_id: application.id, banner_id: body.banner_id }) });
  return response.ok ? Response.json({ ok: true }) : Response.json({ error: "Не вдалося зафіксувати перехід." }, { status: 502 });
}

async function getApplication(config: Config, userId: string) { const response = await rest(config, `/media_applications?user_id=eq.${encodeURIComponent(userId)}&select=id,status&limit=1`); const [application] = response.ok ? await response.json() as { id: string; status: string }[] : []; return application || null; }
function getConfig(): Config | null { const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; }
function headers(config: Config) { return { apikey: config.key, Authorization: `Bearer ${config.key}` }; }
function rest(config: Config, path: string, init: RequestInit = {}) { return fetch(`${config.url}/rest/v1${path}`, { ...init, headers: { ...headers(config), ...(init.headers || {}) } }); }
