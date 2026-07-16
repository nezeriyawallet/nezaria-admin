import { verifyGoogleUser } from "../owner/auth";

type Config = { url: string; key: string };
export async function GET(request: Request) {
  const user = await verifyGoogleUser(request); if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig(); if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const applicationResponse = await rest(config, `/media_applications?user_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);
  const [application] = applicationResponse.ok ? await applicationResponse.json() as Record<string, unknown>[] : [];
  const bannersResponse = await rest(config, "/media_banners?select=*&order=created_at.desc");
  const banners = bannersResponse.ok ? await bannersResponse.json() as Record<string, unknown>[] : [];
  return Response.json({ application: application || null, banners: await Promise.all(banners.map(async (banner) => ({ ...banner, image_url: await sign(config, String(banner.image_path)) }))) });
}
export async function POST(request: Request) {
  const user = await verifyGoogleUser(request); if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig(); if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const data = await request.formData();
  const full_name = String(data.get("full_name") || "").trim(), city = String(data.get("city") || "").trim(), phone = String(data.get("phone") || "").trim(), telegram_channel = String(data.get("telegram_channel") || "").trim(), portfolio_url = String(data.get("portfolio_url") || "").trim();
  const avatar = data.get("avatar");
  if (!full_name || !city || !phone || !portfolio_url || !/^@[A-Za-z0-9_]{5,}$/.test(telegram_channel) || !(avatar instanceof File) || !avatar.type.startsWith("image/")) return Response.json({ error: "Заповніть усі поля та вкажіть коректний @канал." }, { status: 400 });
  const extension = avatar.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const path = `applications/${user.id}/${crypto.randomUUID()}.${extension}`;
  const upload = await fetch(`${config.url}/storage/v1/object/media-assets/${path}`, { method: "POST", headers: { ...headers(config), "Content-Type": avatar.type, "x-upsert": "false" }, body: avatar });
  if (!upload.ok) return Response.json({ error: "Не вдалося завантажити фото." }, { status: 502 });
  const response = await rest(config, "/media_applications?on_conflict=user_id", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ user_id: user.id, full_name, city, phone, telegram_channel, portfolio_url, avatar_path: path, status: "pending", reviewed_at: null }) });
  return response.ok ? Response.json({ ok: true }) : Response.json({ error: "Не вдалося надіслати заявку." }, { status: 502 });
}
export async function DELETE(request: Request) {
  const user = await verifyGoogleUser(request); if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = getConfig(); if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const filter = `user_id=eq.${encodeURIComponent(user.id)}&status=eq.pending`;
  const current = await rest(config, `/media_applications?${filter}&select=avatar_path&limit=1`);
  const [application] = current.ok ? await current.json() as { avatar_path?: string }[] : [];
  if (!application) return Response.json({ error: "Заявку на розгляді не знайдено." }, { status: 404 });
  const removed = await rest(config, `/media_applications?${filter}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!removed.ok) return Response.json({ error: "Не вдалося відмінити заявку." }, { status: 502 });
  if (application.avatar_path) await fetch(`${config.url}/storage/v1/object/media-assets/${application.avatar_path.split("/").map(encodeURIComponent).join("/")}`, { method: "DELETE", headers: headers(config) });
  return Response.json({ ok: true });
}
function getConfig(): Config | null { const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; }
function headers(c: Config) { return { apikey: c.key, Authorization: `Bearer ${c.key}` }; }
function rest(c: Config, path: string, init: RequestInit = {}) { return fetch(`${c.url}/rest/v1${path}`, { ...init, headers: { ...headers(c), ...(init.headers || {}) } }); }
async function sign(c: Config, path: string) { const r = await fetch(`${c.url}/storage/v1/object/sign/media-assets/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "POST", headers: { ...headers(c), "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 3600 }) }); const j = r.ok ? await r.json() as { signedURL?: string } : {}; return j.signedURL ? `${c.url}/storage/v1${j.signedURL}` : null; }
