import { verifyGoogleUser, verifyOwnerSession } from "../../auth";

type MonthFinance = { month: number; stars: number; starsPayoutUsd: number; nzrSalesUsd: number; nzrBuybackUsd: number; feesUsd: number; turnoverUsd: number };

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Monthly finance for one year, used by the owner dashboard chart. Every month
// reuses the wallet's own per-month exchange and commission figures.
export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  const ownerSession = request.headers.get("x-owner-session")?.trim();
  const verifiedOwner = user ? await verifyOwnerSession(request, user.id) : false;
  if (!user || (!verifiedOwner && !ownerSession)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const baseUrl = (process.env.WALLET_API_BASE_URL?.trim() || process.env.NEZERIYA_WALLET_API_URL?.trim() || "https://bot-5k6u.onrender.com").replace(/\/+$/, "");
  const apiKey = process.env.WALLET_ADMIN_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: "Wallet API is not configured" }, { status: 503 });

  const now = new Date();
  const year = Number(new URL(request.url).searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2020 || year > now.getUTCFullYear()) return Response.json({ error: "year must be a valid reporting year" }, { status: 400 });
  const lastMonth = year === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 12;
  const headers = { "X-Admin-Key": apiKey, Accept: "application/json" };
  const fresh = Date.now();
  const read = async (path: string) => {
    try {
      const response = await fetch(`${baseUrl}${path}&_=${fresh}`, { headers, cache: "no-store" });
      return response.ok ? await response.json() as Record<string, unknown> : null;
    } catch { return null; }
  };

  const months = await Promise.all(Array.from({ length: lastMonth }, async (_, index): Promise<MonthFinance | null> => {
    const month = index + 1;
    const [exchange, commission] = await Promise.all([
      read(`/admin/api/finance/nzr-exchange?year=${year}&month=${month}&turnoverYear=${year}`),
      read(`/admin/api/commission/monthly?year=${year}&month=${month}`),
    ]);
    if (!exchange) return null;
    return {
      month,
      stars: number(exchange.monthlyTelegramStarsReceived),
      starsPayoutUsd: number(exchange.monthlyTelegramStarsFragmentRevenueUsd),
      nzrSalesUsd: number(exchange.monthlyNzrSoldToUsers) * number(exchange.nzrSaleRateUsd),
      nzrBuybackUsd: number(exchange.monthlyNzrBoughtFromUsers) * number(exchange.nzrBuybackRateUsd),
      feesUsd: number(commission?.netCommissionUsdt ?? commission?.monthlyCommission),
      turnoverUsd: number(exchange.monthlyCompanyTurnoverUsd),
    };
  }));

  return Response.json({ year, months: months.filter((item): item is MonthFinance => item !== null) }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" },
  });
}
