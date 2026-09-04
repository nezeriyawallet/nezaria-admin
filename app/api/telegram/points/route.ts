import { botToken, database, verifyMiniAppUser } from "../shared";

export async function GET(request: Request) {
  try {
    const token = botToken();
    const identity = await verifyMiniAppUser(request.headers.get("x-telegram-init-data") || "", token);
    if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const row = await database().prepare("SELECT points FROM telegram_users WHERE telegram_user_id = ?").bind(String(identity.id)).first<{ points: number }>();
    return Response.json({ points: row?.points || 0 });
  } catch {
    return Response.json({ error: "Points are unavailable" }, { status: 503 });
  }
}
