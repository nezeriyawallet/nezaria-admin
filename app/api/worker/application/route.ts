import { verifyGoogleUser } from "../../owner/auth";

type ApplicationFiles = { document_note: string | null; face_photo_path: string | null };

export async function DELETE(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });

  const config = adminConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });

  const filter = `user_id=eq.${encodeURIComponent(user.id)}&status=eq.pending`;
  const current = await fetch(`${config.url}/rest/v1/worker_applications?${filter}&select=document_note,face_photo_path&limit=1`, { headers: headers(config) });
  const [application] = current.ok ? await current.json() as ApplicationFiles[] : [];
  if (!application) return Response.json({ error: "Заявку на розгляді не знайдено." }, { status: 404 });

  const removed = await fetch(`${config.url}/rest/v1/worker_applications?${filter}`, {
    method: "DELETE",
    headers: { ...headers(config), Prefer: "return=minimal" },
  });
  if (!removed.ok) return Response.json({ error: "Не вдалося відмінити заявку." }, { status: 502 });

  await Promise.all([application.document_note, application.face_photo_path].filter(Boolean).map((path) => fetch(
    `${config.url}/storage/v1/object/worker-documents/${path!.split("/").map(encodeURIComponent).join("/")}`,
    { method: "DELETE", headers: headers(config) },
  )));
  return Response.json({ ok: true });
}

function adminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}
function headers(config: { key: string }) { return { apikey: config.key, Authorization: `Bearer ${config.key}` }; }
