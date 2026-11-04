import { verifyGoogleUser, verifyOwnerSession } from "../../owner/auth";

type Ticket = { id: string; telegram_peer_id: string; telegram_access_hash: string; client_name: string; client_username: string | null; status: string; assigned_to: string | null; rating: number | null; review: string | null; created_at: string; updated_at: string };
type Message = { id: string; ticket_id: string; telegram_message_id: number | null; sender_type: "client" | "agent" | "system"; body: string; sent_at: string };
type Config = { url: string; key: string };
const DEFAULT_ACTIVE_CHAT_LIMIT = 5;

export const runtime = "nodejs";

// A client who rated the chat may leave one short review within this window;
// anything written later is a new request.
const REVIEW_WINDOW_MS = 30 * 60 * 1000;
// A chat left waiting for a rating this long is treated as finished, so any
// new message from the client starts a new request.
const AWAITING_RATING_TTL_MS = 24 * 60 * 60 * 1000;
const OPERATOR_ONLINE_MS = 5 * 60 * 1000;

let cachedTelegramClient: any = null;
let connectingTelegramClient: Promise<any | null> | null = null;
// Every open chat page polls with ?sync=1 every few seconds. Running those
// syncs in parallel made them overwrite each other (a reopened chat could be
// wiped by a second sync), so only one runs at a time and the rest share it.
let supportSyncInFlight: Promise<void> | null = null;

export async function GET(request: Request) {
  const access = await authorize(request);
  if (!access) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!access.owner && !access.canUseChats) return Response.json({ error: "Chat access is disabled by CEO" }, { status: 403 });
  const config = configForServer();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  if (new URL(request.url).searchParams.get("sync") === "1") await runSupportSync(config);
  if (new URL(request.url).searchParams.get("operators") === "1") return Response.json({ operators: await onlineOperators(config, access.userId) });
  return Response.json(await listTickets(config, access.userId, access.owner));
}

export async function POST(request: Request) {
  const access = await authorize(request);
  if (!access) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!access.owner && !access.canUseChats) return Response.json({ error: "Chat access is disabled by CEO" }, { status: 403 });
  const config = configForServer();
  if (!config) return Response.json({ error: "Server configuration is incomplete" }, { status: 500 });
  const body = await request.json().catch(() => null) as { action?: string; ticketId?: string; message?: string; targetUserId?: string } | null;
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
    if (!access.owner && await activeChatCount(config, access.userId) >= await activeChatLimit(config, access.userId)) return Response.json({ error: "Досягнуто вашого ліміту активних чатів." }, { status: 409 });
    const greeting = "Вітаємо вас у технічній підтримці Nezeriya Wallet";
    const telegramMessageId = await sendTelegram(ticket, greeting);
    await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: telegramMessageId, sender_type: "agent", body: greeting });
    await patch(config, "support_tickets", `id=eq.${ticket.id}`, { status: "in_progress", assigned_to: access.userId, assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return Response.json({ ok: true });
  }
  // A new ticket is still in the shared queue, so any operator may hand it on
  // or dismiss it; a taken ticket only by its operator or the CEO.
  const canManage = access.owner || ticket.status === "new" || ticket.assigned_to === access.userId;
  if (body.action === "transfer") {
    if (!canManage) return Response.json({ error: "This ticket is assigned to another agent" }, { status: 403 });
    if (ticket.status !== "new" && ticket.status !== "in_progress") return Response.json({ error: "Передати можна лише відкритий чат." }, { status: 409 });
    const target = (await onlineOperators(config, access.userId)).find((operator) => operator.user_id === body.targetUserId);
    if (!target) return Response.json({ error: "Цей працівник уже не в мережі. Оберіть іншого." }, { status: 409 });
    if (target.active_chats >= target.active_chat_limit) return Response.json({ error: `У ${target.full_name} уже максимум активних чатів.` }, { status: 409 });
    if (ticket.status === "new") {
      const greeting = "Вітаємо вас у технічній підтримці Nezeriya Wallet";
      const telegramMessageId = await sendTelegram(ticket, greeting);
      await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: telegramMessageId, sender_type: "agent", body: greeting });
    }
    const from = ticket.assigned_to ? (await operatorNames(config, [ticket.assigned_to])).get(ticket.assigned_to) : null;
    await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: null, sender_type: "system", body: `Чат передано${from ? ` від ${from}` : ""} працівнику ${target.full_name}` });
    await patch(config, "support_tickets", `id=eq.${ticket.id}`, { status: "in_progress", assigned_to: target.user_id, assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return Response.json({ ok: true });
  }
  if (body.action === "dismiss") {
    if (!canManage) return Response.json({ error: "This ticket is assigned to another agent" }, { status: 403 });
    if (ticket.status !== "new" && ticket.status !== "in_progress") return Response.json({ error: "Цей чат уже закрито." }, { status: 409 });
    // Closed quietly: the client gets no rating request. A new message from the
    // client reopens the chat as a new request (see syncTelegram).
    await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: null, sender_type: "system", body: "Позначено як помилкову задачу і закрито" });
    await patch(config, "support_tickets", `id=eq.${ticket.id}`, { status: "closed", updated_at: new Date().toISOString() });
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
  const response = await rest(config, `/worker_applications?user_id=eq.${encodeURIComponent(user.id)}&status=eq.approved&select=id,can_use_chats&limit=1`);
  const rows = response.ok ? await response.json() as { id: string; can_use_chats: boolean }[] : [];
  return rows.length ? { userId: user.id, owner: false, canUseChats: rows[0].can_use_chats } : null;
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
async function activeChatCount(config: Config, userId: string) {
  const response = await rest(config, `/support_tickets?status=eq.in_progress&assigned_to=eq.${encodeURIComponent(userId)}&select=id`);
  return response.ok ? (await response.json() as { id: string }[]).length : DEFAULT_ACTIVE_CHAT_LIMIT;
}

async function activeChatLimit(config: Config, userId: string) {
  const response = await rest(config, `/worker_applications?user_id=eq.${encodeURIComponent(userId)}&status=eq.approved&select=active_chat_limit&limit=1`);
  const [worker] = response.ok ? await response.json() as { active_chat_limit: number }[] : [];
  return Number.isInteger(worker?.active_chat_limit) ? worker.active_chat_limit : DEFAULT_ACTIVE_CHAT_LIMIT;
}

type Operator = { user_id: string; full_name: string; active_chats: number; active_chat_limit: number };

async function onlineOperators(config: Config, exceptUserId: string): Promise<Operator[]> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const workersResponse = await rest(config, `/worker_applications?status=eq.approved&can_use_chats=eq.true&operator_status=eq.online&last_active_at=gte.${encodeURIComponent(cutoff)}&user_id=neq.${encodeURIComponent(exceptUserId)}&select=user_id,full_name,active_chat_limit&order=full_name.asc`);
  const workers = workersResponse.ok ? await workersResponse.json() as { user_id: string; full_name: string | null; active_chat_limit: number }[] : [];
  if (!workers.length) return [];
  const activeResponse = await rest(config, "/support_tickets?status=eq.in_progress&assigned_to=not.is.null&select=assigned_to");
  const active = activeResponse.ok ? await activeResponse.json() as Pick<Ticket, "assigned_to">[] : [];
  return workers.map((worker) => ({
    user_id: worker.user_id,
    full_name: worker.full_name?.trim() || "Працівник",
    active_chats: active.filter((item) => item.assigned_to === worker.user_id).length,
    active_chat_limit: Number.isInteger(worker.active_chat_limit) ? worker.active_chat_limit : DEFAULT_ACTIVE_CHAT_LIMIT,
  }));
}

async function operatorNames(config: Config, userIds: string[]) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return new Map<string, string>();
  const response = await rest(config, `/worker_applications?user_id=in.(${ids.map(encodeURIComponent).join(",")})&select=user_id,full_name`);
  const rows = response.ok ? await response.json() as { user_id: string; full_name: string | null }[] : [];
  return new Map(rows.filter((row) => row.full_name?.trim()).map((row) => [row.user_id, row.full_name!.trim()]));
}

async function listTickets(config: Config, userId: string, owner: boolean) {
  const ticketsResponse = await rest(config, "/support_tickets?status=neq.closed&telegram_peer_id=neq.777000&select=*&order=updated_at.desc");
  const messagesResponse = await rest(config, "/support_messages?select=*&order=sent_at.asc");
  const skipsResponse = await rest(config, `/support_ticket_skips?user_id=eq.${encodeURIComponent(userId)}&select=ticket_id`);
  const tickets = ticketsResponse.ok ? await ticketsResponse.json() as Ticket[] : [];
  const messages = messagesResponse.ok ? await messagesResponse.json() as Message[] : [];
  const skipped = new Set(skipsResponse.ok ? (await skipsResponse.json() as { ticket_id: string }[]).map((skip) => skip.ticket_id) : []);
  const visible = tickets.filter((ticket) => !skipped.has(ticket.id) && (ticket.status === "new" || owner || ticket.assigned_to === userId));
  const names = await operatorNames(config, visible.flatMap((ticket) => ticket.assigned_to ? [ticket.assigned_to] : []));
  return { tickets: visible.map((ticket) => ({ ...ticket, assigned_name: ticket.assigned_to ? names.get(ticket.assigned_to) || null : null, messages: messages.filter((message) => message.ticket_id === ticket.id) })) };
}

async function telegramClient() {
  if (cachedTelegramClient?.connected) return cachedTelegramClient;
  if (connectingTelegramClient) return connectingTelegramClient;
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const session = process.env.TELEGRAM_SESSION_STRING;
  if (!Number.isInteger(apiId) || !apiHash || !session) return null;
  connectingTelegramClient = (async () => {
    // GramJS is Node-only. Loading it only when support sync is requested keeps
    // the Worker-compatible merchant and wallet pages available at startup.
    const telegramModule = "telegram";
    const sessionModule = "telegram/sessions/index.js";
    const { TelegramClient } = await import(telegramModule) as any;
    const { StringSession } = await import(sessionModule) as any;
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
  const telegramModule = "telegram";
  const { Api } = await import(telegramModule) as any;
  const result = await client.sendMessage(new Api.InputPeerUser({ userId: BigInt(ticket.telegram_peer_id), accessHash: BigInt(ticket.telegram_access_hash) }), { message: text });
  return result.id;
}

async function closeInactiveChats(config: Config) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const ticketsResponse = await rest(config, "/support_tickets?status=eq.in_progress&select=id,updated_at");
  const tickets = ticketsResponse.ok ? await ticketsResponse.json() as Pick<Ticket, "id" | "updated_at">[] : [];
  for (const ticket of tickets) {
    if (ticket.updated_at > cutoff) continue;
    const messagesResponse = await rest(config, `/support_messages?ticket_id=eq.${encodeURIComponent(ticket.id)}&select=sender_type,sent_at&order=sent_at.desc&limit=1`);
    const [lastMessage] = messagesResponse.ok ? await messagesResponse.json() as Pick<Message, "sender_type" | "sent_at">[] : [];
    if (!lastMessage || lastMessage.sender_type === "client" || lastMessage.sent_at > cutoff) continue;
    await patch(config, "support_tickets", `id=eq.${ticket.id}&status=eq.in_progress`, { status: "closed", updated_at: new Date().toISOString() });
  }
}

async function runSupportSync(config: Config) {
  if (!supportSyncInFlight) {
    supportSyncInFlight = (async () => {
      try {
        await syncTelegram(config);
        await closeInactiveChats(config);
        await markInactiveOperatorsOffline(config);
        await releaseChatsOfOfflineOperators(config);
        await assignQueuedTickets(config);
      } catch {
        // The next poll retries.
      }
    })().finally(() => { supportSyncInFlight = null; });
  }
  await supportSyncInFlight;
}

async function markInactiveOperatorsOffline(config: Config) {
  const cutoff = new Date(Date.now() - OPERATOR_ONLINE_MS).toISOString();
  await rest(config, `/worker_applications?status=eq.approved&operator_status=eq.online&last_active_at=lt.${encodeURIComponent(cutoff)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ operator_status: "offline" }),
  });
}

async function lastTicketMessage(config: Config, ticketId: string) {
  const response = await rest(config, `/support_messages?ticket_id=eq.${encodeURIComponent(ticketId)}&select=sender_type,sent_at&order=sent_at.desc&limit=1`);
  const [message] = response.ok ? await response.json() as Pick<Message, "sender_type" | "sent_at">[] : [];
  return message || null;
}

// A chat taken by an operator who went offline (ended the shift, switched to
// offline or closed the dashboard) while the client waits for an answer goes
// back to the shared queue, where other operators see it and it is
// auto-assigned to whoever is online. The CEO's own chats are left alone.
async function releaseChatsOfOfflineOperators(config: Config) {
  const ticketsResponse = await rest(config, "/support_tickets?status=eq.in_progress&assigned_to=not.is.null&select=*");
  const tickets = ticketsResponse.ok ? await ticketsResponse.json() as Ticket[] : [];
  if (!tickets.length) return;
  const ids = [...new Set(tickets.map((ticket) => ticket.assigned_to!))];
  const workersResponse = await rest(config, `/worker_applications?user_id=in.(${ids.map(encodeURIComponent).join(",")})&status=eq.approved&select=user_id,full_name,operator_status,last_active_at`);
  if (!workersResponse.ok) return;
  const workers = await workersResponse.json() as { user_id: string; full_name: string | null; operator_status: string | null; last_active_at: string | null }[];
  const cutoff = Date.now() - OPERATOR_ONLINE_MS;
  const offline = new Map(workers
    .filter((worker) => worker.operator_status !== "online" || !worker.last_active_at || Date.parse(worker.last_active_at) < cutoff)
    .map((worker) => [worker.user_id, worker.full_name?.trim() || "Працівник"]));
  for (const ticket of tickets) {
    const name = offline.get(ticket.assigned_to!);
    if (!name) continue;
    const last = await lastTicketMessage(config, ticket.id);
    if (last?.sender_type !== "client") continue;
    await patch(config, "support_tickets", `id=eq.${ticket.id}&status=eq.in_progress&assigned_to=eq.${encodeURIComponent(ticket.assigned_to!)}`, { status: "new", assigned_to: null, assigned_at: null, updated_at: new Date().toISOString() });
    await removeTicketSkips(config, ticket.id);
    await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: null, sender_type: "system", body: `${name} не в мережі — чат повернуто в загальну чергу` });
  }
}

async function assignQueuedTickets(config: Config) {
  const response = await rest(config, "/support_tickets?status=eq.new&telegram_peer_id=neq.777000&select=*&order=updated_at.asc");
  const tickets = response.ok ? await response.json() as Ticket[] : [];
  for (const ticket of tickets) {
    if (!(await autoAssignTicket(config, ticket))) break;
  }
}

// Top message id of each Telegram dialog already handled, so unchanged
// dialogs are skipped instead of re-reading their messages on every poll.
const processedTopMessage = new Map<string, number>();

async function syncTelegram(config: Config) {
  const client = await telegramClient();
  if (!client) return;
  let dialogs: any[];
  try {
    dialogs = await client.getDialogs({ limit: 100 });
  } catch {
    cachedTelegramClient = null;
    return;
  }
  for (const dialog of dialogs) {
    // One broken chat must not stop the remaining chats from syncing.
    try { await syncDialog(config, client, dialog); } catch { /* Retried on the next poll. */ }
  }
}

async function syncDialog(config: Config, client: any, dialog: any) {
  const entity = dialog.entity as any;
  const peerId = entity?.id?.toString();
  if (!entity || entity.className !== "User" || entity.bot || !entity.accessHash || !peerId || peerId === "777000" || entity.username?.toLowerCase() === "telegram") return;
  const topMessageId: number | undefined = dialog.message?.id;
  if (topMessageId && processedTopMessage.get(peerId) === topMessageId) return;
  const clientName = [entity.firstName, entity.lastName].filter(Boolean).join(" ") || entity.username || "Клієнт";
  const messages = await client.getMessages(entity, { limit: 30 }) as any[];
  const incoming = messages
    .filter((message) => !message.out && !message.action && Boolean(message.message?.trim()))
    .sort((a, b) => a.id - b.id);
  if (incoming.length) {
    const ticketData = { telegram_peer_id: peerId, telegram_access_hash: entity.accessHash.toString(), client_name: clientName, client_username: entity.username || null, updated_at: new Date().toISOString() };
    const ticket = await ticketByPeer(config, peerId);
    if (!ticket) {
      const created = await createTicket(config, ticketData);
      if (!created) return;
      await saveClientMessages(config, created, incoming);
      await startRequest(config, created);
    } else {
      const lastMessageId = await latestTicketMessageId(config, ticket.id);
      const fresh = incoming.filter((message) => message.id > lastMessageId);
      if (ticket.status === "closed" || (ticket.status === "awaiting_rating" && Date.now() - Date.parse(ticket.updated_at) > AWAITING_RATING_TTL_MS)) {
        if (fresh.length) await reopenTicket(config, ticket, ticketData, fresh);
      } else if (ticket.status === "awaiting_rating") {
        if (fresh.length) await handleAwaitingRating(config, ticket, ticketData, fresh);
      } else {
        // Open chat: store everything not saved yet, but never messages that
        // belong to an earlier, already finished request.
        const oldestMessageId = await oldestTicketMessageId(config, ticket.id);
        const saved = await saveClientMessages(config, ticket, incoming.filter((message) => message.id >= oldestMessageId));
        if (saved > 0) await patch(config, "support_tickets", `id=eq.${ticket.id}`, ticketData);
        if (ticket.status === "new") await sendAutomaticReply(config, ticket);
      }
    }
  }
  if (topMessageId) processedTopMessage.set(peerId, topMessageId);
}

async function oldestTicketMessageId(config: Config, ticketId: string) {
  const response = await rest(config, `/support_messages?ticket_id=eq.${encodeURIComponent(ticketId)}&telegram_message_id=not.is.null&select=telegram_message_id&order=telegram_message_id.asc&limit=1`);
  const [message] = response.ok ? await response.json() as { telegram_message_id: number }[] : [];
  return message?.telegram_message_id || 0;
}

async function saveClientMessages(config: Config, ticket: Ticket, messages: any[]) {
  let saved = 0;
  for (const message of messages) {
    if (await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: message.id, sender_type: "client", body: message.message.trim() })) saved += 1;
  }
  return saved;
}

// The client messages are stored before the automatic reply, so they are never
// filtered out as older than the request if the reply is sent first.
async function startRequest(config: Config, ticket: Ticket) {
  await sendAutomaticReply(config, ticket);
  await autoAssignTicket(config, ticket);
}

async function reopenTicket(config: Config, ticket: Ticket, ticketData: Record<string, unknown>, messages: any[]) {
  await removeTicketMessages(config, ticket.id);
  await removeTicketSkips(config, ticket.id);
  await patch(config, "support_tickets", `id=eq.${ticket.id}`, { ...ticketData, status: "new", assigned_to: null, assigned_at: null, rating: null, review: null });
  const reopened = await ticketById(config, ticket.id);
  if (!reopened) return;
  await saveClientMessages(config, reopened, messages);
  await startRequest(config, reopened);
}

// After "close" the client may send a rating (1-5) and then one short review.
// Any other message, or a message after the review window, is a new request
// and goes back to the queue instead of being swallowed as feedback.
async function handleAwaitingRating(config: Config, ticket: Ticket, ticketData: Record<string, unknown>, messages: any[]) {
  let current = ticket;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const text = message.message.trim();
    if (!current.rating && /^[1-5]$/.test(text)) {
      await insertMessage(config, { ticket_id: current.id, telegram_message_id: message.id, sender_type: "client", body: text });
      const now = new Date().toISOString();
      await patch(config, "support_tickets", `id=eq.${current.id}`, { rating: Number(text), updated_at: now });
      current = { ...current, rating: Number(text), updated_at: now };
      try { await sendTelegram(current, "Дякуємо за оцінку. За бажанням надішліть короткий відгук одним повідомленням."); } catch { /* The rating is saved anyway. */ }
      continue;
    }
    const reviewWindowOpen = Boolean(current.rating) && !current.review && Date.now() - Date.parse(current.updated_at) < REVIEW_WINDOW_MS && text.length <= 2000;
    if (reviewWindowOpen) {
      await insertMessage(config, { ticket_id: current.id, telegram_message_id: message.id, sender_type: "client", body: text });
      await saveReview(config, current, text);
      const remaining = messages.slice(index + 1);
      if (remaining.length) await reopenTicket(config, { ...current, status: "closed" }, ticketData, remaining);
      return;
    }
    await reopenTicket(config, current, ticketData, messages.slice(index));
    return;
  }
}

async function saveReview(config: Config, ticket: Ticket, text: string) {
  await patch(config, "support_tickets", `id=eq.${ticket.id}`, { status: "closed", review: text, updated_at: new Date().toISOString() });
  if (!ticket.assigned_to) return;
  const employeeResponse = await rest(config, `/worker_applications?user_id=eq.${encodeURIComponent(ticket.assigned_to)}&status=eq.approved&select=id&limit=1`);
  const [employee] = employeeResponse.ok ? await employeeResponse.json() as { id: string }[] : [];
  if (employee) await rest(config, "/employee_reviews", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ employee_application_id: employee.id, client_name: ticket.client_name, rating: ticket.rating, comment: text }) });
}

async function sendAutomaticReply(config: Config, ticket: Ticket) {
  const existing = await rest(config, `/support_messages?ticket_id=eq.${encodeURIComponent(ticket.id)}&sender_type=eq.system&select=id&limit=1`);
  if (existing.ok && (await existing.json() as unknown[]).length > 0) return;
  const text = "Дякуємо за звернення до підтримки Nezeriya Wallet. Ваш запит отримано — оператор відповість найближчим часом.";
  try {
    const telegramMessageId = await sendTelegram(ticket, text);
    await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: telegramMessageId, sender_type: "system", body: text });
  } catch {
    // The chat remains in the queue if Telegram is temporarily unavailable.
  }
}

// Returns false when nobody online can take another chat.
async function autoAssignTicket(config: Config, ticket: Ticket) {
  const workersResponse = await rest(config, `/worker_applications?status=eq.approved&can_use_chats=eq.true&operator_status=eq.online&last_active_at=gte.${encodeURIComponent(new Date(Date.now() - 3 * 60 * 1000).toISOString())}&select=user_id,active_chat_limit&order=last_active_at.desc`);
  const workers = workersResponse.ok ? await workersResponse.json() as { user_id: string; active_chat_limit: number }[] : [];
  if (!workers.length) return false;
  const activeResponse = await rest(config, "/support_tickets?status=eq.in_progress&assigned_to=not.is.null&select=assigned_to");
  const activeTickets = activeResponse.ok ? await activeResponse.json() as Pick<Ticket, "assigned_to">[] : [];
  const workloads = new Map(workers.map((worker) => [worker.user_id, 0]));
  const limits = new Map(workers.map((worker) => [worker.user_id, Number.isInteger(worker.active_chat_limit) ? worker.active_chat_limit : DEFAULT_ACTIVE_CHAT_LIMIT]));
  activeTickets.forEach((item) => { if (item.assigned_to && workloads.has(item.assigned_to)) workloads.set(item.assigned_to, (workloads.get(item.assigned_to) || 0) + 1); });
  const agentId = [...workloads.entries()].filter(([userId, count]) => count < (limits.get(userId) || DEFAULT_ACTIVE_CHAT_LIMIT)).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]?.[0];
  if (!agentId) return false;
  // A chat returned to the queue mid-conversation is not greeted a second time.
  const agentMessages = await rest(config, `/support_messages?ticket_id=eq.${encodeURIComponent(ticket.id)}&sender_type=eq.agent&select=id&limit=1`);
  const greeted = agentMessages.ok && (await agentMessages.json() as unknown[]).length > 0;
  if (!greeted) {
    const greeting = "Вітаємо вас у технічній підтримці Nezeriya Wallet";
    try {
      const telegramMessageId = await sendTelegram(ticket, greeting);
      await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: telegramMessageId, sender_type: "agent", body: greeting });
    } catch { return true; }
  } else {
    const names = await operatorNames(config, [agentId]);
    await insertMessage(config, { ticket_id: ticket.id, telegram_message_id: null, sender_type: "system", body: `Чат автоматично передано працівнику ${names.get(agentId) || "Працівник"}` });
  }
  await patch(config, "support_tickets", `id=eq.${ticket.id}&status=eq.new`, { status: "in_progress", assigned_to: agentId, assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  return true;
}
