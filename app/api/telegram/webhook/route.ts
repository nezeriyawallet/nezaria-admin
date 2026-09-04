import { botToken, callTelegram, database, webhookSecret } from "../shared";

type TelegramUpdate = {
  pre_checkout_query?: { id: string; currency: string; total_amount: number; invoice_payload: string };
  message?: { successful_payment?: { currency: string; total_amount: number; invoice_payload: string; telegram_payment_charge_id: string } };
};

export async function POST(request: Request) {
  const secret = webhookSecret();
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) return new Response("Unauthorized", { status: 401 });

  const update = await request.json().catch(() => null) as TelegramUpdate | null;
  if (!update) return new Response("Bad request", { status: 400 });
  const token = botToken();

  if (update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    const valid = query.currency === "XTR" && parsePayload(query.invoice_payload)?.points === query.total_amount;
    await callTelegram(token, "answerPreCheckoutQuery", valid ? { pre_checkout_query_id: query.id, ok: true } : { pre_checkout_query_id: query.id, ok: false, error_message: "Некоректний рахунок" });
  }

  const payment = update.message?.successful_payment;
  if (payment?.currency === "XTR") {
    const data = parsePayload(payment.invoice_payload);
    if (data && data.points === payment.total_amount) {
      const db = database();
      const now = new Date().toISOString();
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO telegram_payments (charge_id, telegram_user_id, points, currency, created_at) VALUES (?, ?, ?, ?, ?)").bind(payment.telegram_payment_charge_id, data.userId, data.points, payment.currency, now),
        db.prepare("INSERT INTO telegram_users (telegram_user_id, points, created_at, updated_at) SELECT ?, ?, ?, ? WHERE changes() = 1 ON CONFLICT(telegram_user_id) DO UPDATE SET points = points + excluded.points, updated_at = excluded.updated_at").bind(data.userId, data.points, now, now),
      ]);
    }
  }
  return Response.json({ ok: true });
}

function parsePayload(payload: string) {
  const match = /^nex-points:(\d+):(\d+):[0-9a-f-]{36}$/.exec(payload);
  if (!match) return null;
  const userId = match[1];
  const points = Number(match[2]);
  return Number.isSafeInteger(points) && points > 0 ? { userId, points } : null;
}
