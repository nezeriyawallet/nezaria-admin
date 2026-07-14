import { verifyGoogleUser, verifyOwnerSession } from "../auth";

type Application = {
  id: string;
  full_name: string;
  city: string;
  age: number;
  phone: string;
  document_note: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const config = adminConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const response = await fetch(`${config.url}/rest/v1/worker_applications?select=id,full_name,city,age,phone,document_note,status,created_at&order=created_at.desc`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) return Response.json({ error: "Could not load applications" }, { status: 502 });

  const applications = await response.json() as Application[];
  const withPhotos = await Promise.all(applications.map(async (application) => ({
    ...application,
    photo_url: await signedPhotoUrl(config, application.document_note),
  })));
  return Response.json({ applications: withPhotos });
}

export async function PATCH(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = adminConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !["approved", "rejected"].includes(body.status)) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const response = await fetch(`${config.url}/rest/v1/worker_applications?id=eq.${encodeURIComponent(body.id)}&status=eq.pending`, {
    method: "PATCH",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ status: body.status }),
  });
  if (!response.ok) return Response.json({ error: "Could not update application" }, { status: 502 });
  const updated = await response.json();
  if (!updated.length) return Response.json({ error: "Application is no longer pending" }, { status: 409 });
  return Response.json({ application: updated[0] });
}

function adminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

async function signedPhotoUrl(config: { url: string; key: string }, path: string) {
  if (!path || path.includes("..")) return null;
  const response = await fetch(`${config.url}/storage/v1/object/sign/worker-documents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  });
  if (!response.ok) return null;
  const { signedURL } = await response.json() as { signedURL?: string };
  return signedURL ? `${config.url}/storage/v1${signedURL}` : null;
}
