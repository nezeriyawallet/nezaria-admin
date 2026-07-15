"use client";

import { useEffect, useMemo, useState } from "react";

type NavItem = "Огляд" | "Користувачі" | "Фінанси" | "Підтримка" | "Команда" | "Працівники";
type AccessRole = "owner" | "worker" | null;
type WorkspaceMode = "ceo" | "admin";
type WorkerApplication = {
  id: string;
  full_name: string;
  city: string;
  age: number;
  phone: string;
  status: "pending" | "approved" | "rejected" | "terminated";
  created_at: string;
  photo_url: string | null;
  face_photo_url: string | null;
};
type EmployeeReview = { id: string; client_name: string; rating: number; comment: string; created_at: string };
type WorkerPayout = { id: string; amount: number; currency: "USDT"; status: "pending" | "paid"; note: string | null; created_at: string; paid_at: string | null };
type EmployeeProfile = {
  id: string; full_name: string; city: string; age: number; phone: string; created_at: string;
  avatar_url: string | null; ton_usdt_wallet: string | null; last_active_at: string | null; reviews: EmployeeReview[]; payouts: WorkerPayout[]; closed_chats: number; daily_activity: number[];
};
type WalletMetrics = Record<string, string | number | null>;
type SupportMessage = { id: string; sender_type: "client" | "agent" | "system"; body: string; sent_at: string };
type SupportTicket = { id: string; client_name: string; client_username: string | null; status: "new" | "in_progress" | "awaiting_rating" | "closed"; assigned_to: string | null; rating: number | null; review: string | null; created_at: string; updated_at: string; messages: SupportMessage[] };

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

function metricNumber(value: string | number | null | undefined) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function Home() {
  const [active, setActive] = useState<NavItem>("Огляд");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("ceo");
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
    if (window.localStorage.getItem("nezeriya_workspace_mode") === "admin") setWorkspaceMode("admin");
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!supabaseUrl || !supabaseKey) {
        setAuthState("signed_out");
        return;
      }
      const persistentKeys = ["nezaria_access_token", "nezaria_refresh_token", "nezeriya_access_role", "nezeriya_owner_session"];
      persistentKeys.forEach((key) => {
        const value = window.localStorage.getItem(key);
        if (value && !window.sessionStorage.getItem(key)) window.sessionStorage.setItem(key, value);
        const currentValue = window.sessionStorage.getItem(key);
        if (currentValue && !window.localStorage.getItem(key)) window.localStorage.setItem(key, currentValue);
      });
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const redirectedToken = fragment.get("access_token");
      const redirectedRefreshToken = fragment.get("refresh_token");
      let accessToken = redirectedToken || window.sessionStorage.getItem("nezaria_access_token");
      if (!accessToken) {
        setAuthState("signed_out");
        return;
      }
      if (redirectedToken) {
        window.sessionStorage.setItem("nezaria_access_token", redirectedToken);
        window.localStorage.setItem("nezaria_access_token", redirectedToken);
        if (redirectedRefreshToken) {
          window.sessionStorage.setItem("nezaria_refresh_token", redirectedRefreshToken);
          window.localStorage.setItem("nezaria_refresh_token", redirectedRefreshToken);
        }
        window.history.replaceState(null, "", window.location.pathname);
      }
      try {
        let response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
          const refreshToken = window.localStorage.getItem("nezaria_refresh_token");
          if (refreshToken) {
            const refreshed = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
              method: "POST",
              headers: { apikey: supabaseKey, "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
            if (refreshed.ok) {
              const session = await refreshed.json() as { access_token?: string; refresh_token?: string };
              if (session.access_token) {
                accessToken = session.access_token;
                window.sessionStorage.setItem("nezaria_access_token", accessToken);
                window.localStorage.setItem("nezaria_access_token", accessToken);
                if (session.refresh_token) {
                  window.sessionStorage.setItem("nezaria_refresh_token", session.refresh_token);
                  window.localStorage.setItem("nezaria_refresh_token", session.refresh_token);
                }
                response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` } });
              }
            }
          }
        }
        if (!response.ok) throw new Error("Session expired");
        const user = await response.json();
        setViewerName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Користувач");
        setViewerId(user.id);
        const savedRole = window.sessionStorage.getItem("nezeriya_access_role");
        const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
        setAccessRole(savedRole === "owner" && !ownerSession ? null : savedRole === "owner" || savedRole === "worker" ? savedRole : null);
        setAuthState("signed_in");
      } catch {
        ["nezaria_access_token", "nezaria_refresh_token", "nezeriya_access_role", "nezeriya_owner_session"].forEach((key) => {
          window.sessionStorage.removeItem(key);
          window.localStorage.removeItem(key);
        });
        setAuthState("signed_out");
      }
    };
    void restoreSession();
  }, [supabaseKey, supabaseUrl]);

  useEffect(() => {
    if (authState !== "signed_in" || !supabaseUrl || !supabaseKey) return;
    const refreshAccessToken = async () => {
      const refreshToken = window.localStorage.getItem("nezaria_refresh_token");
      if (!refreshToken) return;
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: supabaseKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return;
      const session = await response.json() as { access_token?: string; refresh_token?: string };
      if (session.access_token) {
        window.sessionStorage.setItem("nezaria_access_token", session.access_token);
        window.localStorage.setItem("nezaria_access_token", session.access_token);
      }
      if (session.refresh_token) {
        window.sessionStorage.setItem("nezaria_refresh_token", session.refresh_token);
        window.localStorage.setItem("nezaria_refresh_token", session.refresh_token);
      }
    };
    const interval = window.setInterval(() => void refreshAccessToken(), 45 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [authState, supabaseKey, supabaseUrl]);

  useEffect(() => {
    if (accessRole !== "owner") return;
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session");
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
    { label: "Дохід Telegram Stars", value: `${displayMetric(walletMetrics.monthlyStars)} NZR`, change: "live", icon: "★", tone: "violet" },
    { label: "Зареєстровані користувачі", value: displayMetric(walletMetrics.users), change: "live", icon: "◉", tone: "orange" },
  ] : metrics;
  const totalIncome = walletMetrics ? displayMetric(metricNumber(walletMetrics.totalCommission) + metricNumber(walletMetrics.monthlyStars) * 0.015, "$") : "—";

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
    window.localStorage.setItem("nezeriya_owner_session", result.ownerSession);
    window.localStorage.setItem("nezeriya_access_role", "owner");
    setAccessRole("owner");
    return true;
  };

  const selectWorker = () => {
    window.sessionStorage.setItem("nezeriya_access_role", "worker");
    window.localStorage.setItem("nezeriya_access_role", "worker");
    setAccessRole("worker");
  };

  const signOut = async () => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    if (supabaseUrl && supabaseKey && token) {
      await fetch(`${supabaseUrl}/auth/v1/logout`, { method: "POST", headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } }).catch(() => undefined);
    }
    ["nezaria_access_token", "nezaria_refresh_token", "nezeriya_access_role", "nezeriya_owner_session", "nezeriya_workspace_mode"].forEach((key) => {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    });
    setAccessRole(null);
    setViewerId("");
    setWorkspaceMode("ceo");
    setAuthState("signed_out");
  };

  const switchWorkspace = (mode: WorkspaceMode) => {
    window.localStorage.setItem("nezeriya_workspace_mode", mode);
    setWorkspaceMode(mode);
    setActive(mode === "admin" ? "Підтримка" : "Огляд");
  };

  const submitWorkerApplication = async (application: { full_name: string; city: string; age: number; phone: string; ton_usdt_wallet: string }, document: File, facePhoto: File) => {
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
    return status === "pending" || status === "approved" || status === "rejected" || status === "terminated" ? status : null;
  };

  const sendWorkerPresence = async () => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    if (!token || !supabaseUrl || !supabaseKey) return;
    await fetch(`${supabaseUrl}/rest/v1/rpc/update_my_worker_presence`, {
      method: "POST",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
  };

  const setSupportPresence = async (online: boolean, keepalive = false) => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    if (!token || !supabaseUrl || !supabaseKey) return;
    await fetch(`${supabaseUrl}/rest/v1/rpc/set_my_support_presence`, {
      method: "POST",
      keepalive,
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ online }),
    });
  };

  useEffect(() => {
    if (accessRole !== "owner") return;
    const profile = document.querySelector(".sidebar-bottom .profile") as HTMLElement | null;
    if (!profile || !profile.parentElement) return;
    const container = profile.parentElement;
    container.style.position = "relative";
    profile.style.cursor = "pointer";
    profile.title = "Відкрити меню профілю";
    const menu = document.createElement("div");
    menu.style.cssText = "position:absolute;left:7px;right:7px;bottom:62px;padding:7px;background:#172022;border:1px solid #334244;border-radius:9px;box-shadow:0 12px 30px #0008;z-index:20";
    menu.hidden = true;
    const exitButton = document.createElement("button");
    exitButton.type = "button";
    exitButton.textContent = "Вийти";
    exitButton.style.cssText = "width:100%;border:1px solid #663e40;background:#281c1e;color:#ffaaa5;border-radius:6px;padding:9px 10px;text-align:left;font:inherit;font-size:11px;font-weight:800;cursor:pointer";
    exitButton.onclick = () => { void signOut(); };
    menu.appendChild(exitButton);
    container.appendChild(menu);
    const toggleMenu = () => { menu.hidden = !menu.hidden; };
    const closeMenu = (event: MouseEvent) => { if (!container.contains(event.target as Node)) menu.hidden = true; };
    profile.addEventListener("click", toggleMenu);
    document.addEventListener("click", closeMenu);
    return () => { profile.removeEventListener("click", toggleMenu); document.removeEventListener("click", closeMenu); menu.remove(); };
  }, [accessRole, supabaseKey, supabaseUrl]);

  useEffect(() => {
    if (accessRole !== "owner" || workspaceMode !== "ceo") return;
    const supportButton = document.querySelector(".sidebar nav .nav-item:nth-child(4)") as HTMLButtonElement | null;
    if (!supportButton) return;
    supportButton.title = "Відкрити чергу звернень";
    const openQueue = () => switchWorkspace("admin");
    supportButton.addEventListener("click", openQueue);
    return () => supportButton.removeEventListener("click", openQueue);
  }, [accessRole, workspaceMode]);

  useEffect(() => {
    if (accessRole !== "owner" || workspaceMode !== "ceo") return;
    const queueButton = document.querySelector(".open-queue") as HTMLButtonElement | null;
    if (!queueButton) return;
    const openQueue = () => switchWorkspace("admin");
    queueButton.addEventListener("click", openQueue);
    return () => queueButton.removeEventListener("click", openQueue);
  }, [accessRole, workspaceMode]);

  useEffect(() => {
    if (accessRole !== "owner" || workspaceMode !== "ceo") return;
    const settingsButton = document.querySelector(".sidebar-bottom .nav-item") as HTMLElement | null;
    if (settingsButton) settingsButton.style.display = "none";
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    void fetch("/api/support/tickets", { headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession } })
      .then((response) => response.ok ? response.json() : null)
      .then((result: { tickets?: SupportTicket[] } | null) => {
        if (!result) return;
        const tickets = result.tickets || [];
        const activeCount = tickets.filter((ticket) => ticket.status === "in_progress").length;
        const waitingCount = tickets.filter((ticket) => ticket.status === "new").length;
        const total = activeCount + waitingCount;
        const queueCard = document.querySelector(".queue-stat")?.parentElement;
        const queueStat = document.querySelector(".queue-stat strong") as HTMLElement | null;
        const queueInfo = document.querySelector(".queue-info") as HTMLElement | null;
        const progress = document.querySelector(".queue-progress i") as HTMLElement | null;
        const badge = queueCard?.querySelector(".queue-count") as HTMLElement | null;
        if (queueStat) queueStat.textContent = "—";
        if (queueInfo) queueInfo.innerHTML = `<span>${activeCount} у роботі</span><span>${waitingCount} очікують</span>`;
        if (progress) progress.style.width = total ? `${Math.round(activeCount / total * 100)}%` : "0%";
        if (badge) badge.textContent = String(waitingCount);
      });
  }, [accessRole, workspaceMode, active]);

  useEffect(() => {
    if (accessRole !== "owner" || window.innerWidth > 700) return;
    if (document.querySelector(".mobile-profile-menu")) return;
    const avatarButton = document.createElement("button");
    avatarButton.type = "button";
    avatarButton.className = "mobile-profile-menu";
    avatarButton.textContent = viewerName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "N";
    avatarButton.style.cssText = "position:fixed;top:12px;right:16px;z-index:201;width:42px;height:42px;border-radius:50%;border:1px solid #4b5a5a;background:linear-gradient(145deg,#c5a268,#684b34);color:#fff;font:700 11px Arial;cursor:pointer;box-shadow:0 8px 24px #0008";
    const menu = document.createElement("div");
    menu.style.cssText = "position:fixed;top:68px;right:12px;width:min(280px,calc(100vw - 24px));max-height:calc(100vh - 84px);overflow:auto;padding:10px;background:#121b1d;border:1px solid #344244;border-radius:12px;box-shadow:0 18px 45px #000b;z-index:200";
    menu.hidden = true;
    const title = document.createElement("strong");
    title.textContent = viewerName;
    title.style.cssText = "display:block;padding:7px 8px 12px;color:#edf7f4;font:700 13px Arial";
    menu.appendChild(title);
    const addButton = (label: string, action: () => void, selected = false) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.style.cssText = `display:block;width:100%;border:0;border-radius:7px;padding:11px 10px;margin:2px 0;text-align:left;background:${selected ? "#21423b" : "transparent"};color:${selected ? "#76edd0" : "#c8d5d2"};font:700 12px Arial;cursor:pointer`;
      button.onclick = () => { action(); menu.hidden = true; };
      menu.appendChild(button);
    };
    addButton("NEZERIYA CEO", () => { switchWorkspace("ceo"); setActive("Огляд"); }, workspaceMode === "ceo");
    addButton("NEZERIYA ADMIN", () => switchWorkspace("admin"), workspaceMode === "admin");
    const divider = document.createElement("div");
    divider.style.cssText = "height:1px;background:#2d393a;margin:8px 0";
    menu.appendChild(divider);
    navigation.forEach((item) => addButton(item, () => { switchWorkspace("ceo"); setActive(item); }, workspaceMode === "ceo" && active === item));
    const exitDivider = document.createElement("div");
    exitDivider.style.cssText = "height:1px;background:#2d393a;margin:8px 0";
    menu.appendChild(exitDivider);
    addButton("Вийти", () => { void signOut(); });
    document.body.appendChild(menu);
    const toggle = () => { menu.hidden = !menu.hidden; };
    const close = (event: MouseEvent) => { if (!menu.contains(event.target as Node) && event.target !== avatarButton) menu.hidden = true; };
    avatarButton.addEventListener("click", toggle);
    document.addEventListener("click", close);
    document.body.appendChild(avatarButton);
    return () => { avatarButton.removeEventListener("click", toggle); document.removeEventListener("click", close); avatarButton.remove(); menu.remove(); };
  }, [accessRole, workspaceMode, active, viewerName]);

  if (authState !== "signed_in") {
    return <AuthScreen checking={authState === "checking"} onGoogleSignIn={signInWithGoogle} />;
  }

  if (!accessRole) {
    return <RoleScreen name={viewerName} onOwnerCode={verifyOwnerCode} onWorker={selectWorker} />;
  }

  if (accessRole === "worker") {
    return <WorkerScreen name={viewerName} onSubmit={submitWorkerApplication} onCheckStatus={getWorkerApplicationStatus} onPresence={sendWorkerPresence} />;
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div>
        <div className="workspace-switcher"><button className={`workspace-choice ${workspaceMode === "ceo" ? "selected" : ""}`} onClick={() => switchWorkspace("ceo")}><span className="workspace-dot" />NEZERIYA CEO</button><button className={`workspace-choice ${workspaceMode === "admin" ? "selected" : ""}`} onClick={() => switchWorkspace("admin")}><span className="workspace-dot" />NEZERIYA ADMIN</button></div>
        <nav aria-label="Головна навігація">
          {(workspaceMode === "ceo" ? navigation : ["Підтримка"] as NavItem[]).map((item, index) => (
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
          {workspaceMode === "admin" ? <SupportAdminPanel onPresence={setSupportPresence} /> : active === "Команда" ? <ApplicationsPanel /> : active === "Працівники" ? <EmployeesPanel /> : active === "Користувачі" ? <UsersPanel walletMetrics={walletMetrics} /> : active === "Фінанси" ? <FinancePanel walletMetrics={walletMetrics} /> : <>
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
            <article className="panel earnings-panel"><div className="panel-head"><div><p className="panel-label">ЗАРОБІТОК</p><h2>Загальна сума доходу</h2></div><button className="dots">•••</button></div><div className="chart-summary"><strong>{totalIncome}</strong></div><p className="income-note">Комісії + дохід Telegram Stars, перерахований за курсом $0.015.</p><div className="chart-wrap"><div className="chart-lines"><span /><span /><span /><span /></div><svg viewBox="0 0 510 205" aria-label="Графік доходу за період" role="img"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#42e8bd" stopOpacity=".28"/><stop offset="100%" stopColor="#42e8bd" stopOpacity="0"/></linearGradient></defs><path d={`${chartPath} L510 205 L0 205 Z`} fill="url(#fill)"/><path d={chartPath} fill="none" stroke="#42e8bd" strokeLinecap="round" strokeWidth="3"/><circle cx="372" cy="65" r="5" fill="#101719" stroke="#42e8bd" strokeWidth="3"/></svg><div className="x-axis"><span>01 лип</span><span>08 лип</span><span>15 лип</span><span>22 лип</span><span>Сьогодні</span></div></div></article>
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

function SupportAdminPanel({ onPresence }: { onPresence: (online: boolean, keepalive?: boolean) => Promise<void> }) {
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    void onPresence(true);
    const markOffline = () => { void onPresence(false, true); };
    window.addEventListener("pagehide", markOffline);
    return () => { window.removeEventListener("pagehide", markOffline); markOffline(); };
  }, [onPresence]);
  const changeAvailability = () => setAvailable((current) => {
    const next = !current;
    void onPresence(next);
    return next;
  });
  return <SupportDesk available={available} onAvailability={changeAvailability} />;
}

function SupportDesk({ available, onAvailability }: { available?: boolean; onAvailability?: () => void }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [ticketSection, setTicketSection] = useState<"orders" | "chats">("orders");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const orders = tickets.filter((ticket) => ticket.status === "new");
  const chats = tickets.filter((ticket) => ticket.status === "in_progress");
  const visibleTickets = ticketSection === "orders" ? orders : chats;
  const selected = visibleTickets.find((ticket) => ticket.id === selectedId) || visibleTickets[0];
  const headers = () => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    return { Authorization: `Bearer ${token || ""}`, ...(ownerSession ? { "x-owner-session": ownerSession } : {}) };
  };
  const load = async (sync = true) => {
    if (!loading) setSyncing(true);
    try {
      const response = await fetch(`/api/support/tickets${sync ? "?sync=1" : ""}`, { headers: headers() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setError(result.error || "Не вдалося завантажити звернення.");
      else {
        const nextTickets = result.tickets || [];
        setTickets(nextTickets);
        setError("");
        setSelectedId((current) => current && nextTickets.some((ticket: SupportTicket) => ticket.id === current) ? current : (nextTickets[0]?.id || ""));
      }
    } finally { setLoading(false); setSyncing(false); }
  };
  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 5000); return () => window.clearInterval(interval); }, []);
  const action = async (actionName: "take" | "skip" | "send" | "close") => {
    if (!selected || busy) return;
    if (actionName === "send" && !message.trim()) return;
    setBusy(true);
    const response = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json", ...headers() }, body: JSON.stringify({ action: actionName, ticketId: selected.id, message }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "Не вдалося виконати дію.");
    else {
      setMessage("");
      if (actionName === "skip") {
        setTickets((current) => current.filter((ticket) => ticket.id !== selected.id));
        setSelectedId((current) => current === selected.id ? "" : current);
      } else {
        if (actionName === "take") setTicketSection("chats");
        await load(false);
      }
    }
    setBusy(false);
  };
  useEffect(() => {
    const takeButton = document.querySelector(".conversation .take-ticket") as HTMLButtonElement | null;
    if (!takeButton || takeButton.parentElement?.querySelector(".skip-ticket")) return;
    const skipButton = document.createElement("button");
    skipButton.type = "button";
    skipButton.className = "skip-ticket";
    skipButton.textContent = "Утриматись";
    skipButton.style.cssText = "margin-left:7px;border:1px solid #506060;background:#172122;color:#afbebd;border-radius:7px;padding:9px 11px;font-weight:800;font-size:11px;cursor:pointer";
    skipButton.disabled = busy;
    skipButton.onclick = () => { void action("skip"); };
    takeButton.insertAdjacentElement("afterend", skipButton);
    return () => skipButton.remove();
  }, [tickets, selectedId, busy]);
  useEffect(() => {
    const header = document.querySelector(".conversation-head");
    if (!header) return;
    const current = header.querySelector(".support-typing") as HTMLElement | null;
    if (!syncing && !busy) { current?.remove(); return; }
    const indicator = current || document.createElement("span");
    indicator.className = "support-typing";
    indicator.innerHTML = `${busy ? "Надсилаємо" : "Оновлюємо чат"}<i></i><i></i><i></i>`;
    if (!current) header.appendChild(indicator);
  }, [syncing, busy, selectedId, tickets]);
  useEffect(() => {
    const list = document.querySelector(".support-desk .ticket-list");
    if (!list) return;
    const tabs = list.querySelector(".ticket-sections") || document.createElement("div");
    tabs.className = "ticket-sections";
    tabs.innerHTML = `<button class="${ticketSection === "orders" ? "selected" : ""}">Ордери <b>${orders.length}</b></button><button class="${ticketSection === "chats" ? "selected" : ""}">Мої чати <b>${chats.length}</b></button>`;
    const [ordersButton, chatsButton] = Array.from(tabs.querySelectorAll("button"));
    ordersButton?.addEventListener("click", () => { setTicketSection("orders"); setSelectedId(orders[0]?.id || ""); });
    chatsButton?.addEventListener("click", () => { setTicketSection("chats"); setSelectedId(chats[0]?.id || ""); });
    list.prepend(tabs);
    list.querySelectorAll(".ticket-item").forEach((item) => {
      const dot = item.querySelector(".ticket-dot");
      const isOrder = dot?.classList.contains("new");
      const isChat = dot?.classList.contains("in_progress");
      (item as HTMLElement).style.display = (ticketSection === "orders" ? isOrder : isChat) ? "" : "none";
    });
    return () => tabs.remove();
  }, [ticketSection, tickets]);
  const freshCount = orders.length;
  const activeCount = chats.length;
  return <section className="support-desk-page">
    <section className="heading-row"><div><p className="eyebrow">NEZERIYA ADMIN</p><h1>Чати <span>підтримки</span></h1><p className="subtle">Нові повідомлення синхронізуються з акаунтом підтримки.</p></div>{onAvailability && <button className={`availability ${available ? "available" : "away"}`} onClick={onAvailability}><i />{available ? "Доступний" : "Не в мережі"}</button>}</section>
    <section className="support-admin-summary"><article className="panel"><p>Нові звернення</p><strong>{freshCount}</strong><span>Очікують працівника</span></article><article className="panel"><p>У роботі</p><strong>{activeCount}</strong><span>Активних діалогів</span></article><article className="panel"><p>Усього чатів</p><strong>{tickets.length}</strong><span>Усі синхронізовані звернення</span></article></section>
    {loading ? <article className="panel empty-applications">Синхронізуємо чати…</article> : error ? <article className="panel empty-applications">{error}</article> : <section className="support-desk"><aside className="ticket-list">{tickets.length === 0 ? <p>Нових звернень поки немає.</p> : tickets.map((ticket) => <button key={ticket.id} className={`ticket-item ${selected?.id === ticket.id ? "selected" : ""}`} onClick={() => setSelectedId(ticket.id)}><span className={`ticket-dot ${ticket.status}`} /><div><strong>{ticket.client_name}</strong><small>{ticket.messages.at(-1)?.body || "Нове звернення"}</small></div><em>{ticket.status === "new" ? "Нове" : ticket.status === "in_progress" ? "В роботі" : ticket.status === "awaiting_rating" ? "Оцінка" : "Закрито"}</em></button>)}</aside><article className="panel conversation">{selected ? <><div className="conversation-head"><div><h2>{selected.client_name}</h2><p>{selected.client_username ? `@${selected.client_username}` : "Telegram"}</p></div><div>{selected.status === "new" && <button className="take-ticket" disabled={busy} onClick={() => void action("take")}>Взяти в роботу</button>}{selected.status === "in_progress" && <button className="close-ticket" disabled={busy} onClick={() => void action("close")}>Закрити чат</button>}</div></div><div className="messages">{selected.messages.map((item) => <div className={`message ${item.sender_type}`} key={item.id}>{item.body}</div>)}</div>{selected.status === "in_progress" ? <form className="message-form" onSubmit={(event) => { event.preventDefault(); void action("send"); }}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Напишіть відповідь…" maxLength={4000} /><button disabled={busy}>Надіслати</button></form> : <p className="conversation-note">{selected.status === "new" ? "Візьміть чат у роботу, щоб відповісти клієнту." : selected.status === "awaiting_rating" ? "Клієнту надіслано запит на оцінку та відгук." : "Діалог завершено."}</p>}</> : <p>Виберіть звернення зліва.</p>}</article></section>}
  </section>;
}

function FinancePanel({ walletMetrics }: { walletMetrics: WalletMetrics | null }) {
  const value = (key: string, prefix = "") => walletMetrics ? displayMetric(walletMetrics[key], prefix) : "—";
  const starsNrz = walletMetrics ? metricNumber(walletMetrics.monthlyStars) : 0;
  const starsUsd = starsNrz * 0.015;
  const totalIncome = walletMetrics ? metricNumber(walletMetrics.totalCommission) + starsUsd : null;
  return <section className="finance-page">
    <section className="heading-row"><div><p className="eyebrow">ФІНАНСИ</p><h1>Фінансова <span>аналітика</span></h1><p className="subtle">Дані синхронізуються з Nezeriya Wallet API.</p></div><span className="live"><i /> LIVE</span></section>
    <section className="finance-highlight"><article className="panel"><p>Загальна сума доходу</p><strong>{totalIncome === null ? "—" : displayMetric(totalIncome, "$")}</strong><span>Комісії + Telegram Stars</span></article><article className="panel"><p>Загальна комісія</p><strong>{value("totalCommission", "$")}</strong><span>За весь час</span></article><article className="panel"><p>Комісія за місяць</p><strong>{value("monthlyCommission", "$")}</strong><span>Поточний місяць</span></article></section>
    <section className="finance-grid"><article className="panel finance-card"><p className="panel-label">TELEGRAM STARS</p><h2>Дохід зі Stars</h2><strong>{walletMetrics ? `${displayMetric(starsNrz)} NZR` : "—"}</strong><div><span>Вартість у USD</span><b>{walletMetrics ? displayMetric(starsUsd, "$") : "—"}</b></div><small>Перерахунок: 1 NZR = $0.015</small></article><article className="panel finance-card"><p className="panel-label">РЕФЕРАЛИ</p><h2>Реферальний дохід</h2><strong>{value("referralTotal", "$")}</strong><div><span>Операцій DeDust</span><b>{value("dedustSwaps")}</b></div><small>Показники партнерської активності</small></article><article className="panel finance-card"><p className="panel-label">РУЛЕТКА</p><h2>Втрати рулетки</h2><strong>{value("wheelLoss", " NZR")}</strong><div><span>Невдалих транзакцій</span><b>{value("failedTransactions")}</b></div><small>Контроль ризикових операцій</small></article></section>
    <article className="panel nzr-finance-panel"><div className="panel-head"><div><p className="panel-label">NZR</p><h2>Операції токена</h2></div></div><div className="nzr-finance-list"><span>Транзакцій NZR<strong>{value("nzrTransactions")}</strong></span><span>Продажі NZR<strong>{value("nzrSwapSell")}</strong></span><span>Купівлі NZR<strong>{value("nzrSwapBuy")}</strong></span><span>Покупки NZR за Stars<strong>{value("nzrStars")}</strong></span></div></article>
  </section>;
}

function UsersPanel({ walletMetrics }: { walletMetrics: WalletMetrics | null }) {
  const registered = walletMetrics ? displayMetric(walletMetrics.users) : "—";
  return <section className="users-page">
    <section className="heading-row"><div><p className="eyebrow">КОРИСТУВАЧІ</p><h1>Аудиторія <span>Nezeriya Wallet</span></h1><p className="subtle">Актуальні дані з адміністративного API гаманця.</p></div><span className="live"><i /> LIVE</span></section>
    <section className="users-summary"><article className="panel users-primary"><p>Зареєстровано користувачів</p><strong>{registered}</strong><span>Усього за весь час</span></article><article className="panel"><p>Premium-користувачі</p><strong>—</strong><span>Потрібен endpoint Premium</span></article><article className="panel"><p>Звичайні користувачі</p><strong>—</strong><span>Потрібен endpoint статусів</span></article><article className="panel"><p>Нові за період</p><strong>—</strong><span>Потрібна статистика за датами</span></article></section>
    <article className="panel users-info-panel"><div className="panel-head"><div><p className="panel-label">ДОСТУПНІ ДАНІ</p><h2>Статистика користувачів</h2></div></div><div className="users-info-grid"><div><h3>Загальна база</h3><p>Показник «Зареєстровано користувачів» отримується напряму з Nezeriya Wallet API.</p></div><div><h3>Що додамо після API</h3><p>Premium / без Premium, країни й регіони, активність за день і персональний список користувачів.</p></div></div></article>
  </section>;
}

function EmployeesPanel() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [monthHours, setMonthHours] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<EmployeeProfile | null>(null);
  const [terminating, setTerminating] = useState(false);

  const loadEmployees = async () => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) { setError("Сесію власника не знайдено. Увійдіть знову як власник."); setLoading(false); return; }
    setLoading(true);
    const response = await fetch("/api/owner/employees", { headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "Не вдалося завантажити працівників.");
    else { setEmployees(result.employees || []); setMonthHours(result.month_hours || []); }
    setLoading(false);
  };

  useEffect(() => { void loadEmployees(); }, []);
  useEffect(() => {
    const summaryCards = document.querySelectorAll(".employees-summary .panel");
    const total = employees.reduce((sum, employee) => sum + employee.closed_chats, 0);
    const totalCard = summaryCards[3];
    if (totalCard) totalCard.innerHTML = `<p>Закриті чати</p><strong>${total}</strong>`;
    const summary = document.querySelector(".employees-summary");
    summary?.querySelector(".payroll-summary")?.remove();
    const payrollSummary = document.createElement("article");
    payrollSummary.className = "panel payroll-summary";
    const paid = employees.reduce((sum, employee) => sum + employee.payouts.filter((payout) => payout.status === "paid").reduce((value, payout) => value + Number(payout.amount), 0), 0);
    const pending = employees.reduce((sum, employee) => sum + employee.payouts.filter((payout) => payout.status === "pending").reduce((value, payout) => value + Number(payout.amount), 0), 0);
    payrollSummary.innerHTML = `<p>Зарплата команди</p><strong>${paid.toFixed(2)} USDT</strong><span>До сплати: ${pending.toFixed(2)} USDT</span>`;
    summary?.appendChild(payrollSummary);
    const info = document.querySelector(".employee-profile .employee-info");
    if (!selected || !info) return () => payrollSummary.remove();
    const previous = info.querySelector(".closed-chats-stat");
    previous?.remove();
    const stat = document.createElement("span");
    stat.className = "closed-chats-stat";
    stat.innerHTML = `Закриті чати<strong>${selected.closed_chats}</strong>`;
    stat.style.cssText = "display:flex;flex-direction:column;gap:5px;padding:10px;border:1px solid #2c3a3b;border-radius:8px;color:#93a5a2;font-size:11px";
    info.appendChild(stat);
    const wallet = document.createElement("span");
    wallet.className = "worker-wallet-stat";
    wallet.innerHTML = `USDT гаманець (TON)<strong>${selected.ton_usdt_wallet || "Не вказано"}</strong>`;
    wallet.style.cssText = "display:flex;flex-direction:column;gap:5px;padding:10px;border:1px solid #2c3a3b;border-radius:8px;color:#93a5a2;font-size:11px;overflow-wrap:anywhere";
    info.appendChild(wallet);
    const rating = selected.reviews.length ? selected.reviews.reduce((sum, review) => sum + review.rating, 0) / selected.reviews.length : 0;
    const ratingCard = document.createElement("span");
    ratingCard.className = "employee-rating-stat";
    ratingCard.innerHTML = `Рейтинг<strong>${rating ? `${rating.toFixed(2)} <b>${"★".repeat(Math.round(rating))}${"☆".repeat(5 - Math.round(rating))}</b>` : "Ще немає оцінок"}</strong>`;
    ratingCard.style.cssText = "display:flex;flex-direction:column;gap:5px;padding:10px;border:1px solid #2c3a3b;border-radius:8px;color:#93a5a2;font-size:11px";
    info.appendChild(ratingCard);
    const chart = document.createElement("section");
    chart.className = "employee-hours-chart";
    const values = selected.daily_activity || [];
    const max = Math.max(1, ...values);
    chart.innerHTML = `<p>Робочі години за кожен день · 30 днів</p><div>${values.map((value, day) => `<i data-tooltip="${day === 29 ? "Сьогодні" : `${29 - day} дн. тому`}: ${value} год." title="${day === 29 ? "Сьогодні" : `${29 - day} дн. тому`}: ${value} год." style="height:${Math.max(4, value / max * 100)}%"></i>`).join("")}</div><div class="work-chart-axis"><span>30 днів тому</span><span>Сьогодні</span></div><small>Наведіть на стовпчик, щоб побачити точну кількість годин.</small>`;
    info.insertAdjacentElement("afterend", chart);
    return () => { payrollSummary.remove(); stat.remove(); wallet.remove(); ratingCard.remove(); chart.remove(); };
  }, [employees, selected]);
  useEffect(() => {
    const page = document.querySelector(".employees-page");
    if (!page) return;
    page.querySelector(".monthly-work-chart")?.remove();
    const chart = document.createElement("article");
    chart.className = "panel monthly-work-chart";
    const max = Math.max(1, ...monthHours);
    chart.innerHTML = `<p class="panel-label">РОБОЧИЙ ЧАС КОМАНДИ</p><h2>Середні робочі години на працівника · 30 днів</h2><div class="monthly-work-bars">${monthHours.map((value, index) => `<i data-tooltip="День ${index + 1}: у середньому ${value} год." title="День ${index + 1}: у середньому ${value} год. на працівника" style="height:${Math.max(4, value / max * 100)}%"></i>`).join("")}</div><div><span>30 днів тому</span><span>Сьогодні</span></div><small>Наведіть на стовпчик, щоб побачити середню кількість годин за день.</small>`;
    const summary = page.querySelector(".employees-summary");
    summary?.insertAdjacentElement("afterend", chart);
    return () => chart.remove();
  }, [monthHours]);
  useEffect(() => {
    const modal = document.querySelector(".employee-profile");
    if (!modal || !selected) return;
    modal.querySelector(".owner-payroll")?.remove();
    const payroll = document.createElement("section");
    payroll.className = "owner-payroll";
    const payouts = selected.payouts || [];
    const totalPaid = payouts.filter((payout) => payout.status === "paid").reduce((sum, payout) => sum + Number(payout.amount), 0);
    const totalPending = payouts.filter((payout) => payout.status === "pending").reduce((sum, payout) => sum + Number(payout.amount), 0);
    payroll.innerHTML = `<div class="owner-payroll-head"><h3>Зарплата</h3><span>Виплачено: ${totalPaid.toFixed(2)} USDT · До сплати: ${totalPending.toFixed(2)} USDT</span></div><div class="owner-payroll-form"><input class="payroll-amount" type="number" min="0.01" step="0.01" placeholder="Сума USDT" /><input class="payroll-note" maxlength="500" placeholder="Примітка (необов’язково)" /><select class="payroll-status"><option value="pending">До сплати</option><option value="paid">Вже виплачено</option></select><button class="payroll-create">Нарахувати</button></div><div class="owner-payout-list">${payouts.length ? payouts.map((payout) => `<div><span><b>${Number(payout.amount).toFixed(2)} USDT</b><small>${payout.note || "Зарплата"} · ${new Date(payout.created_at).toLocaleDateString("uk-UA")}</small></span><em class="${payout.status}">${payout.status === "paid" ? "Виплачено" : "До сплати"}</em>${payout.status === "pending" ? `<button data-payout-id="${payout.id}">Позначити виплаченою</button>` : ""}</div>`).join("") : "<p>Нарахувань ще немає.</p>"}</div>`;
    const request = async (body: Record<string, unknown>) => {
      const token = window.sessionStorage.getItem("nezaria_access_token");
      const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
      if (!token || !ownerSession) return;
      const response = await fetch("/api/owner/employees", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-owner-session": ownerSession }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { window.alert(result.error || "Не вдалося зберегти виплату."); return; }
      const payout = result.payout as WorkerPayout;
      setSelected((current) => current ? { ...current, payouts: body.action === "create_payout" ? [payout, ...current.payouts] : current.payouts.map((item) => item.id === payout.id ? payout : item) } : current);
      await loadEmployees();
    };
    const createButton = payroll.querySelector(".payroll-create") as HTMLButtonElement | null;
    const onCreate = () => {
      const amount = Number((payroll.querySelector(".payroll-amount") as HTMLInputElement | null)?.value);
      const note = (payroll.querySelector(".payroll-note") as HTMLInputElement | null)?.value || "";
      const status = (payroll.querySelector(".payroll-status") as HTMLSelectElement | null)?.value;
      if (!Number.isFinite(amount) || amount <= 0) { window.alert("Вкажіть суму зарплати більше нуля."); return; }
      if (createButton) createButton.disabled = true;
      void request({ action: "create_payout", id: selected.id, amount, note, status });
    };
    createButton?.addEventListener("click", onCreate);
    const paidButtons = Array.from(payroll.querySelectorAll("[data-payout-id]"));
    const onPaid = (event: Event) => { const id = (event.currentTarget as HTMLElement).dataset.payoutId; if (id) void request({ action: "mark_payout_paid", payout_id: id }); };
    paidButtons.forEach((button) => button.addEventListener("click", onPaid));
    modal.insertBefore(payroll, modal.querySelector(".terminate-employee"));
    return () => { createButton?.removeEventListener("click", onCreate); paidButtons.forEach((button) => button.removeEventListener("click", onPaid)); payroll.remove(); };
  }, [selected]);
  const terminateEmployee = async () => {
    if (!selected || !window.confirm(`Звільнити ${selected.full_name}? Доступ працівника буде припинено.`)) return;
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    setTerminating(true);
    const response = await fetch("/api/owner/employees", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-owner-session": ownerSession }, body: JSON.stringify({ id: selected.id, action: "terminate" }) });
    if (response.ok) { setEmployees((items) => items.filter((employee) => employee.id !== selected.id)); setSelected(null); }
    else setError("Не вдалося звільнити працівника. Спробуйте ще раз.");
    setTerminating(false);
  };
  const reviewCount = employees.reduce((total, employee) => total + employee.reviews.length, 0);
  const averageRating = reviewCount ? (employees.reduce((total, employee) => total + employee.reviews.reduce((sum, review) => sum + review.rating, 0), 0) / reviewCount).toFixed(2) : "—";

  return <section className="employees-page">
    <section className="heading-row"><div><p className="eyebrow">ПРАЦІВНИКИ</p><h1>Ефективність <span>команди</span></h1><p className="subtle">Тут відображаються лише працівники, яких ви реально прийняли.</p></div><button className="sync" onClick={() => void loadEmployees()}>↻ Оновити</button></section>
    <section className="employees-summary"><article className="panel"><p>Усього працівників</p><strong>{employees.length}</strong></article><article className="panel"><p>Відгуків клієнтів</p><strong>{reviewCount}</strong></article><article className="panel"><p>Середній рейтинг</p><strong>{averageRating === "—" ? "—" : `${averageRating} ★`}</strong></article><article className="panel"><p>Статус даних</p><strong className="employee-live">LIVE</strong></article></section>
    {loading ? <article className="panel empty-applications">Завантажуємо працівників…</article> : error ? <article className="panel empty-applications">{error}</article> : employees.length === 0 ? <article className="panel empty-applications">Ще немає прийнятих працівників. Приймайте заявки у розділі «Команда».</article> : <article className="panel employees-table-panel"><div className="panel-head"><div><p className="panel-label">КОМАНДА ПІДТРИМКИ</p><h2>Усі працівники</h2></div></div><div className="team-table employees-table">{employees.map((employee) => {
      const rating = employee.reviews.length ? (employee.reviews.reduce((sum, review) => sum + review.rating, 0) / employee.reviews.length).toFixed(2) : "—";
      const initials = employee.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
      const isOnline = Boolean(employee.last_active_at) && Date.now() - new Date(employee.last_active_at!).getTime() < 90000;
      return <button className="team-row employee-row" key={employee.id} onClick={() => setSelected(employee)}><div className="member"><div className="avatar member-avatar employee-avatar">{employee.avatar_url ? <img src={employee.avatar_url} alt={`Фото ${employee.full_name}`} /> : initials}</div><div><strong>{employee.full_name}</strong><small>{employee.city}</small></div></div><div><small>Рейтинг</small><strong className="rating">{rating === "—" ? "—" : `★ ${rating}`}</strong></div><div><small>Відгуків</small><strong>{employee.reviews.length}</strong></div><span className={`status ${isOnline ? "online" : "break"}`}>{isOnline ? "Онлайн" : "Не в мережі"}</span></button>;
    })}</div></article>}
    {selected && <section className="employee-modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><article className="panel employee-profile" role="dialog" aria-modal="true" aria-label={`Профіль ${selected.full_name}`} onMouseDown={(event) => event.stopPropagation()}><button className="profile-close" onClick={() => setSelected(null)} aria-label="Закрити">×</button><div className="employee-profile-head"><div className="profile-avatar">{selected.avatar_url ? <img src={selected.avatar_url} alt={`Фото ${selected.full_name}`} /> : selected.full_name.slice(0, 1).toUpperCase()}</div><div><p className="panel-label">ПРАЦІВНИК</p><h2>{selected.full_name}</h2><p>{selected.city} · {selected.age} років</p></div></div><div className="employee-info"><span>Телефон<strong>{selected.phone}</strong></span><span>Прийнятий<strong>{new Date(selected.created_at).toLocaleDateString("uk-UA")}</strong></span></div><button className="terminate-employee" onClick={() => void terminateEmployee()} disabled={terminating}>{terminating ? "Звільняємо…" : "Звільнити працівника"}</button><div className="reviews-head"><h3>Відгуки клієнтів</h3><span>{selected.reviews.length}</span></div>{selected.reviews.length === 0 ? <p className="no-reviews">Відгуків ще немає. Вони з’являться після запуску чатів підтримки та оцінювання діалогів.</p> : <div className="reviews-list">{selected.reviews.map((review) => <article className="review" key={review.id}><div><strong>{review.client_name}</strong><span>{"★".repeat(review.rating)}</span></div><p>{review.comment}</p><small>{new Date(review.created_at).toLocaleDateString("uk-UA")}</small></article>)}</div>}</article></section>}
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

  const visibleApplications = applications.filter((application) => view === "archive" ? application.status === "rejected" || application.status === "terminated" : application.status === "pending" || application.status === "approved");

  return <section className="applications-page">
    <section className="heading-row"><div><p className="eyebrow">КОМАНДА</p><h1>Заявки <span>працівників</span></h1><p className="subtle">Перевіряйте дані, фото документа та ухвалюйте рішення.</p></div><button className="sync" onClick={() => void loadApplications()}>↻ Оновити</button></section>
    <div className="application-tabs"><button className={view === "active" ? "selected" : ""} onClick={() => setView("active")}>Активні</button><button className={view === "archive" ? "selected" : ""} onClick={() => setView("archive")}>Архів</button></div>
    {loading ? <article className="panel empty-applications">Завантажуємо заявки…</article> : error ? <article className="panel empty-applications">{error}</article> : visibleApplications.length === 0 ? <article className="panel empty-applications">{view === "archive" ? "В архіві поки немає заявок." : "Нових заявок поки немає."}</article> : <div className="applications-list">{visibleApplications.map((application) => <article className="panel application-card" key={application.id}>
      <div className="application-main"><div className="candidate-details"><div className="face-square">{application.face_photo_url ? <a href={application.face_photo_url} target="_blank" rel="noreferrer"><img src={application.face_photo_url} alt={`Фото обличчя: ${application.full_name}`} /></a> : <span>Фото</span>}</div><div><p className="panel-label">КАНДИДАТ</p><h2>{application.full_name}</h2><p className="application-meta">{application.city} · {application.age} років · {application.phone}</p><p className="application-date">{new Date(application.created_at).toLocaleString("uk-UA")}</p></div></div><span className={`application-status ${application.status}`}>{application.status === "pending" ? "На розгляді" : application.status === "approved" ? "Прийнято" : application.status === "terminated" ? "Звільнено" : "Відхилено"}</span></div>
      <div><small className="document-label">Фото паспорта</small><div className="document-preview">{application.photo_url ? <a href={application.photo_url} target="_blank" rel="noreferrer"><img src={application.photo_url} alt={`Фото паспорта: ${application.full_name}`} /></a> : <span>Фото недоступне</span>}</div></div>
      {application.status === "pending" && <div className="application-actions"><button className="reject" disabled={busyId === application.id} onClick={() => void decide(application.id, "rejected")}>Відхилити</button><button className="approve" disabled={busyId === application.id} onClick={() => void decide(application.id, "approved")}>{busyId === application.id ? "Зберігаємо…" : "Прийняти"}</button></div>}{application.status === "rejected" && <div className="application-actions"><button className="delete-archive" disabled={busyId === application.id} onClick={() => void removeArchived(application.id)}>{busyId === application.id ? "Видаляємо…" : "Видалити"}</button></div>}
    </article>)}</div>}
  </section>;
}

function WorkerStatusScreen({ name, title, text }: { name: string; title: string; text: string }) {
  return <main className="auth-page"><section className="auth-card worker-card"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div><p className="eyebrow">КАБІНЕТ ПРАЦІВНИКА</p><h1>Вітаємо, {name}.<br /><span>{title}</span></h1><p className="auth-copy">{text}</p><div className="worker-status"><i /> Оновлюється автоматично після перезавантаження сторінки</div></section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;
}

type WorkerPortalProfile = { full_name: string; city: string; avatar_url: string | null; ton_usdt_wallet: string | null; reviews: EmployeeReview[]; payouts: WorkerPayout[] };

function WorkerWorkspace({ name }: { name: string }) {
  return <WorkerPortal name={name} />;
}

function WorkerPortal({ name }: { name: string }) {
  const [view, setView] = useState<"chats" | "reviews" | "ratings" | "salary">("chats");
  const [profile, setProfile] = useState<WorkerPortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    if (!token) return;
    void fetch("/api/worker/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (result?.profile) setProfile(result.profile); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    if (!token) return;
    const record = () => void fetch("/api/worker/profile", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    record();
    const interval = window.setInterval(record, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);
  const saveWallet = async (wallet: string) => {
    const value = wallet.trim();
    if (!value) return { ok: false, message: "Вкажіть адресу USDT-гаманця в мережі TON." };
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    if (!token) return { ok: false, message: "Сесія завершилася. Увійдіть ще раз." };
    const response = await fetch("/api/worker/profile", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ton_usdt_wallet: value }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, message: result.error || "Не вдалося зберегти адресу." };
    setProfile((current) => current ? { ...current, ton_usdt_wallet: result.ton_usdt_wallet } : current);
    return { ok: true, message: "Адресу гаманця збережено." };
  };
  useEffect(() => {
    const nav = document.querySelector(".worker-portal-nav");
    if (!nav || nav.querySelector(".worker-salary-nav")) return;
    const button = document.createElement("button");
    button.className = "worker-salary-nav";
    button.textContent = "₮ Зарплата";
    button.onclick = () => setView("salary");
    nav.append(button);
    return () => button.remove();
  }, []);
  useEffect(() => {
    const profileBox = document.querySelector(".worker-profile");
    if (!profileBox || !profile?.ton_usdt_wallet) return;
    profileBox.querySelector(".worker-wallet-address")?.remove();
    const wallet = document.createElement("div");
    wallet.className = "worker-wallet-address";
    wallet.innerHTML = `<small>USDT · TON</small><strong>${profile.ton_usdt_wallet}</strong>`;
    profileBox.insertBefore(wallet, profileBox.querySelector("button"));
    return () => wallet.remove();
  }, [profile]);
  useEffect(() => {
    if (view !== "salary") return;
    const content = document.querySelector(".worker-portal-content");
    if (!content) return;
    content.innerHTML = `<section class="worker-feedback salary-panel"><p class="eyebrow">ЗАРПЛАТА</p><h1>Моя зарплата</h1><article class="panel"><p>Адреса для виплати USDT (TON)</p><label class="salary-wallet-label">USDT гаманець · мережа TON<input class="salary-wallet-input" placeholder="UQ..." autocomplete="off" /></label><div class="salary-wallet-actions"><button class="salary-wallet-save">Зберегти</button><small class="salary-wallet-message">Вкажіть адресу для отримання майбутніх виплат.</small></div></article><article class="panel"><p>Історія виплат</p><strong>—</strong><small>Після першого нарахування тут з’являться дата, сума та статус виплати.</small></article></section>`;
    const payouts = profile?.payouts || [];
    const history = content.querySelector(".salary-panel article:last-child");
    if (history) {
      const pending = payouts.filter((payout) => payout.status === "pending").reduce((sum, payout) => sum + Number(payout.amount), 0);
      history.innerHTML = `<p>Історія виплат</p><strong>${pending ? `${pending.toFixed(2)} USDT` : "—"}</strong><small>${pending ? "Очікує на виплату" : "Немає виплат, що очікують"}</small>${payouts.length ? `<div class="payout-history">${payouts.map((payout) => `<div><span><b>${Number(payout.amount).toFixed(2)} USDT</b><small>${payout.note || "Зарплата"} · ${new Date(payout.created_at).toLocaleDateString("uk-UA")}</small></span><em class="${payout.status}">${payout.status === "paid" ? "Виплачено" : "До сплати"}</em></div>`).join("")}</div>` : ""}`;
    }
    const input = content.querySelector(".salary-wallet-input") as HTMLInputElement | null;
    const button = content.querySelector(".salary-wallet-save") as HTMLButtonElement | null;
    const message = content.querySelector(".salary-wallet-message") as HTMLElement | null;
    if (!input || !button || !message) return;
    input.value = profile?.ton_usdt_wallet || "";
    button.textContent = profile?.ton_usdt_wallet ? "Зберегти зміни" : "Зберегти";
    const onSave = async () => {
      button.disabled = true;
      button.textContent = "Зберігаємо…";
      const result = await saveWallet(input.value);
      message.textContent = result.message;
      message.classList.toggle("error", !result.ok);
      button.disabled = false;
      button.textContent = result.ok ? "Зберегти зміни" : "Зберегти";
    };
    button.addEventListener("click", onSave);
    return () => button.removeEventListener("click", onSave);
  }, [view, profile]);
  const logout = () => {
    ["nezaria_access_token", "nezaria_refresh_token", "nezeriya_access_role", "nezeriya_owner_session"].forEach((key) => { window.sessionStorage.removeItem(key); window.localStorage.removeItem(key); });
    window.location.reload();
  };
  const reviews = profile?.reviews || [];
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2) : "—";
  const avatar = profile?.avatar_url;
  const displayName = profile?.full_name || name;
  return <main className="worker-portal"><aside className="worker-portal-sidebar"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div><nav className="worker-portal-nav"><button className={view === "chats" ? "selected" : ""} onClick={() => setView("chats")}>◉ Чати</button><button className={view === "reviews" ? "selected" : ""} onClick={() => setView("reviews")}>★ Відгуки</button><button className={view === "ratings" ? "selected" : ""} onClick={() => setView("ratings")}>✦ Оцінки</button></nav><div className="worker-profile"><div className="worker-profile-row">{avatar ? <img src={avatar} alt={`Фото ${displayName}`} /> : <span>{displayName.slice(0, 1).toUpperCase()}</span>}<div><strong>{displayName}</strong><small>{profile?.city || "Працівник підтримки"}</small></div></div><button onClick={logout}>Вийти</button></div></aside><section className="worker-portal-content">{view === "chats" ? <SupportDesk /> : loading ? <article className="panel empty-applications">Завантажуємо дані…</article> : view === "reviews" ? <section className="worker-feedback"><p className="eyebrow">ВІДГУКИ</p><h1>Відгуки клієнтів</h1>{reviews.length === 0 ? <article className="panel empty-applications">Відгуків поки немає.</article> : <div className="worker-review-list">{reviews.map((review) => <article className="panel worker-review" key={review.id}><strong>{review.client_name}</strong><span>{"★".repeat(review.rating)}</span><p>{review.comment}</p><small>{new Date(review.created_at).toLocaleDateString("uk-UA")}</small></article>)}</div>}</section> : <section className="worker-feedback"><p className="eyebrow">ОЦІНКИ</p><h1>Рейтинг акаунта</h1><div className="rating-summary"><article className="panel"><p>Середній показник</p><strong>{average === "—" ? "—" : `${average} ★`}</strong></article><article className="panel"><p>Усього оцінок</p><strong>{reviews.length}</strong></article></div><div className="rating-breakdown">{[5,4,3,2,1].map((rating) => <div key={rating}><span>{rating} ★</span><i><b style={{ width: reviews.length ? `${reviews.filter((review) => review.rating === rating).length / reviews.length * 100}%` : "0%" }} /></i><strong>{reviews.filter((review) => review.rating === rating).length}</strong></div>)}</div></section>}</section></main>;
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

function WorkerScreen({ name, onSubmit, onCheckStatus, onPresence }: { name: string; onSubmit: (application: { full_name: string; city: string; age: number; phone: string; ton_usdt_wallet: string }, document: File, facePhoto: File) => Promise<{ ok: boolean; message: string }>; onCheckStatus: () => Promise<"pending" | "approved" | "rejected" | "terminated" | null>; onPresence: () => Promise<void> }) {
  const [form, setForm] = useState({ first_name: name, last_name: "", patronymic: "", city: "", age: "", phone: "", ton_usdt_wallet: "", document_note: "" });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [facePhotoFile, setFacePhotoFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"checking" | "pending" | "approved" | "rejected" | "terminated" | null>("checking");

  useEffect(() => {
    let active = true;
    const checkStatus = () => void onCheckStatus().then((status) => { if (active) setApplicationStatus(status); });
    checkStatus();
    const interval = window.setInterval(checkStatus, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [onCheckStatus]);

  useEffect(() => {
    if (applicationStatus !== "approved") return;
    void onPresence();
    const interval = window.setInterval(() => void onPresence(), 30000);
    return () => window.clearInterval(interval);
  }, [applicationStatus, onPresence]);

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  useEffect(() => {
    if (applicationStatus === "checking" || applicationStatus === "approved" || applicationStatus === "pending" || applicationStatus === "terminated") return;
    const grid = document.querySelector(".worker-card .form-grid");
    if (!grid || grid.querySelector(".ton-wallet-field")) return;
    const field = document.createElement("label");
    field.className = "ton-wallet-field";
    field.append("USDT гаманець (мережа TON) *");
    const input = document.createElement("input");
    input.name = "ton_usdt_wallet";
    input.required = true;
    input.autocomplete = "off";
    input.placeholder = "UQ...";
    input.value = form.ton_usdt_wallet;
    input.addEventListener("input", () => update("ton_usdt_wallet", input.value));
    field.append(input);
    grid.append(field);
    return () => field.remove();
  }, [applicationStatus]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const full_name = `${form.last_name} ${form.first_name} ${form.patronymic}`.trim();
    if (!form.last_name.trim() || !form.first_name.trim() || !form.patronymic.trim() || !form.city.trim() || !form.age || !form.phone.trim() || !form.ton_usdt_wallet.trim() || !documentFile || !facePhotoFile || !consent) {
      setLoading(false);
      setMessage("Додайте обидва фото та підтвердьте згоду на обробку даних.");
      return;
    }
    const result = await onSubmit({ full_name, city: form.city, age: Number(form.age), phone: form.phone, ton_usdt_wallet: form.ton_usdt_wallet.trim() }, documentFile, facePhotoFile);
    setLoading(false);
    setMessage(result.message);
    setSubmitted(result.ok);
    if (result.ok) setApplicationStatus("pending");
  };

  if (applicationStatus === "checking") return <WorkerStatusScreen name={name} title="Перевіряємо заявку…" text="Завантажуємо актуальний статус вашої заявки." />;
  if (applicationStatus === "approved") return <WorkerWorkspace name={name} />;
  if (applicationStatus === "terminated") return <WorkerStatusScreen name={name} title="Співпрацю завершено." text="Ваш доступ до робочого кабінету припинено. Якщо вважаєте це помилкою, зверніться до власника." />;
  if (applicationStatus === "pending") return <WorkerStatusScreen name={name} title="Заявка на розгляді." text="Власник перевіряє ваші дані. Після прийняття тут відкриється робочий кабінет." />;

  return <main className="auth-page"><section className="auth-card worker-card"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div>{submitted ? <><p className="eyebrow">ЗАЯВКУ НАДІСЛАНО</p><h1>Дякуємо,<br /><span>{name}.</span></h1><p className="auth-copy">Власник перевірить вашу заявку. Після схвалення тут відкриється кабінет підтримки.</p><div className="worker-status"><i /> {message}</div></> : <form onSubmit={submit}><p className="eyebrow">АНКЕТА ПРАЦІВНИКА</p><h1>Приєднайтесь<br /><span>до команди.</span></h1><p className="auth-copy">Заповніть дані для розгляду заявки. Усі поля з позначкою * обов’язкові.</p><div className="form-grid"><label>Прізвище *<input value={form.last_name} onChange={(event) => update("last_name", event.target.value)} required /></label><label>Ім’я *<input value={form.first_name} onChange={(event) => update("first_name", event.target.value)} required /></label><label>По батькові *<input value={form.patronymic} onChange={(event) => update("patronymic", event.target.value)} required /></label><label>Місто *<input value={form.city} onChange={(event) => update("city", event.target.value)} required /></label><label>Вік *<input type="number" min="16" max="99" value={form.age} onChange={(event) => update("age", event.target.value)} required /></label><label>Телефон *<input value={form.phone} onChange={(event) => update("phone", event.target.value)} required /></label></div><label className="wide-field">Фото паспорта *<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} required /></label><label className="wide-field">Фото обличчя *<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFacePhotoFile(event.target.files?.[0] || null)} required /></label><label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>Погоджуюсь на обробку моїх персональних даних для розгляду заявки.</span></label><p className="auth-copy">JPG, PNG або WEBP — до 8 МБ кожне.</p><button className="google-button mint-action" disabled={loading}>{loading ? "Надсилаємо…" : "Надіслати заявку"}</button>{message && <p className="auth-error">{message}</p>}</form>}</section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;
}
