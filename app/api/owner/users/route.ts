import { verifyGoogleUser, verifyOwnerSession } from "../auth";

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = process.env.WALLET_API_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.WALLET_ADMIN_API_KEY;
  if (!baseUrl || !apiKey) {
    return Response.json({ error: "Wallet API is not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(`${baseUrl}/admin/api/users?size=100`, {
      headers: { "X-Admin-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return Response.json({ error: "Wallet API is unavailable" }, { status: response.status });
    return Response.json(await response.json());
  } catch {
    return Response.json({ error: "Wallet API is unavailable" }, { status: 503 });
  }
}
