import { verifyGoogleUser, verifyOwnerSession } from "../../../auth";

const MAX_CREDIT = 1_000_000;

/**
 * Credits NZR points to one wallet. Only a verified (signed, 2FA) owner session
 * may do it; the owner's Google account is sent to the wallet API as the actor,
 * and the wallet API stores every credit in its audit table.
 */
export async function POST(request: Request, context: { params: Promise<{ displayId: string }> }) {
  const user = await verifyGoogleUser(request) as { id: string; email?: string } | null;
  if (!user || !(await verifyOwnerSession(request, user.id))) {
    return Response.json({ success: false, message: "Нараховувати може лише власник" }, { status: 403 });
  }
  const displayId = (await context.params).displayId;
  if (!/^\d{1,10}$/.test(displayId)) return Response.json({ success: false, message: "Невірний Wallet ID" }, { status: 400 });

  const body = await request.json().catch(() => ({})) as { amount?: unknown; creditId?: unknown; note?: unknown };
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_CREDIT) {
    return Response.json({ success: false, message: `Сума має бути цілим числом від 1 до ${MAX_CREDIT.toLocaleString("uk-UA")}` }, { status: 400 });
  }
  const creditId = typeof body.creditId === "string" ? body.creditId : "";
  if (!/^[A-Za-z0-9-]{8,64}$/.test(creditId)) return Response.json({ success: false, message: "Невірний запит" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.slice(0, 240) : undefined;

  const baseUrl = process.env.WALLET_API_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.WALLET_ADMIN_API_KEY;
  if (!baseUrl || !apiKey) return Response.json({ success: false, message: "Wallet API is not configured" }, { status: 503 });

  const actor = `${user.email || "owner"} (${user.id})`;
  try {
    const response = await fetch(`${baseUrl}/admin/api/wallets/${displayId}/nzr-credit`, {
      method: "POST",
      headers: { "X-Admin-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ amount, creditId, actor, note }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({ success: false, message: "Wallet API returned no answer" }));
    return Response.json(result, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    // The wallet may or may not have been credited; the same creditId can be retried safely.
    return Response.json({ success: false, message: "Wallet API is unavailable. Спробуйте ще раз — повтор не зарахує двічі." }, { status: 503 });
  }
}
