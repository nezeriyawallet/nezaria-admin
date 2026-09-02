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
  initDataUnsafe?: { user?: TelegramUser };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const navigation = [
  { id: "home", label: "Main", icon: "◆" },
  { id: "games", label: "Games", icon: "●" },
  { id: "apps", label: "Apps", icon: "▲" },
  { id: "settings", label: "Settings", icon: "⚙" },
] as const;

type Screen = (typeof navigation)[number]["id"];

export default function MiniAppPage() {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(true);

  useEffect(() => {
    const applyTelegramProfile = () => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp) return;
      webApp.ready?.();
      webApp.expand?.();
      webApp.setHeaderColor?.("#102d42");
      webApp.setBackgroundColor?.("#102d42");
      setTelegramUser(webApp.initDataUnsafe?.user ?? null);
    };

    applyTelegramProfile();
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = applyTelegramProfile;
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

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

  return (
    <main className="mini-app">
      <div className="mini-glow mini-glow-top" />
      <div className="mini-glow mini-glow-bottom" />

      {screen === "home" ? (
        <section className="mini-home" aria-label="Головна сторінка">
          <div className="mini-spacer" />
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
              <strong>0</strong>
            </span>
            <button className="add-button" type="button" onClick={() => window.Telegram?.WebApp?.ready?.()}>
              Add
            </button>
          </article>
        </section>
      ) : screen === "settings" ? (
        <section className="settings-page" aria-label="Налаштування">
          <button className="back-button" type="button" onClick={() => setScreen("home")}>‹</button>
          <p className="section-kicker">NEX APPS</p>
          <h1>Settings</h1>
          <p className="settings-subtitle">Керуйте параметрами застосунку</p>
          <div className="settings-group">
            <div className="settings-row profile-row">
              {profile.photoUrl ? <img src={profile.photoUrl} alt="" className="tiny-avatar" /> : <span className="tiny-avatar">{initials || "N"}</span>}
              <span><b>{profile.displayName}</b><small>{profile.username}</small></span>
            </div>
            <button className="settings-row" type="button"><span>◉</span><span>Language</span><em>English ›</em></button>
            <label className="settings-row"><span>♧</span><span>Notifications</span><input aria-label="Notifications" type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /></label>
            <label className="settings-row"><span>♪</span><span>Sounds</span><input aria-label="Sounds" type="checkbox" checked={sounds} onChange={(event) => setSounds(event.target.checked)} /></label>
          </div>
          <p className="version">Nex Apps · v1.0</p>
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
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
    </main>
  );
}
