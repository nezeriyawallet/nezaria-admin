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

function Qr({ token }: { token: string }) {
  // The destination is created in the browser so the code always uses this site's live address.
  const [source, setSource] = useState("");
  useEffect(() => {
    const destination = `https://t.me/Nezeriya_Wallet_Bot?start=pay_connect_${encodeURIComponent(token)}`;
    setSource(`https://api.qrserver.com/v1/create-qr-code/?format=svg&size=360x360&margin=8&data=${encodeURIComponent(destination)}`);
  }, [token]);
  return <div className="qr" aria-label="QR-код для підключення">{source && <img style={{ position: "absolute", inset: 13, width: "calc(100% - 26px)", height: "calc(100% - 26px)" }} src={source} alt="Відкрийте Nezeriya Wallet для підключення" />}<Mark small /></div>;
}

export default function AcquiringPage() {
  const [view, setView] = useState<View>("register");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [merchant, setMerchant] = useState("Кав'ярня Nezeriya");

  const makeToken = () => `pay_${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 4)}`;
  useEffect(() => {
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

  const copyId = async () => { await navigator.clipboard?.writeText(token); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const logout = () => { localStorage.removeItem("nezeriya_pay_merchant"); localStorage.removeItem("nezeriya_pay_connection"); setToken(makeToken()); setView("register"); };

  if (view === "dashboard") return <main className="pay-app dashboard">
    <aside className="pay-sidebar"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="merchant"><Mark small /><span><b>{merchant}</b><small>ID 537829</small></span></div>
      <nav>{[["⌂", "Головна"], ["＋", "Створити платіж"], ["↗", "Платіжні посилання"], ["◷", "Історія платежів"], ["▥", "Статистика"], ["⚙", "Налаштування"]].map(([icon, label], i => <button className={i === 0 ? "active" : ""} key={label}><i>{icon}</i>{label}</button>))}</nav><button className="sign-out" onClick={logout}>Вийти з акаунта</button></aside>
    <section className="pay-content"><header><span>Середа, 17 вересня</span><button className="bell">♧<em>2</em></button><div className="user"><Mark small /><b>{merchant}</b></div></header>
      <section className="balance-card"><p>Баланс еквайрингу <i>i</i></p><h1>48 320,50 ₴</h1><div className="currencies"><button className="chosen">Усі</button><button>Гривня</button><button>Долар</button><button>Євро</button></div><button className="withdraw">Вивести кошти</button></section>
      <section className="payments-card"><div className="section-title"><h2>Останні платежі</h2><button>Усі платежі ›</button></div><div className="payment-table"><div className="table-head"><span>Дата і час</span><span>Опис</span><span>Сума</span><span>Статус</span><span>Спосіб оплати</span></div>{payments.map(row => <div className="payment-row" key={row[1] + row[0]}><span>{row[0]}</span><span>{row[1]}</span><b>{row[2]}</b><span className="paid">✓ Оплачено</span><span>{row[3]}</span></div>)}</div></section>
      <section className="quick-actions"><article><span className="action-icon">↗</span><div><b>Створити платіжне посилання</b><small>Надішліть посилання та отримайте оплату від клієнта</small></div><button>Створити</button></article><article><span className="action-icon">▦</span><div><b>Отримати оплату на пристрої</b><small>Покажіть QR-код для оплати</small></div><button>Показати QR</button></article></section>
    </section>
  </main>;

  return <main className="pay-app register"><section className="register-promo"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="promo-center"><h1>Реєстрація<br />стала простіше</h1><p>Безпечна реєстрація через застосунок Nezeriya Wallet.</p><div className="benefits"><span><i>ϟ</i><b>Швидко<small>Усього кілька секунд<br />у застосунку</small></b></span><span><i>♧</i><b>Безпечно<small>Ваші дані під надійним<br />захистом</small></b></span><span><i>▯</i><b>Через Nezeriya Wallet<small>Реєстрація в офіційному<br />застосунку</small></b></span></div></div><div className="promo-card"><span /><span /><span /></div><footer>NEZERIYA PAY —<br />більше можливостей щодня.</footer></section>
    <section className="register-card"><h2>Реєстрація акаунта</h2><p className="subtitle">Nezeriya Pay</p><h3>Персональний QR-код для реєстрації</h3><p className="hint">Відскануйте QR-код у застосунку Nezeriya Wallet,<br />щоб зареєструватися.</p><Qr token={token} /><div className="notice"><b>ⓘ</b><span>QR-код одноразовий та прив’язаний до вашої сесії.<br />Після успішної реєстрації він стане неактивним.</span></div><div className="qr-controls"><button onClick={() => setToken(makeToken)}>⟳ <span>Оновити QR</span></button></div><div className="request-row"><p className="request-id">ID запиту: {token}</p><button aria-label="Копіювати ID запиту" onClick={copyId}>{copied ? "✓" : "▢"}</button></div><div className="secure">♢ <span>Реєстрація захищена сучасними технологіями шифрування.<br />Ваші дані залишаються тільки у вашому гаманці.</span></div></section>
  </main>;
}
