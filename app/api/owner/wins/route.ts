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
  let wheelWon = 0, plinkoWon = 0, spinsWon = 0, doubleWon = 0, slotsWon = 0, wheelCollected = 0, plinkoCollected = 0, spinsCollected = 0, doubleCollected = 0, slotsCollected = 0;
  for (const item of items) {
    const createdAt = Date.parse(item.createdAt ?? "");
    if (!Number.isFinite(createdAt) || createdAt < monthStart) continue;
    const dropped = String(item.dropped ?? "");
    const prize = nzrAmount(item.reward);
    if (/^plinko/i.test(dropped)) { plinkoWon += prize; plinkoCollected += plinkoStake(dropped); continue; }
    if (/^spins/i.test(dropped)) { spinsWon += prize; spinsCollected += plinkoStake(dropped); continue; }
    if (/^double/i.test(dropped)) { doubleWon += prize; doubleCollected += plinkoStake(dropped); continue; }
    if (/^slots/i.test(dropped)) { slotsWon += prize; slotsCollected += plinkoStake(dropped); continue; }
    const wheel = Number(item.wheel);
    if (wheel === 1 || wheel === 2) { wheelWon += prize; wheelCollected += wheel === 1 ? 10 : 30; }
  }
  const monthlyWonNzr = wheelWon + plinkoWon + spinsWon + doubleWon + slotsWon;
  const monthlyCollectedNzr = wheelCollected + plinkoCollected + spinsCollected + doubleCollected + slotsCollected;
  return { monthlyWonNzr, monthlyCollectedNzr, monthlyNetEarningsNzr: monthlyCollectedNzr - monthlyWonNzr, monthlyWheelWonNzr: wheelWon, monthlyPlinkoWonNzr: plinkoWon, monthlyWheelSpentNzr: wheelCollected, monthlyPlinkoSpentNzr: plinkoCollected, monthlySpinsWonNzr: spinsWon, monthlySpinsSpentNzr: spinsCollected, monthlyDoubleWonNzr: doubleWon, monthlyDoubleSpentNzr: doubleCollected, monthlySlotsWonNzr: slotsWon, monthlySlotsSpentNzr: slotsCollected };
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

  if (winsCache && Date.now() - winsCache.at < WINS_CACHE_MS) return winsResponse(winsCache.body);
  if (!winsInFlight) winsInFlight = loadWins(baseUrl, apiKey).finally(() => { winsInFlight = null; });
  const body = await winsInFlight;
  if (!body) return Response.json({ error: "Wallet API is unavailable" }, { status: 503 });
  return winsResponse(body);
}

// The game journal is heavy for the wallet to build, so the result is shared
// by concurrent requests and reused for a few minutes.
const WINS_CACHE_MS = 5 * 60_000;
let winsCache: { at: number; body: Record<string, unknown> } | null = null;
let winsInFlight: Promise<Record<string, unknown> | null> | null = null;

function winsResponse(body: Record<string, unknown>) {
  return Response.json(body, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" } });
}

async function loadWins(baseUrl: string, apiKey: string): Promise<Record<string, unknown> | null> {
  try {
    const fresh = Date.now();
    const response = await fetch(`${baseUrl}/admin/api/wheel/wins?page=0&size=100&_=${fresh}`, { headers: headersFor(apiKey), cache: "no-store" });
    if (!response.ok) return null;
    const firstPage = await response.json() as Record<string, unknown>;
    const totalPages = Math.min(Math.max(Number(firstPage.totalPages) || 1, 1), 50);
    // Every page makes the wallet load all game rounds into memory, so the
    // pages are fetched one at a time: dozens in parallel ran the wallet out
    // of heap (OutOfMemoryError, 2026-11-04) and froze it for users.
    const otherPages: (Record<string, unknown> | null)[] = [];
    for (let index = 1; index < totalPages; index += 1) {
      const page = await fetch(`${baseUrl}/admin/api/wheel/wins?page=${index}&size=100&_=${fresh}`, { headers: headersFor(apiKey), cache: "no-store", signal: AbortSignal.timeout(20_000) }).catch(() => null);
      otherPages.push(page?.ok ? await page.json() as Record<string, unknown> : null);
    }
    const allItems = [firstPage, ...otherPages.filter((page): page is Record<string, unknown> => page !== null)].flatMap((page) => Array.isArray(page.items) ? page.items as GameResult[] : []);
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
      // Wallet versions before Spins and Double were reported send no such fields.
      monthlySpinsWonNzr: numberFrom(firstPage.monthlySpinsWonNzr) ?? calculated.monthlySpinsWonNzr,
      monthlySpinsSpentNzr: numberFrom(firstPage.monthlySpinsSpentNzr) ?? calculated.monthlySpinsSpentNzr,
      monthlyDoubleWonNzr: numberFrom(firstPage.monthlyDoubleWonNzr) ?? calculated.monthlyDoubleWonNzr,
      monthlyDoubleSpentNzr: numberFrom(firstPage.monthlyDoubleSpentNzr) ?? calculated.monthlyDoubleSpentNzr,
      monthlySlotsWonNzr: numberFrom(firstPage.monthlySlotsWonNzr) ?? calculated.monthlySlotsWonNzr,
      monthlySlotsSpentNzr: numberFrom(firstPage.monthlySlotsSpentNzr) ?? calculated.monthlySlotsSpentNzr,
    } : calculated;
    const body = { ...firstPage, items: allItems, totalElements: allItems.length, totalPages: 1,
      monthlyWonNzr: source.monthlyWonNzr ?? 0, monthlyCollectedNzr: source.monthlyCollectedNzr ?? 0,
      monthlyNetEarningsNzr: source.monthlyNetEarningsNzr ?? source.monthlyLostNzr ?? 0, monthlyLostNzr: source.monthlyNetEarningsNzr ?? source.monthlyLostNzr ?? 0,
      monthlyWheelWonNzr: source.monthlyWheelWonNzr ?? 0, monthlyPlinkoWonNzr: source.monthlyPlinkoWonNzr ?? 0,
      monthlyWheelSpentNzr: source.monthlyWheelSpentNzr ?? 0, monthlyPlinkoSpentNzr: source.monthlyPlinkoSpentNzr ?? 0,
      monthlySpinsWonNzr: source.monthlySpinsWonNzr ?? 0, monthlySpinsSpentNzr: source.monthlySpinsSpentNzr ?? 0,
      monthlyDoubleWonNzr: source.monthlyDoubleWonNzr ?? 0, monthlyDoubleSpentNzr: source.monthlyDoubleSpentNzr ?? 0,
      monthlySlotsWonNzr: source.monthlySlotsWonNzr ?? 0, monthlySlotsSpentNzr: source.monthlySlotsSpentNzr ?? 0 };
    winsCache = { at: Date.now(), body };
    return body;
  } catch {
    return null;
  }
}

function numberFrom(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
