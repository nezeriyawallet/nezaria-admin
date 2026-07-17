import { verifyGoogleUser, verifyOwnerSession } from "../../auth";

type Config = { url: string; key: string };
type Application = { id: string; full_name: string; status: string };
type Click = { media_application_id: string };
type Payout = { media_application_id: string; amount: number; status: "pending" | "paid" };
type Review = { media_application_id: string; rating: number };

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const [applicationsResponse, bannersResponse, clicksResponse, payoutsResponse, reviewsResponse] = await Promise.all([
    rest(config, "/media_applications?status=eq.approved&select=id,full_name"),
    rest(config, "/media_banners?select=id"),
    rest(config, "/media_banner_clicks?select=media_application_id"),
    rest(config, "/media_payouts?select=media_application_id,amount,status"),
    rest(config, "/media_reviews?select=media_application_id,rating"),
  ]);
  const applications = applicationsResponse.ok ? await applicationsResponse.json() as Application[] : [];
  const banners = bannersResponse.ok ? await bannersResponse.json() as unknown[] : [];
  const clicks = clicksResponse.ok ? await clicksResponse.json() as Click[] : [];
  const payouts = payoutsResponse.ok ? await payoutsResponse.json() as Payout[] : [];
  const reviews = reviewsResponse.ok ? await reviewsResponse.json() as Review[] : [];
  const statistics = applications.map((application) => {
    const ownClicks = clicks.filter((click) => click.media_application_id === application.id).length;
    const ownPayouts = payouts.filter((payout) => payout.media_application_id === application.id);
    const ownReviews = reviews.filter((review) => review.media_application_id === application.id);
    return { id: application.id, full_name: application.full_name, banners: banners.length, clicks: ownClicks, paid: ownPayouts.filter((payout) => payout.status === "paid").reduce((sum, payout) => sum + Number(payout.amount), 0), pending: ownPayouts.filter((payout) => payout.status === "pending").reduce((sum, payout) => sum + Number(payout.amount), 0), reviews: ownReviews.length, average_rating: ownReviews.length ? ownReviews.reduce((sum, review) => sum + Number(review.rating), 0) / ownReviews.length : null };
  });
  return Response.json({ statistics });
}

export async function POST(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.media_application_id !== "string" || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 || typeof body.comment !== "string" || !body.comment.trim()) return Response.json({ error: "Заповніть оцінку та відгук." }, { status: 400 });
  const response = await rest(config, "/media_reviews", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ media_application_id: body.media_application_id, rating: body.rating, comment: body.comment.trim().slice(0, 1000), author_name: typeof body.author_name === "string" && body.author_name.trim() ? body.author_name.trim().slice(0, 100) : "Клієнт" }) });
  return response.ok ? Response.json({ ok: true }) : Response.json({ error: "Не вдалося додати відгук." }, { status: 502 });
}

function getConfig(): Config | null { const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; }
function headers(config: Config) { return { apikey: config.key, Authorization: `Bearer ${config.key}` }; }
function rest(config: Config, path: string, init: RequestInit = {}) { return fetch(`${config.url}/rest/v1${path}`, { ...init, headers: { ...headers(config), ...(init.headers || {}) } }); }
