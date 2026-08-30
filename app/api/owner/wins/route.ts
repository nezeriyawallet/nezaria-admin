import { verifyGoogleUser, verifyOwnerSession } from "../auth";

type GameResult = { wheel?: number; dropped?: string; reward?: string; createdAt?: string };

const headersFor = (apiKey: string) => ({ "X-Admin-Key": apiKey, Accept: "application/json" });

function nzrAmount(value: unknown) {
  const text = String(value ?? "");
  if (!text.toUpperCase().includes("NZR")) return 0;
  const found = text.replace(/\s/g, "").match(/-?\d+(?:[.,]\d+)?/);
  return found ? Number(found[0].replace(",", ".")) : 0;
}

function plinkoStake(value: unknown) {
  const found = String(value ?? "").match(/ставка\s*(\d+(?:[.,]\d+)?)/i);
  return found ? Number(found[1].replace(",", ".")) : 0;
}

function buildMonthlyTotals(items: GameResult[]) {
  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  let wheelWon = 0, plinkoWon = 0, wheelCollected = 0, plinkoCollected = 0;
  for (const item of items) {
    const createdAt = Date.parse(item.createdAt ?? "");
    if (!Number.isFinite(createdAt) || createdAt < monthStart) continue;
    const dropped = String(item.dropped ?? "");
    const prize = nzrAmount(item.reward);
    if (/plinko/i.test(dropped)) { plinkoWon += prize; plinkoCollected += plinkoStake(dropped); continue; }
    const wheel = Number(item.wheel);
    if (wheel === 1 || wheel === 2) { wheelWon += prize; wheelCollected += wheel === 1 ? 10 : 30; }
  }
  const monthlyWonNzr = wheelWon + plinkoWon;
  const monthlyCollectedNzr = wheelCollected + plinkoCollected;
  return { monthlyWonNzr, monthlyCollectedNzr, monthlyNetEarningsNzr: monthlyCollectedNzr - monthlyWonNzr, monthlyWheelWonNzr: wheelWon, monthlyPlinkoWonNzr: plinkoWon, monthlyWheelSpentNzr: wheelCollected, monthlyPlinkoSpentNzr: plinkoCollected };
}

export async function GET(request: Request) {
  const user = await verifyGoogleUser(request);
  const ownerSession = request.headers.get("x-owner-session")?.trim();
  const verifiedOwner = user ? await verifyOwnerSession(request, user.id) : false;
  if (!user || (!verifiedOwner && !ownerSession)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = process.env.WALLET_API_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.WALLET_ADMIN_API_KEY;
  if (!baseUrl || !apiKey) {
    return Response.json({ error: "Wallet API is not configured" }, { status: 503 });
  }

  try {
    const fresh = Date.now();
    const response = await fetch(`${baseUrl}/admin/api/wheel/wins?page=0&size=100&_=${fresh}`, { headers: headersFor(apiKey), cache: "no-store" });
    if (!response.ok) return Response.json({ error: "Wallet API is unavailable" }, { status: response.status });
    const firstPage = await response.json() as Record<string, unknown>;
    const totalPages = Math.min(Math.max(Number(firstPage.totalPages) || 1, 1), 50);
    const otherPages = await Promise.all(Array.from({ length: totalPages - 1 }, async (_, index) => {
      const page = await fetch(`${baseUrl}/admin/api/wheel/wins?page=${index + 1}&size=100&_=${fresh}`, { headers: headersFor(apiKey), cache: "no-store" });
      return page.ok ? await page.json() as Record<string, unknown> : null;
    }));
    const allItems = [firstPage, ...otherPages.filter(Boolean)].flatMap((page) => Array.isArray(page.items) ? page.items as GameResult[] : []);
    const calculated = buildMonthlyTotals(allItems);
    const officialCollected = numberFrom(firstPage.monthlyCollectedNzr);
    const officialWon = numberFrom(firstPage.monthlyWonNzr);
    const hasOfficialSummary = officialCollected !== null || officialWon !== null;
    // Newer wallet API versions already calculate every completed Roulette and
    // Plinko round. Prefer that journal over guessed values parsed from labels.
    const source = hasOfficialSummary ? {
      monthlyWonNzr: officialWon ?? 0,
      monthlyCollectedNzr: officialCollected ?? 0,
      monthlyNetEarningsNzr: numberFrom(firstPage.monthlyNetEarningsNzr) ?? ((officialCollected ?? 0) - (officialWon ?? 0)),
      monthlyWheelWonNzr: numberFrom(firstPage.monthlyWheelWonNzr) ?? 0,
      monthlyPlinkoWonNzr: numberFrom(firstPage.monthlyPlinkoWonNzr) ?? 0,
      monthlyWheelSpentNzr: numberFrom(firstPage.monthlyWheelCollectedNzr) ?? numberFrom(firstPage.monthlyWheelSpentNzr) ?? 0,
      monthlyPlinkoSpentNzr: numberFrom(firstPage.monthlyPlinkoCollectedNzr) ?? numberFrom(firstPage.monthlyPlinkoSpentNzr) ?? 0,
    } : calculated;
    return Response.json({ ...firstPage, items: allItems, totalElements: allItems.length, totalPages: 1,
      monthlyWonNzr: source.monthlyWonNzr ?? 0, monthlyCollectedNzr: source.monthlyCollectedNzr ?? 0,
      monthlyNetEarningsNzr: source.monthlyNetEarningsNzr ?? source.monthlyLostNzr ?? 0, monthlyLostNzr: source.monthlyNetEarningsNzr ?? source.monthlyLostNzr ?? 0,
      monthlyWheelWonNzr: source.monthlyWheelWonNzr ?? 0, monthlyPlinkoWonNzr: source.monthlyPlinkoWonNzr ?? 0,
      monthlyWheelSpentNzr: source.monthlyWheelSpentNzr ?? 0, monthlyPlinkoSpentNzr: source.monthlyPlinkoSpentNzr ?? 0 }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" },
    });
  } catch {
    return Response.json({ error: "Wallet API is unavailable" }, { status: 503 });
  }
}

function numberFrom(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
