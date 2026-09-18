"use client";

import { useEffect, useState } from "react";
import "./acquiring.css";
import "./reference.css";
import "./dashboard.css";
import "./fullscreen.css";
import "./businesses.css";
import "./businesses-heading.css";
import "./logout-dialog.css";

type View = "register" | "dashboard";

function Mark({ small = false, label = "N" }: { small?: boolean; label?: string }) {
  return <span className={small ? "pay-mark small" : "pay-mark"}>{label.slice(0, 1).toUpperCase()}</span>;
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
  const [account, setAccount] = useState("Nezeriya Wallet");
  const [businesses, setBusinesses] = useState<string[]>([]);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const makeToken = () => `pay_${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 4)}`;
  const finishConnection = (connectedAccount: string, confirmedToken: string) => {
    localStorage.setItem("nezeriya_pay_connection", JSON.stringify({ token: confirmedToken, name: connectedAccount, connectedAt: Date.now() }));
    localStorage.setItem("nezeriya_pay_account", connectedAccount);
    setAccount(connectedAccount);
    setView("dashboard");
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const confirmedToken = params.get("pay-connect-confirmed");
    if (confirmedToken) {
      const connectedAccount = params.get("account") || params.get("merchant") || "Nezeriya Wallet";
      finishConnection(connectedAccount, confirmedToken);
      window.history.replaceState({}, "", "/acquiring");
      return;
    }
    const saved = localStorage.getItem("nezeriya_pay_account");
    if (saved) { setAccount(saved); setView("dashboard"); }
    try { setBusinesses(JSON.parse(localStorage.getItem("nezeriya_pay_businesses") || "[]")); } catch { setBusinesses([]); }
    setToken(makeToken());
    const onConnected = (event: StorageEvent) => {
      if (event.key === "nezeriya_pay_connection") {
        const profile = JSON.parse(event.newValue || "{}");
        const next = profile.name || "Nezeriya Wallet";
        localStorage.setItem("nezeriya_pay_account", next);
        setAccount(next); setView("dashboard");
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
        if (active && result.connected) finishConnection(result.merchant || "Nezeriya Wallet", token);
      } catch { /* Keep polling while the Wallet is completing the request. */ }
    };
    void checkConnection();
    const timer = window.setInterval(() => void checkConnection(), 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, [token, view]);

  const copyId = async () => { await navigator.clipboard?.writeText(token); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const addBusiness = () => { const name = window.prompt("Назва бізнесу"); if (!name?.trim()) return; const next = [...businesses, name.trim()]; setBusinesses(next); localStorage.setItem("nezeriya_pay_businesses", JSON.stringify(next)); };
  const logout = () => { localStorage.removeItem("nezeriya_pay_account"); localStorage.removeItem("nezeriya_pay_connection"); setToken(makeToken()); setView("register"); };

  if (view === "dashboard") return <main className="pay-app dashboard">
    <aside className="pay-sidebar"><div className="pay-logo">NEZERIYA <b>PAY</b></div>
      <nav>{[["⌂", "Головна"], ["＋", "Створити платіж"], ["↗", "Платіжні посилання"], ["◷", "Історія платежів"], ["▥", "Статистика"], ["⚙", "Налаштування"]].map(([symbol, label], index) => <button className={index === 0 ? "active" : ""} key={label}><i>{symbol}</i>{label}</button>)}</nav><button className="sign-out" onClick={() => setLogoutOpen(true)}>Вийти з акаунта</button></aside>
    <section className="pay-content"><header><span>Еквайринг Nezeriya Pay</span><button className="bell" aria-label="Сповіщення">♧</button><div className="user"><Mark small label={account} /><span><b>{account}</b><small>Підключено через Wallet</small></span></div></header>
      <section className="balance-card"><p>Доступний баланс <i>i</i></p><h1>0,00 ₴</h1><p className="balance-note">Баланс оновлюється автоматично після зарахування платежу.</p><div className="currencies"><button className="chosen">Усі</button><button>UAH</button><button>USDT</button><button>TON</button></div><button className="withdraw" disabled>Вивести кошти</button></section>
      <section className="businesses-panel">
        <div className="businesses-heading"><h2>Бізнеси</h2></div>
        <div className="business-list">{businesses.map((business) => <article key={business}><span>▣</span><b>{business}</b><small>Мій бізнес</small><em>Прибуток (загалом)<strong>0,00 USDT</strong></em></article>)}<button className="add-business-card" onClick={addBusiness}><span>＋</span><b>Додати бізнес</b><small>Створіть перший профіль еквайрингу</small></button></div>
      </section>
    </section>
    {logoutOpen && <div className="logout-backdrop" role="presentation" onMouseDown={() => setLogoutOpen(false)}><section className="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="logout-title">Вийти з акаунта?</h2><p>Ви зможете підключитися знову через Nezeriya Wallet.</p><div><button className="logout-cancel" onClick={() => setLogoutOpen(false)}>Відхилити</button><button className="logout-confirm" onClick={logout}>Підтвердити</button></div></section></div>}
  </main>;

  return <main className="pay-app register"><section className="register-promo"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="promo-center"><h1>Реєстрація<br />стала простіше</h1><p>Безпечна реєстрація через застосунок Nezeriya Wallet.</p><div className="benefits"><span><i><Icon name="bolt" /></i><b>Швидко<small>Усього кілька секунд<br />у застосунку</small></b></span><span><i><Icon name="lock" /></i><b>Безпечно<small>Ваші дані під надійним<br />захистом</small></b></span><span><i><Icon name="phone" /></i><b>Через Nezeriya Wallet<small>Реєстрація в офіційному<br />застосунку</small></b></span></div></div><div className="decorative-cards"><div className="decorative-card card-back" /><div className="decorative-card card-front"><span className="card-chip" /></div></div><footer>NEZERIYA PAY —<br />більше можливостей щодня.</footer></section>
    <section className="register-card"><div className="register-content"><h2>Реєстрація акаунта</h2><p className="subtitle">Nezeriya Pay</p><h3>Персональний QR-код для реєстрації</h3><p className="hint">Відскануйте QR-код у застосунку Nezeriya Wallet,<br />щоб зареєструватися.</p><Qr token={token} /><div className="notice"><Icon name="info" /><span>QR-код одноразовий та прив’язаний до вашої сесії.<br />Після успішної реєстрації він стане неактивним.</span></div><div className="qr-controls"><button onClick={() => setToken(makeToken)}><Icon name="refresh" /><span>Оновити QR</span></button></div><div className="request-row"><p className="request-id">ID запиту: {token}</p><button aria-label="Копіювати ID запиту" onClick={copyId}>{copied ? "✓" : <Icon name="copy" />}</button></div><div className="secure"><Icon name="shield" /><span>Реєстрація захищена сучасними технологіями шифрування.<br />Ваші дані залишаються тільки у вашому гаманці.</span></div></div></section>
  </main>;
}
