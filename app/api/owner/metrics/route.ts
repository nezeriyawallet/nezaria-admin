import { verifyGoogleUser, verifyOwnerSession } from "../auth";

const endpoints = {
  totalCommission: "/admin/api/commission/total",
  monthlyCommission: "/admin/api/commission/monthly",
  monthlyStars: "/admin/api/stars/monthly",
  users: "/admin/api/users/count",
  wallets: "/admin/api/wallets/count",
  wheelLoss: "/admin/api/wheel/loss",
  failedTransactions: "/admin/api/transactions/failed",
  transactions: "/admin/api/transactions/count",
  dedustSwaps: "/admin/api/swaps/dedust/count",
  referralTotal: "/admin/api/referral/total",
  nzrTransactions: "/admin/api/nzr/transactions/count",
  nzrSwapSell: "/admin/api/nzr/swap-sell",
  nzrSwapBuy: "/admin/api/nzr/swap-buy",
  nzrStars: "/admin/api/nzr-stars",
} as const;

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  if (!user || !(await verifyOwnerSession(request, user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const baseUrl = process.env.WALLET_API_BASE_URL?.replace(//$/, "");
  const apiKey = process.env.WALLET_ADMIN_API_KEY;
  if (!baseUrl || !apiKey) return Response.json({ error: "Wallet API is not configured" }, { status: 503 });

  const values = await Promise.all(Object.entries(endpoints).map(async ([name, path]) => {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { "X-Admin-Key": apiKey, Accept: "application/json" },
        cache: "no-store",
      });
      return [name, response.ok ? scalar(await response.json()) : null] as const;
    } catch {
      return [name, null] as const;
    }
  }));
  return Response.json({ metrics: Object.fromEntries(values), updatedAt: new Date().toISOString() });
}

function scalar(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  for (const key of ["value", "total", "count", "amount", "revenue", "result", "data"]) {
    if (typeof object[key] === "number" || typeof object[key] === "string") return object[key] as number | string;
  }
  return null;
}
