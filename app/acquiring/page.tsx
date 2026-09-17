"use client";

import { useEffect, useState } from "react";
import "./acquiring.css";
import "./reference.css";

type View = "register" | "dashboard";

const payments = [
  ["Сьогодні, 14:23", "Оплата замовлення #1287", "420,00 ₴", "•••• 4242"],
  ["Сьогодні, 12:11", "Платіжне посилання", "1 250,00 ₴", "Google Pay"],
  ["Вчора, 21:18", "Оплата замовлення #1286", "2 480,00 ₴", "Apple Pay"],
  ["Вчора, 17:03", "Платіжне посилання", "750,00 ₴", "•••• 7714"],
];

function Mark({ small = false }: { small?: boolean }) {
  return <span className={small ? "pay-mark small" : "pay-mark"}>N</span>;
}

function Icon({ name }: { name: "bolt" | "lock" | "phone" | "info" | "refresh" | "copy" | "shield" }) {
  const paths = {
    bolt: <path d="m13.4 2.8-8 10h5.6l-1 8.4 8.1-11.2h-5.7l1-7.2Z" />,
    lock: <><rect x="4.5" y="10" width="15" height="10" rx="2.3" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></>,
    phone: <><rect x="6.8" y="3" width="10.4" height="18" rx="2" /><path d="M10.5 18h3" /></>,
    info: <><circle cx="12" cy="12" r="9.5" /><path d="M12 10.5v5.5M12 7.4h.01" /></>,
    refresh: <><path d="M19.4 9.3A8 8 0 1 0 20 15" /><path d="M19.5 4.5v5h-5" /></>,
    copy: <><rect x="8" y="4" width="11" height="13" rx="1.5" /><path d="M5 8v11a1.5 1.5 0 0 0 1.5 1.5H15" /></>,
    shield: <><path d="M12 2.8 20 6v5.8c0 4.8-3.4 8.2-8 9.6-4.6-1.4-8-4.8-8-9.6V6l8-3.2Z" /><path d="m8.4 12.1 2.3 2.3 4.9-5" /></>,
  };
  return <svg className={`icon icon-${name}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Qr({ token }: { token: string }) {
  // Keep the payload short so the built-in Wallet camera can recognize it
  // reliably, even on lower-resolution Android cameras.
  const [source, setSource] = useState("");
  useEffect(() => {
    const destination = `nezeriya:pay-connect:${token}`;
    setSource(`https://api.qrserver.com/v1/create-qr-code/?format=svg&size=360x360&margin=12&ecc=H&data=${encodeURIComponent(destination)}`);
  }, [token]);
  return <div className="qr" aria-label="QR-код для підключення">{source && <img style={{ position: "absolute", inset: 13, width: "calc(100% - 26px)", height: "calc(100% - 26px)" }} src={source} alt="Відкрийте Nezeriya Wallet для підключення" />}</div>;
}

export default function AcquiringPage() {
  const [view, setView] = useState<View>("register");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [merchant, setMerchant] = useState("Кав'ярня Nezeriya");

  const makeToken = () => `pay_${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 4)}`;
  const finishConnection = (connectedMerchant: string, confirmedToken: string) => {
    localStorage.setItem("nezeriya_pay_connection", JSON.stringify({ token: confirmedToken, name: connectedMerchant, connectedAt: Date.now() }));
    localStorage.setItem("nezeriya_pay_merchant", connectedMerchant);
    setMerchant(connectedMerchant);
    setView("dashboard");
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const confirmedToken = params.get("pay-connect-confirmed");
    if (confirmedToken) {
      const connectedMerchant = params.get("merchant") || "Кав'ярня Nezeriya";
      finishConnection(connectedMerchant, confirmedToken);
      window.history.replaceState({}, "", "/acquiring");
      return;
    }
    const saved = localStorage.getItem("nezeriya_pay_merchant");
    if (saved) { setMerchant(saved); setView("dashboard"); }
    setToken(makeToken());
    const onConnected = (event: StorageEvent) => {
      if (event.key === "nezeriya_pay_connection") {
        const profile = JSON.parse(event.newValue || "{}");
        const next = profile.name || "Мій бізнес";
        localStorage.setItem("nezeriya_pay_merchant", next);
        setMerchant(next); setView("dashboard");
      }
    };
    window.addEventListener("storage", onConnected);
    return () => window.removeEventListener("storage", onConnected);
  }, []);

  useEffect(() => {
    if (!token || view !== "register") return;
    let active = true;
    const checkConnection = async () => {
      try {
        const response = await fetch(`/api/acquiring/connect?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const result = await response.json() as { connected?: boolean; merchant?: string };
        if (active && result.connected) finishConnection(result.merchant || "Кав'ярня Nezeriya", token);
      } catch { /* Keep polling while the Wallet is completing the request. */ }
    };
    void checkConnection();
    const timer = window.setInterval(() => void checkConnection(), 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, [token, view]);

  const copyId = async () => { await navigator.clipboard?.writeText(token); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const logout = () => { localStorage.removeItem("nezeriya_pay_merchant"); localStorage.removeItem("nezeriya_pay_connection"); setToken(makeToken()); setView("register"); };

  if (view === "dashboard") return <main className="pay-app dashboard">
    <aside className="pay-sidebar"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="merchant"><Mark small /><span><b>{merchant}</b><small>ID 537829</small></span></div>
      <nav>{[["⌂", "Головна"], ["＋", "Створити платіж"], ["↗", "Платіжні посилання"], ["◷", "Історія платежів"], ["▥", "Статистика"], ["⚙", "Налаштування"]].map(([symbol, label], index) => <button className={index === 0 ? "active" : ""} key={label}><i>{symbol}</i>{label}</button>)}</nav><button className="sign-out" onClick={logout}>Вийти з акаунта</button></aside>
    <section className="pay-content"><header><span>Середа, 17 вересня</span><button className="bell">♧<em>2</em></button><div className="user"><Mark small /><b>{merchant}</b></div></header>
      <section className="balance-card"><p>Баланс еквайрингу <i>i</i></p><h1>48 320,50 ₴</h1><div className="currencies"><button className="chosen">Усі</button><button>Гривня</button><button>Долар</button><button>Євро</button></div><button className="withdraw">Вивести кошти</button></section>
      <section className="payments-card"><div className="section-title"><h2>Останні платежі</h2><button>Усі платежі ›</button></div><div className="payment-table"><div className="table-head"><span>Дата і час</span><span>Опис</span><span>Сума</span><span>Статус</span><span>Спосіб оплати</span></div>{payments.map(row => <div className="payment-row" key={row[1] + row[0]}><span>{row[0]}</span><span>{row[1]}</span><b>{row[2]}</b><span className="paid">✓ Оплачено</span><span>{row[3]}</span></div>)}</div></section>
      <section className="quick-actions"><article><span className="action-icon">↗</span><div><b>Створити платіжне посилання</b><small>Надішліть посилання та отримайте оплату від клієнта</small></div><button>Створити</button></article><article><span className="action-icon">▦</span><div><b>Отримати оплату на пристрої</b><small>Покажіть QR-код для оплати</small></div><button>Показати QR</button></article></section>
    </section>
  </main>;

  return <main className="pay-app register"><section className="register-promo"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="promo-center"><h1>Реєстрація<br />стала простіше</h1><p>Безпечна реєстрація через застосунок Nezeriya Wallet.</p><div className="benefits"><span><i><Icon name="bolt" /></i><b>Швидко<small>Усього кілька секунд<br />у застосунку</small></b></span><span><i><Icon name="lock" /></i><b>Безпечно<small>Ваші дані під надійним<br />захистом</small></b></span><span><i><Icon name="phone" /></i><b>Через Nezeriya Wallet<small>Реєстрація в офіційному<br />застосунку</small></b></span></div></div><div className="decorative-cards"><div className="decorative-card card-back" /><div className="decorative-card card-front"><span className="card-chip" /></div></div><footer>NEZERIYA PAY —<br />більше можливостей щодня.</footer></section>
    <section className="register-card"><div className="register-content"><h2>Реєстрація акаунта</h2><p className="subtitle">Nezeriya Pay</p><h3>Персональний QR-код для реєстрації</h3><p className="hint">Відскануйте QR-код у застосунку Nezeriya Wallet,<br />щоб зареєструватися.</p><Qr token={token} /><div className="notice"><Icon name="info" /><span>QR-код одноразовий та прив’язаний до вашої сесії.<br />Після успішної реєстрації він стане неактивним.</span></div><div className="qr-controls"><button onClick={() => setToken(makeToken)}><Icon name="refresh" /><span>Оновити QR</span></button></div><div className="request-row"><p className="request-id">ID запиту: {token}</p><button aria-label="Копіювати ID запиту" onClick={copyId}>{copied ? "✓" : <Icon name="copy" />}</button></div><div className="secure"><Icon name="shield" /><span>Реєстрація захищена сучасними технологіями шифрування.<br />Ваші дані залишаються тільки у вашому гаманці.</span></div></div></section>
  </main>;
}
