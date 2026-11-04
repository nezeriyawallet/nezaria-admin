import { verifyGoogleUser, verifyOwnerSession } from "../../auth";

/** Full card of one wallet (the owner's user card). Only a verified owner session may read it. */
export async function GET(request: Request, context: { params: Promise<{ displayId: string }> }) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) {
    return Response.json({ error: "Лише для власника" }, { status: 403 });
  }
  const displayId = (await context.params).displayId;
  if (!/^\d{1,10}$/.test(displayId)) return Response.json({ error: "Невірний Wallet ID" }, { status: 400 });

  const baseUrl = process.env.WALLET_API_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.WALLET_ADMIN_API_KEY;
  if (!baseUrl || !apiKey) return Response.json({ error: "Wallet API is not configured" }, { status: 503 });

  try {
    const response = await fetch(`${baseUrl}/admin/api/wallets/${displayId}?_=${Date.now()}`, {
      headers: { "X-Admin-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    return Response.json(body, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Wallet API is unavailable" }, { status: 503 });
  }
}
