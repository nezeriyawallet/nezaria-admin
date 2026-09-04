import { botToken, callTelegram, ensurePaymentWebhook, verifyMiniAppUser } from "../shared";

export async function POST(request: Request) {
  try {
    const amount = Number((await request.json().catch(() => null) as { amount?: unknown } | null)?.amount);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100_000) return Response.json({ error: "Некоректна кількість Points" }, { status: 400 });

    const token = botToken();
    const identity = await verifyMiniAppUser(request.headers.get("x-telegram-init-data") || "", token);
    if (!identity) return Response.json({ error: "Відкрийте оплату через Telegram" }, { status: 401 });

    await ensurePaymentWebhook(token, request.url);
    const payload = `nex-points:${identity.id}:${amount}:${crypto.randomUUID()}`;
    const invoiceLink = await callTelegram(token, "createInvoiceLink", {
      title: "Nezeriya Wallet Points",
      description: `${amount} Points`,
      payload,
      currency: "XTR",
      prices: [{ label: `${amount} Points`, amount }],
    });
    if (typeof invoiceLink !== "string") throw new Error("Telegram did not return an invoice link");
    return Response.json({ invoiceLink });
  } catch (error) {
    console.error("Telegram invoice error", error);
    return Response.json({ error: "Не вдалося підготувати оплату" }, { status: 503 });
  }
}
