import { verifyGoogleUser, verifyOwnerSession } from "../auth";

type RawWalletUser = {
  id?: number | string;
  username?: string;
  name?: string;
  premium?: boolean;
  nzrPoints?: number | string;
  walletIds?: Array<number | string>;
};

function numeric(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
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
    const response = await fetch(`${baseUrl}/admin/api/users?page=0&size=100&_=${fresh}`, {
      headers: { "X-Admin-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return Response.json({ error: "Wallet API is unavailable" }, { status: response.status });
    const firstPage = await response.json() as Record<string, unknown>;
    const totalPages = Math.min(Math.max(Number(firstPage.totalPages) || 1, 1), 50);
    const additionalPages = await Promise.all(Array.from({ length: totalPages - 1 }, async (_, index) => {
      const page = await fetch(`${baseUrl}/admin/api/users?page=${index + 1}&size=100&_=${fresh}`, {
        headers: { "X-Admin-Key": apiKey, Accept: "application/json" },
        cache: "no-store",
      });
      return page.ok ? await page.json() as Record<string, unknown> : null;
    }));
    const wallets = [firstPage, ...additionalPages.filter(Boolean)].flatMap((page) =>
      Array.isArray(page.items) ? page.items as RawWalletUser[] : []);
    const users = new Map<string, Required<Pick<RawWalletUser, "id" | "username" | "name" | "premium" | "walletIds">> & { nzrPoints: number }>();
    for (const wallet of wallets) {
      if (wallet.id === undefined || wallet.id === null) continue;
      const id = String(wallet.id);
      const current = users.get(id) || { id: wallet.id, username: "", name: "", premium: false, nzrPoints: 0, walletIds: [] };
      current.username ||= wallet.username || "";
      current.name ||= wallet.name || "";
      current.premium ||= Boolean(wallet.premium);
      current.nzrPoints += numeric(wallet.nzrPoints);
      for (const walletId of wallet.walletIds || []) if (!current.walletIds.some((item) => String(item) === String(walletId))) current.walletIds.push(walletId);
      users.set(id, current);
    }
    const items = [...users.values()].sort((first, second) => second.nzrPoints - first.nzrPoints);
    return Response.json({ items, totalElements: items.length, totalPages: 1, updatedAt: new Date().toISOString() }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" },
    });
  } catch {
    return Response.json({ error: "Wallet API is unavailable" }, { status: 503 });
  }
}
