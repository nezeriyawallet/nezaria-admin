"use client";

import { useEffect, useMemo, useState } from "react";
import "./miniapp.css";

type TelegramUser = {
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  initData?: string;
  initDataUnsafe?: { user?: TelegramUser };
  openInvoice?: (url: string, callback?: (status: string) => void) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const navigation = [
  { id: "home", label: "Main", icon: "home" },
  { id: "games", label: "Games", icon: "games" },
  { id: "apps", label: "Apps", icon: "apps" },
  { id: "settings", label: "Settings", icon: "settings" },
] as const;

type Screen = (typeof navigation)[number]["id"];

export default function MiniAppPage() {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [search, setSearch] = useState("");
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [points, setPoints] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    const applyTelegramProfile = () => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp) return;
      webApp.ready?.();
      webApp.expand?.();
      webApp.setHeaderColor?.("#102d42");
      webApp.setBackgroundColor?.("#102d42");
      setTelegramUser(webApp.initDataUnsafe?.user ?? null);
      if (webApp.initData) void loadPoints(webApp.initData);
    };

    applyTelegramProfile();
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = applyTelegramProfile;
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  async function loadPoints(initData: string) {
    try {
      const response = await fetch("/api/telegram/points", { headers: { "x-telegram-init-data": initData } });
      if (!response.ok) return;
      const result = await response.json() as { points?: number };
      if (Number.isSafeInteger(result.points) && (result.points || 0) >= 0) setPoints(result.points || 0);
    } catch {
      // The default zero is shown until Telegram and the payment service are ready.
    }
  }

  const profile = useMemo(() => {
    const name = [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ");
    const username = telegramUser?.username ? `@${telegramUser.username}` : "@NexAppsUser";
    const displayName = name || telegramUser?.username || "Nex Apps User";
    return { displayName, username, photoUrl: telegramUser?.photo_url };
  }, [telegramUser]);

  const initials = profile.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function enterDigit(value: string) {
    setPaymentMessage("");
    setAmount((current) => (current.length >= 6 ? current : `${current}${value}`));
  }

  async function startPayment() {
    if (!amount || Number(amount) < 1) {
      setPaymentMessage("Введіть кількість Points");
      return;
    }
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.initData || !webApp.openInvoice) {
      setPaymentMessage("Відкрийте оплату через Telegram");
      return;
    }
    setPaymentLoading(true);
    setPaymentMessage("Готуємо рахунок у Telegram…");
    try {
      const response = await fetch("/api/telegram/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": webApp.initData },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const result = await response.json() as { invoiceLink?: string; error?: string };
      if (!response.ok || !result.invoiceLink) throw new Error(result.error || "Не вдалося створити рахунок");
      webApp.openInvoice(result.invoiceLink, (status) => {
        if (status === "paid") {
          setPaymentMessage("Оплату підтверджено. Points зараховано.");
          void loadPoints(webApp.initData || "");
          return;
        }
        if (status === "cancelled") setPaymentMessage("Оплату скасовано");
      });
    } catch (error) {
      setPaymentMessage(error instanceof Error ? error.message : "Не вдалося відкрити оплату");
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <main className="mini-app">
      <div className="mini-glow mini-glow-top" />
      <div className="mini-glow mini-glow-bottom" />

      {screen === "home" ? (
        <section className="home-search-page" aria-label="Головна сторінка">
          <label className="search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.7" cy="10.7" r="5.8" /><path d="m15.2 15.2 4.2 4.2" /></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" aria-label="Search" />
            <svg className="search-mic" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" /></svg>
          </label>
          <article className="app-result">
            <span className="app-mark">N</span>
            <span className="app-copy"><b>Nex Apps</b><small>The best high-tech bot on Telegram</small></span>
            <button type="button" onClick={() => setScreen("settings")}>Open</button>
          </article>
        </section>
      ) : screen === "settings" ? (
        <section className="mini-home" aria-label="Головна сторінка">
          <article className="profile-card">
            <div className="avatar-wrap" aria-label="Аватар користувача">
              {profile.photoUrl ? (
                // Telegram only supplies this URL in the Mini App context.
                <img src={profile.photoUrl} alt="" className="avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="avatar avatar-fallback">{initials || "N"}</span>
              )}
            </div>
            <h1>{profile.displayName}</h1>
            <p>{profile.username}</p>
          </article>

          <article className="points-card" aria-label="Баланс Points">
            <span className="points-token">✧</span>
            <span className="points-copy">
              <span>Balance Points</span>
              <strong>{points}</strong>
            </span>
            <button className="add-button" type="button" onClick={() => { setAmount(""); setPaymentMessage(""); setTopUpOpen(true); }}>
              Add
            </button>
          </article>
        </section>
      ) : (
        <section className="empty-page" aria-live="polite">
          <span className="empty-icon">{screen === "games" ? "●" : "▲"}</span>
          <h1>{screen === "games" ? "Games" : "Apps"}</h1>
          <p>Coming soon</p>
        </section>
      )}

      <nav className="bottom-nav" aria-label="Навігація застосунку">
        {navigation.map((item) => (
          <button key={item.id} type="button" className={screen === item.id ? "nav-item active" : "nav-item"} onClick={() => setScreen(item.id)}>
            <NavIcon name={item.icon} />
            <small>{item.label}</small>
          </button>
        ))}
      </nav>

      {topUpOpen && (
        <section className="topup-screen" aria-label="Поповнення Points">
          <div className="topup-display">
            <output>{amount || "0"}</output>
            <button type="button" onClick={startPayment} disabled={paymentLoading}>{paymentLoading ? "…" : "Add"}</button>
            {paymentMessage && <p role="status">{paymentMessage}</p>}
          </div>
          <div className="numpad" aria-label="Цифрова клавіатура">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0"].map((key, index) => key ? (
              <button key={key} type="button" onClick={() => enterDigit(key)}><b>{key}</b><small>{index < 9 ? "DEF" : ""}</small></button>
            ) : <span key="space" />)}
            <button type="button" className="backspace" aria-label="Видалити цифру" onClick={() => { setPaymentMessage(""); setAmount((current) => current.slice(0, -1)); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 3 12l6 7h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H9Z" /><path d="m12 9 5 6m0-6-5 6" /></svg>
            </button>
          </div>
          <div className="home-bar" aria-hidden="true" />
        </section>
      )}
    </main>
  );
}

function NavIcon({ name }: { name: (typeof navigation)[number]["icon"] }) {
  if (name === "home") return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 8 8-8 8-8-8 8-8Z" /><path d="M12 3.2v16" opacity=".28" /></svg>;
  if (name === "games") return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><circle cx="8" cy="16" r="3" /><circle cx="16" cy="16" r="3" /></svg>;
  if (name === "apps") return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 7.3 13H4.7L12 4Z" /></svg>;
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm0-5.2 1.1 2.3 2.5.5 1.8-1.7 2.4 2.4-1.7 1.8.5 2.5 2.3 1.1v3.4l-2.3 1.1-.5 2.5 1.7 1.8-2.4 2.4-1.8-1.7-2.5.5L12 21l-1.1-2.3-2.5-.5-1.8 1.7-2.4-2.4 1.7-1.8-.5-2.5L3.1 12v-3.4l2.3-1.1.5-2.5-1.7-1.8 2.4-2.4 1.8 1.7 2.5-.5L12 3Z" /></svg>;
}
