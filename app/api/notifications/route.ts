import { verifyGoogleUser, verifyOwnerSession } from "../owner/auth";

type Config = { url: string; key: string };
type Notification = { id: string; title: string; text: string; created_at: string; tone: "mint" | "gold" | "violet" };

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const role = new URL(request.url).searchParams.get("role");
  const config = getConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  if (role === "owner") {
    if (!(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
    const [workers, media, tickets] = await Promise.all([
      rest(config, "/worker_applications?status=eq.pending&select=id,full_name,created_at&order=created_at.desc&limit=12"),
      rest(config, "/media_applications?status=eq.pending&select=id,full_name,created_at&order=created_at.desc&limit=12"),
      rest(config, "/support_tickets?status=eq.new&select=id,client_name,updated_at&order=updated_at.desc&limit=12"),
    ]);
    const notifications: Notification[] = [];
    if (workers.ok) (await workers.json() as { id: string; full_name: string; created_at: string }[]).forEach((item) => notifications.push({ id: `worker-${item.id}`, title: "Нова заявка працівника", text: item.full_name, created_at: item.created_at, tone: "mint" }));
    if (media.ok) (await media.json() as { id: string; full_name: string; created_at: string }[]).forEach((item) => notifications.push({ id: `media-${item.id}`, title: "Нова заявка медійки", text: item.full_name, created_at: item.created_at, tone: "violet" }));
    if (tickets.ok) (await tickets.json() as { id: string; client_name: string; updated_at: string }[]).forEach((item) => notifications.push({ id: `ticket-${item.id}`, title: "Нове звернення в підтримку", text: item.client_name, created_at: item.updated_at, tone: "gold" }));
    return Response.json({ notifications: notifications.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 20) });
  }
  if (role === "worker") return Response.json({ notifications: await workerNotifications(config, user.id) });
  if (role === "media") return Response.json({ notifications: await mediaNotifications(config, user.id) });
  return Response.json({ error: "Некоректна роль." }, { status: 400 });
}

async function workerNotifications(config: Config, userId: string) {
  const applicationResponse = await rest(config, `/worker_applications?user_id=eq.${encodeURIComponent(userId)}&select=id,status,reviewed_at,created_at&limit=1`);
  const [application] = applicationResponse.ok ? await applicationResponse.json() as { id: string; status: string; reviewed_at: string | null; created_at: string }[] : [];
  if (!application) return [];
  const [payouts, reviews] = await Promise.all([rest(config, `/worker_payouts?worker_application_id=eq.${application.id}&select=id,amount,status,created_at&order=created_at.desc&limit=10`), rest(config, `/employee_reviews?employee_application_id=eq.${application.id}&select=id,client_name,created_at&order=created_at.desc&limit=10`)]);
  const items: Notification[] = [{ id: `application-${application.id}-${application.status}`, title: application.status === "approved" ? "Заявку прийнято" : application.status === "rejected" ? "Заявку відхилено" : "Заявка на розгляді", text: "Статус вашої заявки оновлено.", created_at: application.reviewed_at || application.created_at, tone: application.status === "approved" ? "mint" : "gold" }];
  if (payouts.ok) (await payouts.json() as { id: string; amount: number; status: string; created_at: string }[]).forEach((item) => items.push({ id: `payout-${item.id}`, title: item.status === "paid" ? "Виплату здійснено" : "Нове нарахування", text: `${Number(item.amount).toFixed(2)} USDT`, created_at: item.created_at, tone: "mint" }));
  if (reviews.ok) (await reviews.json() as { id: string; client_name: string; created_at: string }[]).forEach((item) => items.push({ id: `review-${item.id}`, title: "Новий відгук клієнта", text: item.client_name, created_at: item.created_at, tone: "violet" }));
  return items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 20);
}

async function mediaNotifications(config: Config, userId: string) {
  const applicationResponse = await rest(config, `/media_applications?user_id=eq.${encodeURIComponent(userId)}&select=id,status,reviewed_at,created_at&limit=1`);
  const [application] = applicationResponse.ok ? await applicationResponse.json() as { id: string; status: string; reviewed_at: string | null; created_at: string }[] : [];
  if (!application) return [];
  const [payouts, reviews] = await Promise.all([rest(config, `/media_payouts?media_application_id=eq.${application.id}&select=id,amount,status,created_at&order=created_at.desc&limit=10`), rest(config, `/media_reviews?media_application_id=eq.${application.id}&select=id,author_name,created_at&order=created_at.desc&limit=10`)]);
  const items: Notification[] = [{ id: `application-${application.id}-${application.status}`, title: application.status === "approved" ? "Заявку прийнято" : application.status === "rejected" ? "Заявку відхилено" : "Заявка на розгляді", text: "Статус вашої заявки оновлено.", created_at: application.reviewed_at || application.created_at, tone: application.status === "approved" ? "mint" : "gold" }];
  if (payouts.ok) (await payouts.json() as { id: string; amount: number; status: string; created_at: string }[]).forEach((item) => items.push({ id: `payout-${item.id}`, title: item.status === "paid" ? "Виплату здійснено" : "Нове нарахування", text: `${Number(item.amount).toFixed(2)} USDT`, created_at: item.created_at, tone: "mint" }));
  if (reviews.ok) (await reviews.json() as { id: string; author_name: string; created_at: string }[]).forEach((item) => items.push({ id: `review-${item.id}`, title: "Новий відгук", text: item.author_name, created_at: item.created_at, tone: "violet" }));
  return items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 20);
}

function getConfig(): Config | null { const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; }
function headers(config: Config) { return { apikey: config.key, Authorization: `Bearer ${config.key}` }; }
function rest(config: Config, path: string) { return fetch(`${config.url}/rest/v1${path}`, { headers: headers(config) }); }
