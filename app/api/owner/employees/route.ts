import { verifyGoogleUser, verifyOwnerSession } from "../auth";

type Employee = {
  id: string;
  user_id: string;
  full_name: string;
  city: string;
  age: number;
  phone: string;
  ton_usdt_wallet: string | null;
  document_note: string;
  face_photo_path: string | null;
  status: "approved" | "frozen";
  last_active_at: string | null;
  created_at: string;
  can_use_chats: boolean;
  can_view_reviews: boolean;
  can_view_ratings: boolean;
  can_view_salary: boolean;
  can_view_statistics: boolean;
  operator_status: "online" | "break" | "offline";
  active_chat_limit: number;
};

type Review = {
  id: string;
  employee_application_id: string;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
};
type ActivityEvent = { user_id: string; occurred_at: string };
type Payout = { id: string; worker_application_id: string; amount: number; currency: "USDT"; status: "pending" | "paid"; note: string | null; created_at: string; paid_at: string | null };
type SupportTicket = { id: string; assigned_to: string | null; status: string; created_at: string };
type SupportMessage = { ticket_id: string; sender_type: "client" | "agent" | "system"; sent_at: string };

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const config = adminConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });

  const employeesResponse = await fetch(`${config.url}/rest/v1/worker_applications?status=in.(approved,frozen)&select=id,user_id,full_name,city,age,phone,ton_usdt_wallet,document_note,face_photo_path,last_active_at,created_at,status,can_use_chats,can_view_reviews,can_view_ratings,can_view_salary,can_view_statistics,operator_status,active_chat_limit&order=created_at.desc`, {
    headers: headers(config),
  });
  if (!employeesResponse.ok) return Response.json({ error: "Could not load employees" }, { status: 502 });

  const employees = await employeesResponse.json() as Employee[];
  const reviewsResponse = await fetch(`${config.url}/rest/v1/employee_reviews?select=id,employee_application_id,client_name,rating,comment,created_at&order=created_at.desc`, {
    headers: headers(config),
  });
  const reviews = reviewsResponse.ok ? await reviewsResponse.json() as Review[] : [];
  const payoutsResponse = await fetch(`${config.url}/rest/v1/worker_payouts?select=id,worker_application_id,amount,currency,status,note,created_at,paid_at&order=created_at.desc`, { headers: headers(config) });
  const payouts = payoutsResponse.ok ? await payoutsResponse.json() as Payout[] : [];
  const ticketsResponse = await fetch(`${config.url}/rest/v1/support_tickets?select=id,assigned_to,status,created_at`, { headers: headers(config) });
  const tickets = ticketsResponse.ok ? await ticketsResponse.json() as SupportTicket[] : [];
  const closedTickets = tickets.filter((ticket) => ticket.status === "awaiting_rating" || ticket.status === "closed");
  const messagesResponse = await fetch(`${config.url}/rest/v1/support_messages?select=ticket_id,sender_type,sent_at&order=sent_at.asc`, { headers: headers(config) });
  const messages = messagesResponse.ok ? await messagesResponse.json() as SupportMessage[] : [];
  const since = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  const activityResponse = await fetch(`${config.url}/rest/v1/worker_activity_events?occurred_at=gte.${encodeURIComponent(since)}&select=user_id,occurred_at`, { headers: headers(config) });
  const activity = activityResponse.ok ? await activityResponse.json() as ActivityEvent[] : [];
  const monthHours = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.now() - (29 - index) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const total = employees.reduce((sum, employee) => sum + new Set(activity.filter((event) => event.user_id === employee.user_id && event.occurred_at.slice(0, 10) === date).map((event) => event.occurred_at.slice(0, 13))).size, 0);
    return Math.round(total / Math.max(1, employees.length) * 10) / 10;
  });
  const withDetails = await Promise.all(employees.map(async (employee) => ({
    ...employee,
    avatar_url: employee.face_photo_path ? await signedPhotoUrl(config, employee.face_photo_path) : null,
    reviews: reviews.filter((review) => review.employee_application_id === employee.id),
    payouts: payouts.filter((payout) => payout.worker_application_id === employee.id),
    closed_chats: closedTickets.filter((ticket) => ticket.assigned_to === employee.user_id).length,
    first_response_minutes: (() => {
      const values = tickets.filter((ticket) => ticket.assigned_to === employee.user_id).map((ticket) => {
        const ticketMessages = messages.filter((message) => message.ticket_id === ticket.id);
        const client = ticketMessages.find((message) => message.sender_type === "client");
        const agent = ticketMessages.find((message) => message.sender_type === "agent");
        return client && agent ? Math.max(0, (new Date(agent.sent_at).getTime() - new Date(client.sent_at).getTime()) / 60000) : null;
      }).filter((value): value is number => value !== null);
      return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
    })(),
    daily_activity: Array.from({ length: 30 }, (_, index) => {
      const date = new Date(Date.now() - (29 - index) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return new Set(activity.filter((event) => event.user_id === employee.user_id && event.occurred_at.slice(0, 10) === date).map((event) => event.occurred_at.slice(0, 13))).size;
    }),
  })));

  return Response.json({ employees: withDetails, month_hours: monthHours });
}

export async function PATCH(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = adminConfig();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") return Response.json({ error: "Invalid request" }, { status: 400 });
  if (body.action === "update_permissions") {
    if (typeof body.id !== "string" || !body.permissions || typeof body.permissions !== "object") return Response.json({ error: "Invalid permissions" }, { status: 400 });
    const source = body.permissions as Record<string, unknown>;
    const fields = ["can_use_chats", "can_view_reviews", "can_view_ratings", "can_view_salary", "can_view_statistics"];
    const permissions: Record<string, boolean> = {};
    for (const field of fields) {
      if (typeof source[field] !== "boolean") return Response.json({ error: "All permissions must be specified" }, { status: 400 });
      permissions[field] = source[field] as boolean;
    }
    const response = await fetch(`${config.url}/rest/v1/worker_applications?id=eq.${encodeURIComponent(body.id)}`, {
      method: "PATCH",
      headers: { ...headers(config), "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(permissions),
    });
    const updated = response.ok ? await response.json() as Employee[] : [];
    return updated.length ? Response.json({ ok: true, permissions }) : Response.json({ error: "Could not update permissions" }, { status: 502 });
  }
  if (body.action === "update_operator_settings") {
    if (typeof body.id !== "string" || !["online", "break", "offline"].includes(body.operator_status) || !Number.isInteger(body.active_chat_limit) || body.active_chat_limit < 1 || body.active_chat_limit > 50) return Response.json({ error: "Invalid operator settings" }, { status: 400 });
    const response = await fetch(`${config.url}/rest/v1/worker_applications?id=eq.${encodeURIComponent(body.id)}`, {
      method: "PATCH",
      headers: { ...headers(config), "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ operator_status: body.operator_status, active_chat_limit: body.active_chat_limit }),
    });
    const updated = response.ok ? await response.json() as Employee[] : [];
    return updated.length ? Response.json({ ok: true, operator_status: body.operator_status, active_chat_limit: body.active_chat_limit }) : Response.json({ error: "Could not update operator settings" }, { status: 502 });
  }
  if (body.action === "create_payout") {
    if (typeof body.id !== "string" || typeof body.amount !== "number" || body.amount <= 0 || body.amount > 1000000) return Response.json({ error: "Invalid payout" }, { status: 400 });
    const employeeResponse = await fetch(`${config.url}/rest/v1/worker_applications?id=eq.${encodeURIComponent(body.id)}&status=eq.approved&select=id&limit=1`, { headers: headers(config) });
    const employee = employeeResponse.ok ? await employeeResponse.json() as { id: string }[] : [];
    if (!employee.length) return Response.json({ error: "Employee is unavailable" }, { status: 404 });
    const status = body.status === "paid" ? "paid" : "pending";
    const response = await fetch(`${config.url}/rest/v1/worker_payouts`, { method: "POST", headers: { ...headers(config), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ worker_application_id: body.id, amount: Math.round(body.amount * 100) / 100, status, note: typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null, created_by: user.id, paid_at: status === "paid" ? new Date().toISOString() : null }) });
    const payout = response.ok ? await response.json() as Payout[] : [];
    return payout.length ? Response.json({ ok: true, payout: payout[0] }) : Response.json({ error: "Could not create payout" }, { status: 502 });
  }
  if (body.action === "mark_payout_paid") {
    if (typeof body.payout_id !== "string") return Response.json({ error: "Invalid payout" }, { status: 400 });
    const response = await fetch(`${config.url}/rest/v1/worker_payouts?id=eq.${encodeURIComponent(body.payout_id)}&status=eq.pending`, { method: "PATCH", headers: { ...headers(config), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ status: "paid", paid_at: new Date().toISOString() }) });
    const payout = response.ok ? await response.json() as Payout[] : [];
    return payout.length ? Response.json({ ok: true, payout: payout[0] }) : Response.json({ error: "Could not update payout" }, { status: 502 });
  }
  if (body.action === "delete_payout") {
    if (typeof body.payout_id !== "string") return Response.json({ error: "Invalid payout" }, { status: 400 });
    const response = await fetch(`${config.url}/rest/v1/worker_payouts?id=eq.${encodeURIComponent(body.payout_id)}`, { method: "DELETE", headers: { ...headers(config), Prefer: "return=representation" } });
    const payout = response.ok ? await response.json() as Payout[] : [];
    return payout.length ? Response.json({ ok: true, payout: payout[0] }) : Response.json({ error: "Could not delete payout" }, { status: 502 });
  }
  if (typeof body.id !== "string" || !["terminate", "freeze", "unfreeze"].includes(body.action)) return Response.json({ error: "Invalid request" }, { status: 400 });

  const status = body.action === "terminate" ? "terminated" : body.action === "freeze" ? "frozen" : "approved";
  const expectedStatus = body.action === "unfreeze" ? "frozen" : "approved";

  const response = await fetch(`${config.url}/rest/v1/worker_applications?id=eq.${encodeURIComponent(body.id)}&status=eq.${expectedStatus}`, {
    method: "PATCH",
    headers: { ...headers(config), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ status, reviewed_at: new Date().toISOString() }),
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
