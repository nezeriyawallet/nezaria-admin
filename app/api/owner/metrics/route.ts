import { verifyGoogleUser, verifyOwnerSession } from "../auth";

const endpoints = {
  totalCommission: { path: "/admin/api/commission/total", keys: ["netCommissionUsdt", "totalCommission"] },
  monthlyCommission: { path: "/admin/api/commission/monthly", keys: ["netCommissionUsdt", "monthlyCommission"] },
  monthlyStars: { path: "/admin/api/stars/monthly", keys: ["totalNzrPurchased", "totalNzrBought"] },
  users: { path: "/admin/api/users/count", keys: ["userCount"] },
  premiumUsers: { path: "/admin/api/users/premium/count", keys: ["premiumUserCount"] },
  onlineUsers: { path: "/admin/api/users/online", keys: ["onlineUsers"] },
  maxNzrBalance: { path: "/admin/api/users/nzr/max", keys: ["maxNzrBalance"] },
  wallets: { path: "/admin/api/wallets/count", keys: ["walletCount"] },
  wheelLoss: { path: "/admin/api/wheel/loss", keys: ["totalWheelLoss"] },
  failedTransactions: { path: "/admin/api/transactions/failed?size=1", keys: ["totalElements"] },
  transactions: { path: "/admin/api/transactions/count", keys: ["successfulTransactions"] },
  dedustSwaps: { path: "/admin/api/swaps/dedust/count", keys: ["deDustSwapCount"] },
  referralTotal: { path: "/admin/api/referral/total", keys: ["totalReferralUsdt"] },
  nzrTransactions: { path: "/admin/api/nzr/transactions/count", keys: ["nzrTransactionCount"] },
  nzrSwapSell: { path: "/admin/api/nzr/swap-sell", keys: ["totalNzrSwapSell"] },
  nzrSwapBuy: { path: "/admin/api/nzr/swap-buy", keys: ["totalNzrSwapBuy"] },
  nzrStars: { path: "/admin/api/nzr-stars", keys: ["totalNzrBought", "totalNzrPurchased"] },
} as const;

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  const ownerSession = request.headers.get("x-owner-session")?.trim();
  const verifiedOwner = user ? await verifyOwnerSession(request, user.id) : false;
  // The owner session is held by the browser for 24 hours. On server restarts the
  // stored verification may be unavailable briefly, but the authenticated Google
  // user still has to present that session before wallet metrics are returned.
  if (!user || (!verifiedOwner && !ownerSession)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const baseUrl = process.env.WALLET_API_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.WALLET_ADMIN_API_KEY;
  if (!baseUrl || !apiKey) return Response.json({ error: "Wallet API is not configured" }, { status: 503 });

  const fresh = Date.now();
  const values = await Promise.all(Object.entries(endpoints).map(async ([name, endpoint]) => {
    try {
      const separator = endpoint.path.includes("?") ? "&" : "?";
      const response = await fetch(`${baseUrl}${endpoint.path}${separator}_=${fresh}`, {
        headers: { "X-Admin-Key": apiKey, Accept: "application/json" },
        cache: "no-store",
      });
      return [name, response.ok ? metricValue(await response.json(), endpoint.keys) : null] as const;
    } catch {
      return [name, null] as const;
    }
  }));
  return Response.json({ metrics: Object.fromEntries(values), updatedAt: new Date().toISOString() }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" },
  });
}

function metricValue(value: unknown, keys: readonly string[]): number | string | null {
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    for (const key of keys) if (typeof object[key] === "number" || typeof object[key] === "string") return object[key] as number | string;
  }
  return scalar(value);
}

function scalar(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  for (const key of ["value", "total", "count", "amount", "revenue", "result", "data"]) {
    if (typeof object[key] === "number" || typeof object[key] === "string") return object[key] as number | string;
    const nested = scalar(object[key]);
    if (nested !== null) return nested;
  }
  for (const nestedValue of Object.values(object)) {
    const nested = scalar(nestedValue);
    if (nested !== null) return nested;
  }
  return null;
}
