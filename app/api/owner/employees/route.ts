import { verifyGoogleUser, verifyOwnerSession } from "../auth";

type Employee = {
  id: string;
  full_name: string;
  city: string;
  age: number;
  phone: string;
  document_note: string;
  face_photo_path: string | null;
  last_active_at: string | null;
  created_at: string;
};

type Review = {
  id: string;
  employee_application_id: string;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const config = adminConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });

  const employeesResponse = await fetch(`${config.url}/rest/v1/worker_applications?status=eq.approved&select=id,full_name,city,age,phone,document_note,face_photo_path,last_active_at,created_at&order=created_at.desc`, {
    headers: headers(config),
  });
  if (!employeesResponse.ok) return Response.json({ error: "Could not load employees" }, { status: 502 });

  const employees = await employeesResponse.json() as Employee[];
  const reviewsResponse = await fetch(`${config.url}/rest/v1/employee_reviews?select=id,employee_application_id,client_name,rating,comment,created_at&order=created_at.desc`, {
    headers: headers(config),
  });
  const reviews = reviewsResponse.ok ? await reviewsResponse.json() as Review[] : [];
  const withDetails = await Promise.all(employees.map(async (employee) => ({
    ...employee,
    avatar_url: employee.face_photo_path ? await signedPhotoUrl(config, employee.face_photo_path) : null,
    reviews: reviews.filter((review) => review.employee_application_id === employee.id),
  })));

  return Response.json({ employees: withDetails });
}

export async function PATCH(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = adminConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || body.action !== "terminate") return Response.json({ error: "Invalid request" }, { status: 400 });

  const response = await fetch(`${config.url}/rest/v1/worker_applications?id=eq.${encodeURIComponent(body.id)}&status=eq.approved`, {
    method: "PATCH",
    headers: { ...headers(config), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ status: "terminated", reviewed_at: new Date().toISOString() }),
  });
  if (!response.ok) return Response.json({ error: "Could not terminate employee" }, { status: 502 });
  const updated = await response.json() as Employee[];
  if (!updated.length) return Response.json({ error: "Employee is no longer active" }, { status: 409 });
  return Response.json({ ok: true });
}

function adminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

function headers(config: { key: string }) {
  return { apikey: config.key, Authorization: `Bearer ${config.key}` };
}

async function signedPhotoUrl(config: { url: string; key: string }, path: string) {
  if (!path || path.includes("..")) return null;
  const response = await fetch(`${config.url}/storage/v1/object/sign/worker-documents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { ...headers(config), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  });
  if (!response.ok) return null;
  const { signedURL } = await response.json() as { signedURL?: string };
  return signedURL ? `${config.url}/storage/v1${signedURL}` : null;
}
