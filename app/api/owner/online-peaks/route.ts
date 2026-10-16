import { verifyGoogleUser, verifyOwnerSession } from "../auth";

// Daily online peaks for one calendar year, read from the wallet admin API.
export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  const ownerSession = request.headers.get("x-owner-session")?.trim();
  const verifiedOwner = user ? await verifyOwnerSession(request, user.id) : false;
  if (!user || (!verifiedOwner && !ownerSession)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const baseUrl = (process.env.WALLET_API_BASE_URL?.trim() || process.env.NEZERIYA_WALLET_API_URL?.trim() || "https://bot-5k6u.onrender.com").replace(/\/+$/, "");
  const apiKey = process.env.WALLET_ADMIN_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: "Wallet API is not configured" }, { status: 503 });

  const year = Number(new URL(request.url).searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return Response.json({ error: "year must be a valid reporting year" }, { status: 400 });
  try {
    const response = await fetch(`${baseUrl}/admin/api/users/online/peaks?year=${year}&_=${Date.now()}`, { headers: { "X-Admin-Key": apiKey, Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return Response.json({ error: "Wallet API is unavailable" }, { status: response.status === 404 ? 404 : 502 });
    return Response.json(await response.json(), { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
  } catch {
    return Response.json({ error: "Wallet API is unavailable" }, { status: 502 });
  }
}
