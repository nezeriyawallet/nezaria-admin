import { verifyGoogleUser } from "../../owner/auth";

type Worker = { id: string; full_name: string; city: string; face_photo_path: string | null; status: string };
type Review = { id: string; client_name: string; rating: number; comment: string; created_at: string };

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = adminConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const workerResponse = await fetch(`${config.url}/rest/v1/worker_applications?user_id=eq.${encodeURIComponent(user.id)}&status=eq.approved&select=id,full_name,city,face_photo_path,status&limit=1`, { headers: headers(config) });
  const [worker] = workerResponse.ok ? await workerResponse.json() as Worker[] : [];
  if (!worker) return Response.json({ error: "Worker profile is unavailable" }, { status: 404 });
  const reviewsResponse = await fetch(`${config.url}/rest/v1/employee_reviews?employee_application_id=eq.${encodeURIComponent(worker.id)}&select=id,client_name,rating,comment,created_at&order=created_at.desc`, { headers: headers(config) });
  const reviews = reviewsResponse.ok ? await reviewsResponse.json() as Review[] : [];
  return Response.json({ profile: { ...worker, avatar_url: worker.face_photo_path ? await signedPhotoUrl(config, worker.face_photo_path) : null, reviews } });
}

function adminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}
function headers(config: { key: string }) { return { apikey: config.key, Authorization: `Bearer ${config.key}` }; }
async function signedPhotoUrl(config: { url: string; key: string }, path: string) {
  const response = await fetch(`${config.url}/storage/v1/object/sign/worker-documents/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "POST", headers: { ...headers(config), "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 300 }) });
  if (!response.ok) return null;
  const { signedURL } = await response.json() as { signedURL?: string };
  return signedURL ? `${config.url}/storage/v1${signedURL}` : null;
}
