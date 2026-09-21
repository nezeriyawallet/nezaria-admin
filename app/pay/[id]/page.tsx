"use client";

import { useEffect, useMemo, useState } from "react";
import "../payment.css";

type Line = { name: string; quantity: number; price: string; currency?: string; photo?: string };
type PaymentLink = {
  id: string; title: string; amount: string; currency: "USDT" | "GRAM"; products: Line[];
  message: string; status: "Активне" | "Оплачено" | "Прострочено"; expiresAt: string;
};
type PaymentData = {
  link: PaymentLink;
  business: { name: string; logo?: string };
  recipient: string;
  walletUrl: string;
};

const money = (value: string, currency: string) => `${Number(value || 0).toFixed(2)} ${currency}`;
const expiry = (value: string) => new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function PublicPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<PaymentData | null>(null);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState<"order" | "wallet" | "copied">("order");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { id } = await params;
      const response = await fetch(`/api/acquiring/payment-link/${id}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!alive) return;
      if (!response.ok) setError(body.error || "Посилання недійсне");
      else {
        setData(body);
        setError("");
      }
    };
    void load();
    const poll = window.setInterval(() => void load(), 5000);
    return () => { alive = false; window.clearInterval(poll); };
  }, [params]);

  const qrUrl = useMemo(() => data ? `https://api.qrserver.com/v1/create-qr-code/?format=svg&size=260x260&margin=8&data=${encodeURIComponent(data.walletUrl)}` : "", [data]);
  const openWallet = () => {
    if (!data) return;
    setScreen("wallet");
    window.location.assign(data.walletUrl);
  };
  const copy = async (value: string) => {
    await navigator.clipboard?.writeText(value);
    setScreen("copied");
    window.setTimeout(() => setScreen("wallet"), 1300);
  };

  if (error) return <PaymentState kind="error" title="Посилання недійсне" description={error} />;
  if (!data) return <main className="pay-shell"><section className="pay-card pay-loading">Завантаження платіжного посилання…</section></main>;
  const { link, business } = data;
  if (link.status === "Прострочено") return <PaymentState kind="expired" title="Посилання більше не діє" description="Час дії посилання минув. Попросіть магазин надіслати нове." link={link} />;
  if (link.status === "Оплачено") return <PaymentState kind="success" title="Оплата пройшла" description={link.message || "Дякуємо за замовлення!"} link={link} />;

  if (screen === "wallet" || screen === "copied") return <main className="pay-shell"><section className="pay-card">
    <PaymentHeader business={business} />
    <button className="pay-back" onClick={() => setScreen("order")} aria-label="Назад">‹</button>
    <h1 className="pay-title center">Оплата</h1>
    <div className="pay-amount-card"><span>До сплати</span><strong>{money(link.amount, link.currency)}</strong><small>Посилання {link.id}</small></div>
    <a className="pay-primary" href={data.walletUrl} onClick={() => setScreen("wallet")}>▣&nbsp; Оплатити в Nezeriya Wallet</a>
    <p className="pay-or">або відскануйте QR-код у гаманці</p>
    <div className="pay-qr"><img src={qrUrl} alt="QR-код для оплати в Nezeriya Wallet" /></div>
    <div className="pay-address"><div><span>Адреса отримувача</span><code>{data.recipient || "Гаманець магазину ще не підключено"}</code><small>Memo: {link.id}</small></div><button onClick={() => void copy(data.recipient)}>⧉</button></div>
    {screen === "copied" ? <p className="pay-copy-note">Адресу скопійовано</p> : <p className="pay-wait">Очікуємо оплату. Сторінка оновиться автоматично.</p>}
  </section></main>;

  return <main className="pay-shell"><section className="pay-card">
    <PaymentHeader business={business} />
    <div className="pay-message"><span>Повідомлення від магазину</span><b>{link.message || "Дякуємо за замовлення!"}</b></div>
    <h1 className="pay-section-title">Ваше замовлення</h1>
    <div className="pay-items">{link.products.length ? link.products.map((item, index) => <div className="pay-item" key={`${item.name}-${index}`}>
      {item.photo ? <img src={item.photo} alt="" /> : <div className="pay-item-placeholder">◻</div>}
      <div><b>{item.name}</b><span>× {item.quantity}</span></div><strong>{money((Number(item.price) * item.quantity).toString(), link.currency)}</strong>
    </div>) : <div className="pay-item"><div><b>{link.title}</b><span>Платіжне посилання</span></div><strong>{money(link.amount, link.currency)}</strong></div>}</div>
    <div className="pay-total"><span>Разом</span><strong>{money(link.amount, link.currency)}</strong></div>
    <div className="pay-assets"><span>Оплатити в</span><div><b>{link.currency}</b><span>{link.currency === "USDT" ? "GRAM" : "USDT"}</span></div></div>
    <p className="pay-expiry">◷ Діє до {expiry(link.expiresAt)}</p>
    <button className="pay-primary" onClick={openWallet}>Перейти до оплати</button>
    <p className="pay-footnote">Оплата відбувається в Nezeriya Wallet</p>
  </section></main>;
}

function PaymentHeader({ business }: { business: PaymentData["business"] }) {
  return <header className="pay-header">{business.logo ? <img src={business.logo} alt="" /> : <div className="pay-business-icon">▣</div>}<div><b>{business.name}</b><span>Платіжне посилання</span></div></header>;
}

function PaymentState({ kind, title, description, link }: { kind: "error" | "expired" | "success"; title: string; description: string; link?: PaymentLink }) {
  return <main className="pay-shell"><section className="pay-card pay-state"><div className={`pay-state-icon ${kind}`}>{kind === "success" ? "✓" : kind === "expired" ? "◷" : "!"}</div><h1>{title}</h1>{link && kind === "success" ? <strong className="pay-state-amount">{money(link.amount, link.currency)}</strong> : null}<p>{description}</p>{link ? <div className="pay-state-info"><span>Посилання <b>{link.id}</b></span><span>{kind === "success" ? `Оплачено ${expiry(new Date().toISOString())}` : `Діяло до ${expiry(link.expiresAt)}`}</span></div> : null}<button className="pay-close" onClick={() => history.back()}>Закрити</button></section></main>;
}
