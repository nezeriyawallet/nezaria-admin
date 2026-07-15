import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import bigInt from "big-integer";
import { verifyGoogleUser, verifyOwnerSession } from "../../owner/auth";

type Ticket = { id: string; telegram_peer_id: string; telegram_access_hash: string; client_name: string; client_username: string | null; status: string; assigned_to: string | null; rating: number | null; review: string | null; created_at: string; updated_at: string };
type Message = { id: string; ticket_id: string; telegram_message_id: number | null; sender_type: "client" | "agent" | "system"; body: string; sent_at: string };
type Config = { url: string; key: string };

export const runtime = "nodejs";

let cachedTelegramClient: TelegramClient | null = null;
let connectingTelegramClient: Promise<TelegramClient | null> | null = null;

export async function GET(request: Request) {
  const access = await authorize(request);
  if (!access) return Response.json({ error: "Forbidden" }, { status: 403 });
  const config = configForServer();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  if (new URL(request.url).searchParams.get("sync") === "1") await syncTelegram(config);
  return Response.json(await listTickets(config, access.userId, access.owner));
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

  if (body.action === "skip") {
    if (ticket.status !== "new") return Response.json({ error: "Only new tickets can be hidden" }, { status: 409 });
    await rest(config, "/support_ticket_skips?on_conflict=ticket_id,user_id", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ ticket_id: ticket.id, user_id: access.userId }) });
    return Response.json({ ok: true });
  }
  if (body.action === "take") {
    if (ticket.status !== "new") return Response.json({ error: "Ticket is already taken" }, { status: 409 });
    const greeting = "Вітаємо вас у технічній підтримці Nezeriya Wallet";
    const telegramMessageId = await sendTelegram(ticket, greeting);
    await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: telegramMessageId, sender_type: "agent", body: greeting });
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
async function insertMessage(config: Config, data: Omit<Message, "id" | "sent_at">) {
  const response = await rest(config, "/support_messages?on_conflict=ticket_id,telegram_message_id", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(data) });
  return response.ok && (await response.json().catch(() => []) as unknown[]).length > 0;
}
async function ticketById(config: Config, id: string) { const response = await rest(config, `/support_tickets?id=eq.${encodeURIComponent(id)}&select=*&limit=1`); return response.ok ? (await response.json() as Ticket[])[0] || null : null; }
async function ticketByPeer(config: Config, peerId: string) { const response = await rest(config, `/support_tickets?telegram_peer_id=eq.${encodeURIComponent(peerId)}&select=*&limit=1`); return response.ok ? (await response.json() as Ticket[])[0] || null : null; }
async function createTicket(config: Config, data: Record<string, unknown>) { const response = await rest(config, "/support_tickets", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(data) }); return response.ok ? (await response.json() as Ticket[])[0] || null : null; }
async function removeTicketMessages(config: Config, ticketId: string) { await rest(config, `/support_messages?ticket_id=eq.${encodeURIComponent(ticketId)}`, { method: "DELETE" }); }
async function removeTicketSkips(config: Config, ticketId: string) { await rest(config, `/support_ticket_skips?ticket_id=eq.${encodeURIComponent(ticketId)}`, { method: "DELETE" }); }
async function latestTicketMessageId(config: Config, ticketId: string) {
  const response = await rest(config, `/support_messages?ticket_id=eq.${encodeURIComponent(ticketId)}&telegram_message_id=not.is.null&select=telegram_message_id&order=telegram_message_id.desc&limit=1`);
  const [message] = response.ok ? await response.json() as { telegram_message_id: number }[] : [];
  return message?.telegram_message_id || 0;
}

async function listTickets(config: Config, userId: string, owner: boolean) {
  const ticketsResponse = await rest(config, "/support_tickets?status=neq.closed&telegram_peer_id=neq.777000&select=*&order=updated_at.desc");
  const messagesResponse = await rest(config, "/support_messages?select=*&order=sent_at.asc");
  const skipsResponse = await rest(config, `/support_ticket_skips?user_id=eq.${encodeURIComponent(userId)}&select=ticket_id`);
  const tickets = ticketsResponse.ok ? await ticketsResponse.json() as Ticket[] : [];
  const messages = messagesResponse.ok ? await messagesResponse.json() as Message[] : [];
  const skipped = new Set(skipsResponse.ok ? (await skipsResponse.json() as { ticket_id: string }[]).map((skip) => skip.ticket_id) : []);
  return { tickets: tickets.filter((ticket) => !skipped.has(ticket.id) && (ticket.status === "new" || owner || ticket.assigned_to === userId)).map((ticket) => ({ ...ticket, messages: messages.filter((message) => message.ticket_id === ticket.id) })) };
}

async function telegramClient() {
  if (cachedTelegramClient?.connected) return cachedTelegramClient;
  if (connectingTelegramClient) return connectingTelegramClient;
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const session = process.env.TELEGRAM_SESSION_STRING;
  if (!Number.isInteger(apiId) || !apiHash || !session) return null;
  connectingTelegramClient = (async () => {
    const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 2 });
    await client.connect();
    cachedTelegramClient = client;
    return client;
  })();
  try { return await connectingTelegramClient; }
  finally { connectingTelegramClient = null; }
}
async function sendTelegram(ticket: Ticket, text: string) {
  const client = await telegramClient();
  if (!client) throw new Error("Telegram account is not configured");
  const result = await client.sendMessage(new Api.InputPeerUser({ userId: bigInt(ticket.telegram_peer_id), accessHash: bigInt(ticket.telegram_access_hash) }), { message: text });
  return result.id;
}

async function syncTelegram(config: Config) {
  const client = await telegramClient();
  if (!client) return;
  try {
    const dialogs = await client.getDialogs({ limit: 25 });
    for (const dialog of dialogs) {
      const entity = dialog.entity as Api.User;
      const peerId = entity?.id?.toString();
      if (!entity || entity.className !== "User" || entity.bot || !entity.accessHash || !peerId || peerId === "777000" || entity.username?.toLowerCase() === "telegram") continue;
      const clientName = [entity.firstName, entity.lastName].filter(Boolean).join(" ") || entity.username || "Клієнт";
      const messages = await client.getMessages(entity, { limit: 15 });
      const incomingMessages = messages.filter((message) => !message.out && !message.action && Boolean(message.message?.trim()));
      if (incomingMessages.length === 0) continue;
      const ticketData = { telegram_peer_id: peerId, telegram_access_hash: entity.accessHash.toString(), client_name: clientName, client_username: entity.username || null, updated_at: new Date().toISOString() };
      let ticket = await ticketByPeer(config, peerId);
      let messagesToSave = incomingMessages;
      const lastMessageId = ticket ? await latestTicketMessageId(config, ticket.id) : 0;
      const newTelegramMessages = incomingMessages.filter((message) => message.id > lastMessageId);
      const startsNewRequest = ticket?.status === "awaiting_rating" && !ticket.rating && newTelegramMessages.length > 0 && !/^[1-5]$/.test(newTelegramMessages[0].message.trim());
      if (ticket && (ticket.status === "closed" || startsNewRequest)) {
        messagesToSave = newTelegramMessages;
        if (messagesToSave.length === 0) continue;
        await removeTicketMessages(config, ticket.id);
        await removeTicketSkips(config, ticket.id);
        await patch(config, "support_tickets", `id=eq.${ticket.id}`, { ...ticketData, status: "new", assigned_to: null, assigned_at: null, rating: null, review: null });
        ticket = await ticketById(config, ticket.id);
      } else if (!ticket) ticket = await createTicket(config, ticketData);
      if (!ticket) continue;
      for (const message of messagesToSave) {
        const text = message.message.trim();
        if (await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: message.id, sender_type: "client", body: text })) await handleFeedback(config, ticket, text);
      }
    }
  } catch {
    cachedTelegramClient = null;
  }
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
