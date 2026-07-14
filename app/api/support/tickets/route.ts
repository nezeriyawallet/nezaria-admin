import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import bigInt from "big-integer";
import { verifyGoogleUser, verifyOwnerSession } from "../../owner/auth";

type Ticket = { id: string; telegram_peer_id: string; telegram_access_hash: string; client_name: string; client_username: string | null; status: string; assigned_to: string | null; rating: number | null; review: string | null; created_at: string; updated_at: string };
type Message = { id: string; ticket_id: string; telegram_message_id: number | null; sender_type: "client" | "agent" | "system"; body: string; sent_at: string };
type Config = { url: string; key: string };

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await authorize(request);
  if (!access) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = configForServer();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  if (new URL(request.url).searchParams.get("sync") === "1") await syncTelegram(config);
  return Response.json(await listTickets(config));
}

export async function POST(request: Request) {
  const access = await authorize(request);
  if (!access) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = configForServer();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const body = await request.json().catch(() => null) as { action?: string; ticketId?: string; message?: string } | null;
  if (!body?.ticketId || !body.action) return Response.json({ error: "Invalid request" }, { status: 400 });
  const ticket = await ticketById(config, body.ticketId);
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  if (body.action === "take") {
    if (ticket.status !== "new") return Response.json({ error: "Ticket is already taken" }, { status: 409 });
    await patch(config, "support_tickets", `id=eq.${ticket.id}`, { status: "in_progress", assigned_to: access.userId, assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return Response.json({ ok: true });
  }
  if (!access.owner && ticket.assigned_to !== access.userId) return Response.json({ error: "This ticket is assigned to another agent" }, { status: 403 });
  if (body.action === "send") {
    const message = body.message?.trim();
    if (!message || message.length > 4000) return Response.json({ error: "Message is invalid" }, { status: 400 });
    const telegramMessageId = await sendTelegram(ticket, message);
    await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: telegramMessageId, sender_type: "agent", body: message });
    await patch(config, "support_tickets", `id=eq.${ticket.id}`, { updated_at: new Date().toISOString() });
    return Response.json({ ok: true });
  }
  if (body.action === "close") {
    const text = "Діалог підтримки закрито. Оцініть роботу підтримки цифрою від 1 до 5. Після оцінки можете надіслати короткий відгук.";
    const telegramMessageId = await sendTelegram(ticket, text);
    await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: telegramMessageId, sender_type: "system", body: text });
    await patch(config, "support_tickets", `id=eq.${ticket.id}`, { status: "awaiting_rating", updated_at: new Date().toISOString() });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}

async function authorize(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user) return null;
  if (await verifyOwnerSession(request, user.id)) return { userId: user.id, owner: true };
  const config = configForServer();
  if (!config) return null;
  const response = await rest(config, `/worker_applications?user_id=eq.${encodeURIComponent(user.id)}&status=eq.approved&select=id&limit=1`);
  const rows = response.ok ? await response.json() as { id: string }[] : [];
  return rows.length ? { userId: user.id, owner: false } : null;
}

function configForServer(): Config | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}
function headers(config: Config, extra: Record<string, string> = {}) { return { apikey: config.key, Authorization: `Bearer ${config.key}`, ...extra }; }
function rest(config: Config, path: string, init: RequestInit = {}) { return fetch(`${config.url}/rest/v1${path}`, { ...init, headers: { ...headers(config), ...(init.headers || {}) } }); }
async function patch(config: Config, table: string, filter: string, data: Record<string, unknown>) { await rest(config, `/${table}?${filter}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(data) }); }
async function insertMessage(config: Config, data: Omit<Message, "id" | "sent_at">) { await rest(config, "/support_messages?on_conflict=ticket_id,telegram_message_id", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(data) }); }
async function ticketById(config: Config, id: string) { const response = await rest(config, `/support_tickets?id=eq.${encodeURIComponent(id)}&select=*&limit=1`); return response.ok ? (await response.json() as Ticket[])[0] || null : null; }

async function listTickets(config: Config) {
  const ticketsResponse = await rest(config, "/support_tickets?select=*&order=updated_at.desc");
  const messagesResponse = await rest(config, "/support_messages?select=*&order=sent_at.asc");
  const tickets = ticketsResponse.ok ? await ticketsResponse.json() as Ticket[] : [];
  const messages = messagesResponse.ok ? await messagesResponse.json() as Message[] : [];
  return { tickets: tickets.map((ticket) => ({ ...ticket, messages: messages.filter((message) => message.ticket_id === ticket.id) })) };
}

async function telegramClient() {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const session = process.env.TELEGRAM_SESSION_STRING;
  if (!Number.isInteger(apiId) || !apiHash || !session) return null;
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 3 });
  await client.connect();
  return client;
}
async function sendTelegram(ticket: Ticket, text: string) {
  const client = await telegramClient();
  if (!client) throw new Error("Telegram account is not configured");
  try {
    const result = await client.sendMessage(new Api.InputPeerUser({ userId: bigInt(ticket.telegram_peer_id), accessHash: bigInt(ticket.telegram_access_hash) }), { message: text });
    return result.id;
  } finally { await client.disconnect(); }
}

async function syncTelegram(config: Config) {
  const client = await telegramClient();
  if (!client) return;
  try {
    const dialogs = await client.getDialogs({ limit: 60 });
    for (const dialog of dialogs) {
      const entity = dialog.entity as Api.User;
      if (!entity || entity.className !== "User" || entity.bot || !entity.accessHash) continue;
      const peerId = entity.id.toString();
      const clientName = [entity.firstName, entity.lastName].filter(Boolean).join(" ") || entity.username || "Клієнт";
      const ticketResponse = await rest(config, "/support_tickets?on_conflict=telegram_peer_id", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ telegram_peer_id: peerId, telegram_access_hash: entity.accessHash.toString(), client_name: clientName, client_username: entity.username || null, updated_at: new Date().toISOString() }) });
      if (!ticketResponse.ok) continue;
      const [ticket] = await ticketResponse.json() as Ticket[];
      if (!ticket) continue;
      const messages = await client.getMessages(entity, { limit: 30 });
      for (const message of messages) {
        if (message.out || !message.message?.trim()) continue;
        const text = message.message.trim();
        await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: message.id, sender_type: "client", body: text });
        await handleFeedback(config, ticket, text);
      }
    }
  } finally { await client.disconnect(); }
}

async function handleFeedback(config: Config, ticket: Ticket, text: string) {
  if (ticket.status !== "awaiting_rating") return;
  if (!ticket.rating && /^[1-5]$/.test(text)) {
    await patch(config, "support_tickets", `id=eq.${ticket.id}`, { rating: Number(text), updated_at: new Date().toISOString() });
    await sendTelegram(ticket, "Дякуємо за оцінку. За бажанням надішліть короткий відгук одним повідомленням.");
    return;
  }
  if (ticket.rating && text.length <= 2000) {
    await patch(config, "support_tickets", `id=eq.${ticket.id}`, { status: "closed", review: text, updated_at: new Date().toISOString() });
    if (ticket.assigned_to) {
      const employeeResponse = await rest(config, `/worker_applications?user_id=eq.${encodeURIComponent(ticket.assigned_to)}&status=eq.approved&select=id&limit=1`);
      const [employee] = employeeResponse.ok ? await employeeResponse.json() as { id: string }[] : [];
      if (employee) await rest(config, "/employee_reviews", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ employee_application_id: employee.id, client_name: ticket.client_name, rating: ticket.rating, comment: text }) });
    }
  }
}
