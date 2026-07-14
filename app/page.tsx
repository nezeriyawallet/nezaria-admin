"use client";

import { useEffect, useMemo, useState } from "react";

type NavItem = "Огляд" | "Користувачі" | "Фінанси" | "Підтримка" | "Команда" | "Працівники";
type AccessRole = "owner" | "worker" | null;
type WorkerApplication = {
  id: string;
  full_name: string;
  city: string;
  age: number;
  phone: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  photo_url: string | null;
  face_photo_url: string | null;
};
type EmployeeReview = { id: string; client_name: string; rating: number; comment: string; created_at: string };
type EmployeeProfile = {
  id: string; full_name: string; city: string; age: number; phone: string; created_at: string;
  avatar_url: string | null; reviews: EmployeeReview[];
};
type WalletMetrics = Record<string, string | number | null>;

const navigation: NavItem[] = ["Огляд", "Користувачі", "Фінанси", "Підтримка", "Команда", "Працівники"];

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

function displayMetric(value: string | number | null | undefined, prefix = "") {
  if (value === null || value === undefined || value === "") return "—";
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? `${prefix}${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(number)}` : `${prefix}${value}`;
}

export default function Home() {
  const [active, setActive] = useState<NavItem>("Огляд");
  const [period, setPeriod] = useState("30 днів");
  const [updated, setUpdated] = useState("Оновлено щойно");
  const [notice, setNotice] = useState<string | null>(null);
  const [authState, setAuthState] = useState<"checking" | "signed_out" | "signed_in">("checking");
  const [viewerName, setViewerName] = useState("Nazar");
  const [viewerId, setViewerId] = useState("");
  const [accessRole, setAccessRole] = useState<AccessRole>(null);
  const [walletMetrics, setWalletMetrics] = useState<WalletMetrics | null>(null);
  const [metricsError, setMetricsError] = useState("");
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
        setViewerId(user.id);
        const savedRole = window.sessionStorage.getItem("nezeriya_access_role");
        const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
        setAccessRole(savedRole === "owner" && !ownerSession ? null : savedRole === "owner" || savedRole === "worker" ? savedRole : null);
        setAuthState("signed_in");
      } catch {
        window.sessionStorage.removeItem("nezaria_access_token");
        setAuthState("signed_out");
      }
    };
    void restoreSession();
  }, [supabaseKey, supabaseUrl]);

  useEffect(() => {
    if (accessRole !== "owner") return;
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    void fetch("/api/owner/metrics", { headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession } })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (ok) { setWalletMetrics(body.metrics || {}); setMetricsError(""); }
        else setMetricsError(body.error || "Статистика тимчасово недоступна");
      })
      .catch(() => setMetricsError("Статистика тимчасово недоступна"));
  }, [accessRole]);

  const refresh = () => {
    setUpdated("Дані синхронізовано щойно");
    setNotice("Метрики оновлено з Nezeriya API");
    window.setTimeout(() => setNotice(null), 2600);
  };

  const dashboardMetrics = walletMetrics ? [
    { label: "Загальна комісія", value: displayMetric(walletMetrics.totalCommission, "$"), change: "live", icon: "◈", tone: "mint" },
    { label: "Комісія за місяць", value: displayMetric(walletMetrics.monthlyCommission, "$"), change: "live", icon: "↗", tone: "blue" },
    { label: "Дохід Telegram Stars", value: displayMetric(walletMetrics.monthlyStars), change: "live", icon: "★", tone: "violet" },
    { label: "Зареєстровані користувачі", value: displayMetric(walletMetrics.users), change: "live", icon: "◉", tone: "orange" },
  ] : metrics;

  const signInWithGoogle = () => {
    if (!supabaseUrl) {
      setNotice("Підключення до авторизації ще налаштовується");
      return;
    }
    const redirectTo = encodeURIComponent(window.location.origin);
    window.location.assign(`${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`);
  };

  const verifyOwnerCode = async (code: string) => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    if (!token) return false;
    const response = await fetch("/api/owner/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) return false;
    const result = await response.json();
    if (typeof result.ownerSession !== "string") return false;
    window.sessionStorage.setItem("nezeriya_owner_session", result.ownerSession);
    window.sessionStorage.setItem("nezeriya_access_role", "owner");
    setAccessRole("owner");
    return true;
  };

  const selectWorker = () => {
    window.sessionStorage.setItem("nezeriya_access_role", "worker");
    setAccessRole("worker");
  };

  const submitWorkerApplication = async (application: { full_name: string; city: string; age: number; phone: string }, document: File, facePhoto: File) => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    if (!token || !supabaseUrl || !supabaseKey || !viewerId) return { ok: false, message: "Не вдалося перевірити ваш вхід. Увійдіть ще раз." };
    if ([document, facePhoto].some((file) => !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)) {
      return { ok: false, message: "Додайте фото документа у форматі JPG, PNG або WEBP до 8 МБ." };
    }
    const uploadPhoto = async (file: File, prefix: string) => {
      const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      const path = `${viewerId}/${prefix}-${crypto.randomUUID()}.${extension}`;
      const upload = await fetch(`${supabaseUrl}/storage/v1/object/worker-documents/${path}`, {
        method: "POST",
        headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, "Content-Type": file.type, "x-upsert": "false" },
        body: file,
      });
      return upload.ok ? path : null;
    };
    const [documentPath, facePhotoPath] = await Promise.all([uploadPhoto(document, "document"), uploadPhoto(facePhoto, "face")]);
    if (!documentPath || !facePhotoPath) return { ok: false, message: "Не вдалося завантажити фото. Спробуйте ще раз." };
    const response = await fetch(`${supabaseUrl}/rest/v1/worker_applications`, {
      method: "POST",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ ...application, document_note: documentPath, face_photo_path: facePhotoPath, personal_data_consent_at: new Date().toISOString(), user_id: viewerId }),
    });
    if (response.ok) return { ok: true, message: "Заявку надіслано власнику." };
    if (response.status === 409) {
      const retry = await fetch(`${supabaseUrl}/rest/v1/worker_applications?user_id=eq.${encodeURIComponent(viewerId)}&status=eq.rejected`, {
        method: "PATCH",
        headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ ...application, document_note: documentPath, face_photo_path: facePhotoPath, personal_data_consent_at: new Date().toISOString(), status: "pending" }),
      });
      if (retry.ok) return { ok: true, message: "Оновлену заявку надіслано власнику повторно." };
      return { ok: false, message: "Заявка вже розглядається або ви вже прийняті до команди." };
    }
    return { ok: false, message: "Не вдалося надіслати заявку. Спробуйте ще раз." };
  };

  const getWorkerApplicationStatus = async () => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    if (!token || !supabaseUrl || !supabaseKey || !viewerId) return null;
    const response = await fetch(`${supabaseUrl}/rest/v1/worker_applications?user_id=eq.${encodeURIComponent(viewerId)}&select=status&limit=1`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const rows = await response.json() as { status?: string }[];
    const status = rows[0]?.status;
    return status === "pending" || status === "approved" || status === "rejected" ? status : null;
  };

  if (authState !== "signed_in") {
    return <AuthScreen checking={authState === "checking"} onGoogleSignIn={signInWithGoogle} />;
  }

  if (!accessRole) {
    return <RoleScreen name={viewerName} onOwnerCode={verifyOwnerCode} onWorker={selectWorker} />;
  }

  if (accessRole === "worker") {
    return <WorkerScreen name={viewerName} onSubmit={submitWorkerApplication} onCheckStatus={getWorkerApplicationStatus} />;
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div>
        <div className="workspace"><span className="workspace-dot" /> NEZERIYA ADMIN <span className="chevron">⌄</span></div>
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

        <div className="dashboard">
          {active === "Команда" ? <ApplicationsPanel /> : active === "Працівники" ? <EmployeesPanel /> : <>
          <section className="heading-row">
            <div><p className="eyebrow">ОПЕРАЦІЙНА ПАНЕЛЬ</p></div>
            <div className="header-controls"><div className="segmented"><button className={period === "7 днів" ? "selected" : ""} onClick={() => setPeriod("7 днів")}>7 днів</button><button className={period === "30 днів" ? "selected" : ""} onClick={() => setPeriod("30 днів")}>30 днів</button><button className={period === "Рік" ? "selected" : ""} onClick={() => setPeriod("Рік")}>Рік</button></div><button className="sync" onClick={refresh}>↻ Синхронізувати</button></div>
          </section>

          <section className="metrics-grid">
            {dashboardMetrics.map((metric) => <article className="metric-card" key={metric.label}><div className={`metric-icon ${metric.tone}`}>{metric.icon}</div><p>{metric.label}</p><div className="metric-value">{metric.value}</div><span className="increase">{metric.change === "live" ? "● LIVE" : <>↑ {metric.change} <em>до минулого періоду</em></>}</span></article>)}
          </section>

          {walletMetrics && <section className="wallet-detail-grid"><article className="panel wallet-detail-panel"><div className="panel-head"><div><p className="panel-label">ОПЕРАЦІЇ ГАМАНЦЯ</p><h2>Детальна статистика</h2></div><span className="live"><i /> LIVE</span></div><div className="wallet-detail-list"><span>Гаманців<strong>{displayMetric(walletMetrics.wallets)}</strong></span><span>Транзакцій<strong>{displayMetric(walletMetrics.transactions)}</strong></span><span>Невдалих транзакцій<strong>{displayMetric(walletMetrics.failedTransactions)}</strong></span><span>DeDust swap<strong>{displayMetric(walletMetrics.dedustSwaps)}</strong></span><span>Реферальний дохід<strong>{displayMetric(walletMetrics.referralTotal, "$")}</strong></span><span>Втрати рулетки<strong>{displayMetric(walletMetrics.wheelLoss, " NZR")}</strong></span></div></article><article className="panel wallet-detail-panel"><div className="panel-head"><div><p className="panel-label">NZR</p><h2>Активність токена</h2></div></div><div className="wallet-detail-list"><span>NZR транзакцій<strong>{displayMetric(walletMetrics.nzrTransactions)}</strong></span><span>Продажі NZR<strong>{displayMetric(walletMetrics.nzrSwapSell)}</strong></span><span>Купівлі NZR<strong>{displayMetric(walletMetrics.nzrSwapBuy)}</strong></span><span>Покупки NZR за Stars<strong>{displayMetric(walletMetrics.nzrStars)}</strong></span></div></article></section>}
          {metricsError && <p className="metrics-error">{metricsError}</p>}

          <section className="main-grid">
            <article className="panel earnings-panel"><div className="panel-head"><div><p className="panel-label">ЗАРОБІТОК</p><h2>Дохід та комісії</h2></div><button className="dots">•••</button></div><div className="chart-summary"><strong>$18,730.60</strong><span className="increase">↑ 16.4%</span></div><div className="chart-wrap"><div className="chart-lines"><span /><span /><span /><span /></div><svg viewBox="0 0 510 205" aria-label="Графік доходу за період" role="img"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#42e8bd" stopOpacity=".28"/><stop offset="100%" stopColor="#42e8bd" stopOpacity="0"/></linearGradient></defs><path d={`${chartPath} L510 205 L0 205 Z`} fill="url(#fill)"/><path d={chartPath} fill="none" stroke="#42e8bd" strokeLinecap="round" strokeWidth="3"/><circle cx="372" cy="65" r="5" fill="#101719" stroke="#42e8bd" strokeWidth="3"/></svg><div className="x-axis"><span>01 лип</span><span>08 лип</span><span>15 лип</span><span>22 лип</span><span>Сьогодні</span></div></div></article>
            <article className="panel activity-panel"><div className="panel-head"><div><p className="panel-label">ЖИВА АКТИВНІСТЬ</p><h2>Зараз у гаманці</h2></div><span className="live"><i /> LIVE</span></div><div className="live-count">1,284<span> онлайн</span></div><div className="activity-bars">{[45, 72, 52, 89, 60, 96, 77, 48, 69, 87, 65, 92, 75, 50, 71, 86, 59, 76, 94, 80, 65, 90, 72, 83].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className="legend"><span><i className="mint-dot" /> Нові сесії</span><span><i className="gray-dot" /> Повернення</span></div></article>
          </section>

          <section className="lower-grid">
            <article className="panel queue-panel"><div className="panel-head"><div><p className="panel-label">ПІДТРИМКА</p><h2>Черга звернень</h2></div><span className="queue-count">12</span></div><div className="queue-stat"><strong>03:42</strong><span>середній час відповіді</span></div><div className="queue-progress"><i /></div><div className="queue-info"><span>8 у роботі</span><span>4 очікують</span></div><button className="open-queue" onClick={() => { setActive("Підтримка"); setNotice("Чергу звернень відкрито"); }}>Відкрити звернення <b>→</b></button></article>
          </section>
          </>}
        </div>
      </section>
      {notice && <div className="toast">✓ {notice}</div>}
    </main>
  );
}

function EmployeesPanel() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<EmployeeProfile | null>(null);

  const loadEmployees = async () => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) { setError("Сесію власника не знайдено. Увійдіть знову як власник."); setLoading(false); return; }
    setLoading(true);
    const response = await fetch("/api/owner/employees", { headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "Не вдалося завантажити працівників.");
    else setEmployees(result.employees || []);
    setLoading(false);
  };

  useEffect(() => { void loadEmployees(); }, []);
  const reviewCount = employees.reduce((total, employee) => total + employee.reviews.length, 0);
  const averageRating = reviewCount ? (employees.reduce((total, employee) => total + employee.reviews.reduce((sum, review) => sum + review.rating, 0), 0) / reviewCount).toFixed(2) : "—";

  return <section className="employees-page">
    <section className="heading-row"><div><p className="eyebrow">ПРАЦІВНИКИ</p><h1>Ефективність <span>команди</span></h1><p className="subtle">Тут відображаються лише працівники, яких ви реально прийняли.</p></div><button className="sync" onClick={() => void loadEmployees()}>↻ Оновити</button></section>
    <section className="employees-summary"><article className="panel"><p>Усього працівників</p><strong>{employees.length}</strong></article><article className="panel"><p>Відгуків клієнтів</p><strong>{reviewCount}</strong></article><article className="panel"><p>Середній рейтинг</p><strong>{averageRating === "—" ? "—" : `${averageRating} ★`}</strong></article><article className="panel"><p>Статус даних</p><strong className="employee-live">LIVE</strong></article></section>
    {loading ? <article className="panel empty-applications">Завантажуємо працівників…</article> : error ? <article className="panel empty-applications">{error}</article> : employees.length === 0 ? <article className="panel empty-applications">Ще немає прийнятих працівників. Приймайте заявки у розділі «Команда».</article> : <article className="panel employees-table-panel"><div className="panel-head"><div><p className="panel-label">КОМАНДА ПІДТРИМКИ</p><h2>Усі працівники</h2></div></div><div className="team-table employees-table">{employees.map((employee) => { const rating = employee.reviews.length ? (employee.reviews.reduce((sum, review) => sum + review.rating, 0) / employee.reviews.length).toFixed(2) : "—"; const initials = employee.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); return <button className="team-row employee-row" key={employee.id} onClick={() => setSelected(employee)}><div className="member"><div className="avatar member-avatar employee-avatar">{employee.avatar_url ? <img src={employee.avatar_url} alt={`Фото ${employee.full_name}`} /> : initials}</div><div><strong>{employee.full_name}</strong><small>{employee.city}</small></div></div><div><small>Рейтинг</small><strong className="rating">{rating === "—" ? "—" : `★ ${rating}`}</strong></div><div><small>Відгуків</small><strong>{employee.reviews.length}</strong></div><span className="status online">Прийнято</span></button>; })}</div></article>}
    {selected && <section className="employee-modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><article className="panel employee-profile" role="dialog" aria-modal="true" aria-label={`Профіль ${selected.full_name}`} onMouseDown={(event) => event.stopPropagation()}><button className="profile-close" onClick={() => setSelected(null)} aria-label="Закрити">×</button><div className="employee-profile-head"><div className="profile-avatar">{selected.avatar_url ? <img src={selected.avatar_url} alt={`Фото ${selected.full_name}`} /> : selected.full_name.slice(0, 1).toUpperCase()}</div><div><p className="panel-label">ПРАЦІВНИК</p><h2>{selected.full_name}</h2><p>{selected.city} · {selected.age} років</p></div></div><div className="employee-info"><span>Телефон<strong>{selected.phone}</strong></span><span>Прийнятий<strong>{new Date(selected.created_at).toLocaleDateString("uk-UA")}</strong></span></div><div className="reviews-head"><h3>Відгуки клієнтів</h3><span>{selected.reviews.length}</span></div>{selected.reviews.length === 0 ? <p className="no-reviews">Відгуків ще немає. Вони з’являться після запуску чатів підтримки та оцінювання діалогів.</p> : <div className="reviews-list">{selected.reviews.map((review) => <article className="review" key={review.id}><div><strong>{review.client_name}</strong><span>{"★".repeat(review.rating)}</span></div><p>{review.comment}</p><small>{new Date(review.created_at).toLocaleDateString("uk-UA")}</small></article>)}</div>}</article></section>}
  </section>;
}

function ApplicationsPanel() {
  const [applications, setApplications] = useState<WorkerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [view, setView] = useState<"active" | "archive">("active");

  const loadApplications = async () => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) {
      setError("Сесію власника не знайдено. Вийдіть і увійдіть знову, обравши роль «Власник».");
      setLoading(false);
      return;
    }
    setLoading(true);
    const response = await fetch("/api/owner/applications", {
      headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "Не вдалося завантажити заявки.");
    else setApplications(result.applications || []);
    setLoading(false);
  };

  useEffect(() => { void loadApplications(); }, []);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    setBusyId(id);
    const response = await fetch("/api/owner/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-owner-session": ownerSession },
      body: JSON.stringify({ id, status }),
    });
    if (!response.ok) setError("Не вдалося оновити заявку. Спробуйте ще раз.");
    else setApplications((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    setBusyId("");
  };

  const removeArchived = async (id: string) => {
    if (!window.confirm("Видалити заявку з архіву назавжди? Фото також буде видалено.")) return;
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    setBusyId(id);
    const response = await fetch("/api/owner/applications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-owner-session": ownerSession },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) setError("Не вдалося видалити заявку.");
    else setApplications((items) => items.filter((item) => item.id !== id));
    setBusyId("");
  };

  const visibleApplications = applications.filter((application) => view === "archive" ? application.status === "rejected" : application.status !== "rejected");

  return <section className="applications-page">
    <section className="heading-row"><div><p className="eyebrow">КОМАНДА</p><h1>Заявки <span>працівників</span></h1><p className="subtle">Перевіряйте дані, фото документа та ухвалюйте рішення.</p></div><button className="sync" onClick={() => void loadApplications()}>↻ Оновити</button></section>
    <div className="application-tabs"><button className={view === "active" ? "selected" : ""} onClick={() => setView("active")}>Активні</button><button className={view === "archive" ? "selected" : ""} onClick={() => setView("archive")}>Архів</button></div>
    {loading ? <article className="panel empty-applications">Завантажуємо заявки…</article> : error ? <article className="panel empty-applications">{error}</article> : visibleApplications.length === 0 ? <article className="panel empty-applications">{view === "archive" ? "В архіві поки немає заявок." : "Нових заявок поки немає."}</article> : <div className="applications-list">{visibleApplications.map((application) => <article className="panel application-card" key={application.id}>
      <div className="application-main"><div className="candidate-details"><div className="face-square">{application.face_photo_url ? <a href={application.face_photo_url} target="_blank" rel="noreferrer"><img src={application.face_photo_url} alt={`Фото обличчя: ${application.full_name}`} /></a> : <span>Фото</span>}</div><div><p className="panel-label">КАНДИДАТ</p><h2>{application.full_name}</h2><p className="application-meta">{application.city} · {application.age} років · {application.phone}</p><p className="application-date">{new Date(application.created_at).toLocaleString("uk-UA")}</p></div></div><span className={`application-status ${application.status}`}>{application.status === "pending" ? "На розгляді" : application.status === "approved" ? "Прийнято" : "Відхилено"}</span></div>
      <div><small className="document-label">Фото паспорта</small><div className="document-preview">{application.photo_url ? <a href={application.photo_url} target="_blank" rel="noreferrer"><img src={application.photo_url} alt={`Фото паспорта: ${application.full_name}`} /></a> : <span>Фото недоступне</span>}</div></div>
      {application.status === "pending" && <div className="application-actions"><button className="reject" disabled={busyId === application.id} onClick={() => void decide(application.id, "rejected")}>Відхилити</button><button className="approve" disabled={busyId === application.id} onClick={() => void decide(application.id, "approved")}>{busyId === application.id ? "Зберігаємо…" : "Прийняти"}</button></div>}{application.status === "rejected" && <div className="application-actions"><button className="delete-archive" disabled={busyId === application.id} onClick={() => void removeArchived(application.id)}>{busyId === application.id ? "Видаляємо…" : "Видалити"}</button></div>}
    </article>)}</div>}
  </section>;
}

function WorkerStatusScreen({ name, title, text }: { name: string; title: string; text: string }) {
  return <main className="auth-page"><section className="auth-card worker-card"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div><p className="eyebrow">КАБІНЕТ ПРАЦІВНИКА</p><h1>Вітаємо, {name}.<br /><span>{title}</span></h1><p className="auth-copy">{text}</p><div className="worker-status"><i /> Оновлюється автоматично після перезавантаження сторінки</div></section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;
}

function WorkerWorkspace({ name }: { name: string }) {
  return <main className="auth-page"><section className="auth-card worker-card"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div><p className="eyebrow">РОБОЧИЙ КАБІНЕТ</p><h1>Ви в <span>команді.</span></h1><p className="auth-copy">Вітаємо, {name}. Власник прийняв вашу заявку. Тут з’являтимуться нові звернення користувачів для підтримки.</p><div className="worker-status worker-approved"><i /> Ви прийняті до команди Nezeriya Wallet</div></section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;
}

function AuthScreen({ checking, onGoogleSignIn }: { checking: boolean; onGoogleSignIn: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div>
        <p className="eyebrow">ЗАХИЩЕНА ОПЕРАЦІЙНА ПАНЕЛЬ</p>
        <h1>Керуйте Nezeriya<br /><span>в одному місці.</span></h1>
        <p className="auth-copy">Аналітика гаманця, команда підтримки та фінансові показники доступні лише після авторизації.</p>
        <button className="google-button" onClick={onGoogleSignIn} disabled={checking}>
          <span className="google-mark">G</span>{checking ? "Перевіряємо сесію…" : "Продовжити з Google"}
        </button>
        <p className="auth-footnote">Вхід призначений для власника та авторизованих працівників Nezeriya Wallet.</p>
      </section>
      <div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" />
    </main>
  );
}

function RoleScreen({ name, onOwnerCode, onWorker }: { name: string; onOwnerCode: (code: string) => Promise<boolean>; onWorker: () => void }) {
  const [mode, setMode] = useState<"choose" | "owner">("choose");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const valid = await onOwnerCode(code);
    setLoading(false);
    if (!valid) setError("Код не підходить. Спробуй ще раз.");
  };

  return <main className="auth-page"><section className="auth-card role-card"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div>{mode === "choose" ? <><p className="eyebrow">ВХІД У РОБОЧИЙ ПРОСТІР</p><h1>Вітаємо, {name}.<br /><span>Оберіть роль.</span></h1><p className="auth-copy">Роль визначає, які інструменти будуть доступні у вашому кабінеті.</p><div className="role-options"><button className="role-option" onClick={() => setMode("owner")}><b>◈</b><span><strong>Власник</strong><small>Повна аналітика, команда та налаштування</small></span><i>→</i></button><button className="role-option" onClick={onWorker}><b>◌</b><span><strong>Працівник</strong><small>Подати заявку або перейти до підтримки</small></span><i>→</i></button></div></> : <form onSubmit={submit}><button className="back-link" type="button" onClick={() => setMode("choose")}>← Назад</button><p className="eyebrow">ПІДТВЕРДЖЕННЯ ВЛАСНИКА</p><h1>Введіть<br /><span>код доступу.</span></h1><p className="auth-copy">Код перевіряється безпечно на сервері та ніколи не показується у браузері.</p><input className="owner-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Код власника" autoFocus required /><button className="google-button mint-action" disabled={loading}>{loading ? "Перевіряємо…" : "Відкрити панель"}</button>{error && <p className="auth-error">{error}</p>}</form>}</section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;
}

function WorkerScreen({ name, onSubmit, onCheckStatus }: { name: string; onSubmit: (application: { full_name: string; city: string; age: number; phone: string }, document: File, facePhoto: File) => Promise<{ ok: boolean; message: string }>; onCheckStatus: () => Promise<"pending" | "approved" | "rejected" | null> }) {
  const [form, setForm] = useState({ first_name: name, last_name: "", patronymic: "", city: "", age: "", phone: "", document_note: "" });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [facePhotoFile, setFacePhotoFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"checking" | "pending" | "approved" | "rejected" | null>("checking");

  useEffect(() => {
    let active = true;
    const checkStatus = () => void onCheckStatus().then((status) => { if (active) setApplicationStatus(status); });
    checkStatus();
    const interval = window.setInterval(checkStatus, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [onCheckStatus]);

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const full_name = `${form.last_name} ${form.first_name} ${form.patronymic}`.trim();
    if (!documentFile || !facePhotoFile || !consent) {
      setLoading(false);
      setMessage("Додайте обидва фото та підтвердьте згоду на обробку даних.");
      return;
    }
    const result = await onSubmit({ full_name, city: form.city, age: Number(form.age), phone: form.phone }, documentFile, facePhotoFile);
    setLoading(false);
    setMessage(result.message);
    setSubmitted(result.ok);
    if (result.ok) setApplicationStatus("pending");
  };

  if (applicationStatus === "checking") return <WorkerStatusScreen name={name} title="Перевіряємо заявку…" text="Завантажуємо актуальний статус вашої заявки." />;
  if (applicationStatus === "approved") return <WorkerWorkspace name={name} />;
  if (applicationStatus === "pending") return <WorkerStatusScreen name={name} title="Заявка на розгляді." text="Власник перевіряє ваші дані. Після прийняття тут відкриється робочий кабінет." />;

  return <main className="auth-page"><section className="auth-card worker-card"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div>{submitted ? <><p className="eyebrow">ЗАЯВКУ НАДІСЛАНО</p><h1>Дякуємо,<br /><span>{name}.</span></h1><p className="auth-copy">Власник перевірить вашу заявку. Після схвалення тут відкриється кабінет підтримки.</p><div className="worker-status"><i /> {message}</div></> : <form onSubmit={submit}><p className="eyebrow">АНКЕТА ПРАЦІВНИКА</p><h1>Приєднайтесь<br /><span>до команди.</span></h1><p className="auth-copy">Заповніть дані для розгляду заявки. Усі поля з позначкою * обов’язкові.</p><div className="form-grid"><label>Прізвище *<input value={form.last_name} onChange={(event) => update("last_name", event.target.value)} required /></label><label>Ім’я *<input value={form.first_name} onChange={(event) => update("first_name", event.target.value)} required /></label><label>По батькові *<input value={form.patronymic} onChange={(event) => update("patronymic", event.target.value)} required /></label><label>Місто *<input value={form.city} onChange={(event) => update("city", event.target.value)} required /></label><label>Вік *<input type="number" min="16" max="99" value={form.age} onChange={(event) => update("age", event.target.value)} required /></label><label>Телефон *<input value={form.phone} onChange={(event) => update("phone", event.target.value)} required /></label></div><label className="wide-field">Фото паспорта *<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} required /></label><label className="wide-field">Фото обличчя *<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFacePhotoFile(event.target.files?.[0] || null)} required /></label><label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>Погоджуюсь на обробку моїх персональних даних для розгляду заявки.</span></label><p className="auth-copy">JPG, PNG або WEBP — до 8 МБ кожне.</p><button className="google-button mint-action" disabled={loading}>{loading ? "Надсилаємо…" : "Надіслати заявку"}</button>{message && <p className="auth-error">{message}</p>}</form>}</section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;
}
