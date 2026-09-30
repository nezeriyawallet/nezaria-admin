"use client";

import { TonConnectButton, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { useState } from "react";

export function ExternalWalletPayment({ linkId, currency }: { linkId: string; currency: "USDT" | "GRAM" }) {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const pay = async () => {
    if (!wallet) { tonConnectUI.openModal(); return; }
    setSending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/acquiring/payment-link/${encodeURIComponent(linkId)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: wallet.account.address, currency })
      });
      const transaction = await response.json().catch(() => ({}));
      if (!response.ok || !transaction.validUntil || !Array.isArray(transaction.messages)) throw new Error(transaction.error || "Не вдалося підготувати платіж");
      await tonConnectUI.sendTransaction(transaction);
      setMessage("Переказ надіслано в мережу. Після підтвердження чек буде створено автоматично — сторінка оновиться сама.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Платіж не виконано");
    } finally { setSending(false); }
  };

  return <section className="pay-tonconnect">
    <div><b>Оплата з іншого TON-гаманця</b><span>Підключіть гаманець — {currency}, адреса та сума будуть сформовані автоматично.</span></div>
    <TonConnectButton />
    <button className="pay-primary" disabled={sending} onClick={() => void pay()}>{sending ? "Готуємо платіж…" : wallet ? `Оплатити ${currency}` : "Підключити гаманець"}</button>
    {message ? <p className="pay-tonconnect-message">{message}</p> : null}
  </section>;
}
