"use client";

import { useEffect, useMemo, useState } from "react";

type NavItem = "Огляд" | "Користувачі" | "Фінанси" | "Підтримка" | "Команда";

const navigation: NavItem[] = ["Огляд", "Користувачі", "Фінанси", "Підтримка", "Команда"];

const metrics = [
  { label: "Загальна комісія", value: "$84,291.40", change: "+12.8%", icon: "◈", tone: "mint" },
  { label: "Комісія за липень", value: "$9,847.22", change: "+8.4%", icon: "↗", tone: "blue" },
  { label: "Дохід Telegram Stars", value: "1,284,750", change: "+18.2%", icon: "★", tone: "violet" },
  { label: "Активні користувачі", value: "8,426", change: "+6.1%", icon: "◉", tone: "orange" },
];

const team = [
  { name: "Олексій Коваль", initials: "ОК", role: "Senior Support", rating: "4.98", chats: 148, status: "В чаті" },
  { name: "Марія Вовк", initials: "МВ", role: "Support Manager", rating: "4.93", chats: 126, status: "В чаті" },
  { name: "Анна Романюк", initials: "АР", role: "Support", rating: "4.88", chats: 92, status: "Перерва" },
];

export default function Home() {
  const [active, setActive] = useState<NavItem>("Огляд");
  const [period, setPeriod] = useState("30 днів");
  const [updated, setUpdated] = useState("Оновлено щойно");
  const [notice, setNotice] = useState<string | null>(null);
  const [authState, setAuthState] = useState<"checking" | "signed_out" | "signed_in">("checking");
  const [viewerName, setViewerName] = useState("Nazar");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const chartPath = useMemo(() => "M0 176 C28 168 36 139 62 150 S100 126 122 135 S154 83 184 107 S226 117 248 82 S283 58 305 74 S342 45 372 65 S406 23 438 41 S482 27 510 18", []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!supabaseUrl || !supabaseKey) {
        setAuthState("signed_out");
        return;
      }
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const redirectedToken = fragment.get("access_token");
      const accessToken = redirectedToken || window.sessionStorage.getItem("nezaria_access_token");
      if (!accessToken) {
        setAuthState("signed_out");
        return;
      }
      if (redirectedToken) {
        window.sessionStorage.setItem("nezaria_access_token", redirectedToken);
        window.history.replaceState(null, "", window.location.pathname);
      }
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error("Session expired");
        const user = await response.json();
        setViewerName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Користувач");
        setAuthState("signed_in");
      } catch {
        window.sessionStorage.removeItem("nezaria_access_token");
        setAuthState("signed_out");
      }
    };
    void restoreSession();
  }, [supabaseKey, supabaseUrl]);

  const refresh = () => {
    setUpdated("Дані синхронізовано щойно");
    setNotice("Метрики оновлено з Nezaria API");
    window.setTimeout(() => setNotice(null), 2600);
  };

  const signInWithGoogle = () => {
    if (!supabaseUrl) {
      setNotice("Підключення до авторизації ще налаштовується");
      return;
    }
    const redirectTo = encodeURIComponent(window.location.origin);
    window.location.assign(`${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`);
  };

  if (authState !== "signed_in") {
    return <AuthScreen checking={authState === "checking"} onGoogleSignIn={signInWithGoogle} />;
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">N</span><span>nezaria<span className="brand-light">.wallet</span></span></div>
        <div className="workspace"><span className="workspace-dot" /> NEZARIA ADMIN <span className="chevron">⌄</span></div>
        <nav aria-label="Головна навігація">
          {navigation.map((item, index) => (
            <button key={item} onClick={() => setActive(item)} className={`nav-item ${active === item ? "active" : ""}`}>
              <span className="nav-icon">{["▦", "◎", "◌", "◍", "◫"][index]}</span>{item}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><span className="nav-icon">◐</span>Налаштування</button>
          <div className="profile"><div className="avatar owner">NK</div><div><strong>Nazar K.</strong><small>Власник</small></div><span>•••</span></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="crumb"><span>Nezaria Wallet</span><b>/</b><strong>{active}</strong></div>
          <div className="top-actions"><button className="icon-button" aria-label="Сповіщення">◔<i /></button><button className="help">?</button><button className="avatar owner" aria-label="Профіль">NK</button></div>
        </header>

        <div className="dashboard">
          <section className="heading-row">
            <div><p className="eyebrow">ОПЕРАЦІЙНА ПАНЕЛЬ</p><h1>Доброго дня, Nazar <span>✦</span></h1><p className="subtle">{updated} · Дані Nezaria Wallet</p></div>
            <div className="header-controls"><div className="segmented"><button className={period === "7 днів" ? "selected" : ""} onClick={() => setPeriod("7 днів")}>7 днів</button><button className={period === "30 днів" ? "selected" : ""} onClick={() => setPeriod("30 днів")}>30 днів</button><button className={period === "Рік" ? "selected" : ""} onClick={() => setPeriod("Рік")}>Рік</button></div><button className="sync" onClick={refresh}>↻ Синхронізувати</button></div>
          </section>

          <section className="metrics-grid">
            {metrics.map((metric) => <article className="metric-card" key={metric.label}><div className={`metric-icon ${metric.tone}`}>{metric.icon}</div><p>{metric.label}</p><div className="metric-value">{metric.value}</div><span className="increase">↑ {metric.change} <em>до минулого періоду</em></span></article>)}
          </section>

          <section className="main-grid">
            <article className="panel earnings-panel"><div className="panel-head"><div><p className="panel-label">ЗАРОБІТОК</p><h2>Дохід та комісії</h2></div><button className="dots">•••</button></div><div className="chart-summary"><strong>$18,730.60</strong><span className="increase">↑ 16.4%</span></div><div className="chart-wrap"><div className="chart-lines"><span /><span /><span /><span /></div><svg viewBox="0 0 510 205" aria-label="Графік доходу за період" role="img"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#42e8bd" stopOpacity=".28"/><stop offset="100%" stopColor="#42e8bd" stopOpacity="0"/></linearGradient></defs><path d={`${chartPath} L510 205 L0 205 Z`} fill="url(#fill)"/><path d={chartPath} fill="none" stroke="#42e8bd" strokeLinecap="round" strokeWidth="3"/><circle cx="372" cy="65" r="5" fill="#101719" stroke="#42e8bd" strokeWidth="3"/></svg><div className="x-axis"><span>01 лип</span><span>08 лип</span><span>15 лип</span><span>22 лип</span><span>Сьогодні</span></div></div></article>
            <article className="panel activity-panel"><div className="panel-head"><div><p className="panel-label">ЖИВА АКТИВНІСТЬ</p><h2>Зараз у гаманці</h2></div><span className="live"><i /> LIVE</span></div><div className="live-count">1,284<span> онлайн</span></div><div className="activity-bars">{[45, 72, 52, 89, 60, 96, 77, 48, 69, 87, 65, 92, 75, 50, 71, 86, 59, 76, 94, 80, 65, 90, 72, 83].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className="legend"><span><i className="mint-dot" /> Нові сесії</span><span><i className="gray-dot" /> Повернення</span></div></article>
          </section>

          <section className="lower-grid">
            <article className="panel table-panel"><div className="panel-head"><div><p className="panel-label">КОМАНДА ПІДТРИМКИ</p><h2>Ефективність працівників</h2></div><button className="text-button" onClick={() => setActive("Команда")}>Вся команда →</button></div><div className="team-table">{team.map((person) => <div className="team-row" key={person.name}><div className="member"><div className="avatar member-avatar">{person.initials}</div><div><strong>{person.name}</strong><small>{person.role}</small></div></div><div><small>Рейтинг</small><strong className="rating">★ {person.rating}</strong></div><div><small>Чатів</small><strong>{person.chats}</strong></div><span className={`status ${person.status === "В чаті" ? "online" : "break"}`}>{person.status}</span></div>)}</div></article>
            <article className="panel queue-panel"><div className="panel-head"><div><p className="panel-label">ПІДТРИМКА</p><h2>Черга звернень</h2></div><span className="queue-count">12</span></div><div className="queue-stat"><strong>03:42</strong><span>середній час відповіді</span></div><div className="queue-progress"><i /></div><div className="queue-info"><span>8 у роботі</span><span>4 очікують</span></div><button className="open-queue" onClick={() => { setActive("Підтримка"); setNotice("Чергу звернень відкрито"); }}>Відкрити звернення <b>→</b></button></article>
          </section>
        </div>
      </section>
      {notice && <div className="toast">✓ {notice}</div>}
    </main>
  );
}

function AuthScreen({ checking, onGoogleSignIn }: { checking: boolean; onGoogleSignIn: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand"><span className="brand-mark">N</span><span>nezaria<span className="brand-light">.wallet</span></span></div>
        <p className="eyebrow">ЗАХИЩЕНА ОПЕРАЦІЙНА ПАНЕЛЬ</p>
        <h1>Керуйте Nezaria<br /><span>в одному місці.</span></h1>
        <p className="auth-copy">Аналітика гаманця, команда підтримки та фінансові показники доступні лише після авторизації.</p>
        <button className="google-button" onClick={onGoogleSignIn} disabled={checking}>
          <span className="google-mark">G</span>{checking ? "Перевіряємо сесію…" : "Продовжити з Google"}
        </button>
        <p className="auth-footnote">Вхід призначений для власника та авторизованих працівників Nezaria Wallet.</p>
      </section>
      <div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" />
    </main>
  );
}
