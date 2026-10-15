"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type NavItem = "Огляд" | "Користувачі" | "Виграші" | "Магазин" | "Бізнес" | "Фінанси" | "Підтримка" | "Команда" | "Працівники" | "Медійка";
type AccessRole = "owner" | "worker" | "media" | null;
type WorkspaceMode = "ceo" | "admin";
type WorkerApplication = {
  id: string;
  full_name: string;
  city: string;
  age: number;
  phone: string;
  status: "pending" | "approved" | "rejected" | "terminated" | "frozen";
  created_at: string;
  photo_url: string | null;
  face_photo_url: string | null;
};
type EmployeeReview = { id: string; client_name: string; rating: number; comment: string; created_at: string };
type WorkerPayout = { id: string; amount: number; currency: "USDT"; status: "pending" | "paid"; note: string | null; created_at: string; paid_at: string | null };
type EmployeeProfile = {
  id: string; full_name: string; city: string; age: number; phone: string; created_at: string; status: "approved" | "frozen";
  avatar_url: string | null; ton_usdt_wallet: string | null; last_active_at: string | null; reviews: EmployeeReview[]; payouts: WorkerPayout[]; closed_chats: number; first_response_minutes: number | null; daily_activity: number[];
  can_use_chats: boolean; can_view_reviews: boolean; can_view_ratings: boolean; can_view_salary: boolean; can_view_statistics: boolean;
};
type DailyOnlinePeak = { date: string; peakOnline: number };
type WalletMetrics = Record<string, string | number | null> & { dailyOnlinePeaks?: DailyOnlinePeak[] };
type WalletUser = { id: number; username: string; name: string; premium: boolean; nzrPoints: number; walletIds: number[]; referralCount?: number; phoneCountry?: string };
type AcquiringBusiness = { account: string; name: string; type: string; ownership: string; assets: string[]; updatedAt: string | null };
type AcquiringMetrics = { businesses: number; merchants: number; products: number; payments: number; paymentLinks: number; payouts: number };
type WheelWin = { id: number; username: string; name: string; walletId: number; wheel: number; dropped: string; reward: string; createdAt: string; game?: string };
type WheelWinSummary = { monthlyWonNzr: number; monthlyLostNzr: number; monthlyCollectedNzr: number; monthlyNetEarningsNzr: number; monthlyWheelSpentNzr: number; monthlyPlinkoSpentNzr: number; monthlyWheelWonNzr: number; monthlyPlinkoWonNzr: number; monthlySpinsSpentNzr: number; monthlySpinsWonNzr: number; monthlyDoubleSpentNzr: number; monthlyDoubleWonNzr: number };
type SupportMessage = { id: string; sender_type: "client" | "agent" | "system"; body: string; sent_at: string };
type SupportTicket = { id: string; client_name: string; client_username: string | null; status: "new" | "in_progress" | "awaiting_rating" | "closed"; assigned_to: string | null; rating: number | null; review: string | null; created_at: string; updated_at: string; messages: SupportMessage[] };

const navigation: NavItem[] = ["Огляд", "Користувачі", "Виграші", "Магазин", "Бізнес", "Фінанси", "Команда", "Працівники", "Медійка"];
const navGroups: { label: string; items: NavItem[] }[] = [
  { label: "Аналітика", items: ["Огляд", "Користувачі", "Виграші", "Магазин", "Бізнес", "Фінанси"] },
  { label: "Компанія", items: ["Команда", "Працівники", "Медійка"] },
];
const navIcons: Record<NavItem, ReactNode> = {
  "Огляд": <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  "Користувачі": <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18.5 14.8c1.6.8 2.6 2.6 3 5.2" /></>,
  "Виграші": <><path d="M12 3v18" /><path d="M17 7.5c0-1.9-2.2-3-5-3s-5 1.2-5 3.3c0 4.7 10 2.2 10 7 0 2.1-2.2 3.4-5 3.4s-5-1.2-5-3.2" /></>,
  "Магазин": <><path d="M4 8h16l-1.3 11.1a2 2 0 0 1-2 1.9H7.3a2 2 0 0 1-2-1.9L4 8Z" /><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" /></>,
  "Бізнес": <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" /><path d="M3 12.5h18" /></>,
  "Фінанси": <><path d="M3 20h18" /><path d="M6 16v-5M11 16V8M16 16v-3M20 16V5" /></>,
  "Підтримка": <><path d="M4 12a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-6h4" /><path d="M4 13h4v6H6a2 2 0 0 1-2-2v-4Z" /></>,
  "Команда": <><circle cx="12" cy="12" r="3" /><circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="18" r="2" /></>,
  "Працівники": <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="10" r="2.5" /><path d="M8 17c.6-1.8 2.1-3 4-3s3.4 1.2 4 3" /></>,
  "Медійка": <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9.5 5 2.5-5 2.5v-5Z" /></>,
};


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

function formatAccountAge(days: string | number | null | undefined) {
  const value = metricNumber(days);
  if (!value) return "Ще збираємо дані";
  if (value < 30) return `${Math.round(value)} дн.`;
  return `${(value / 30.44).toFixed(1)} міс.`;
}

function formatSessionDuration(seconds: string | number | null | undefined) {
  const value = Math.max(0, Math.round(metricNumber(seconds)));
  if (!value) return "Ще збираємо дані";
  return value >= 60 ? `${Math.floor(value / 60)} хв ${value % 60} с` : `${value} с`;
}

function formatOnlinePeakDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function countryLabel(code: string | undefined) {
  const normalized = String(code || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  const flag = String.fromCodePoint(...[...normalized].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
  const name = new Intl.DisplayNames(["uk"], { type: "region" }).of(normalized) || normalized;
  return { code: normalized, flag, name };
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const SESSION_STORAGE_KEYS = ["nezaria_access_token", "nezaria_refresh_token", "nezeriya_access_role", "nezeriya_owner_session", "nezeriya_workspace_mode", "nezeriya_session_user_id", "nezeriya_session_expires_at"];
const CHAT_RESPONSE_SLA_MS = 15 * 60 * 1000;

function responseTimerState(ticket: SupportTicket | undefined, now: number) {
  if (!ticket || ticket.status !== "in_progress") return null;
  const lastClient = [...ticket.messages].reverse().find((message) => message.sender_type === "client");
  const lastAgent = [...ticket.messages].reverse().find((message) => message.sender_type === "agent");
  const clientAt = lastClient ? Date.parse(lastClient.sent_at) : Number.NaN;
  const agentAt = lastAgent ? Date.parse(lastAgent.sent_at) : Number.NaN;
  if (!Number.isFinite(clientAt) || (Number.isFinite(agentAt) && agentAt >= clientAt)) return null;
  const remaining = clientAt + CHAT_RESPONSE_SLA_MS - now;
  const seconds = Math.floor(Math.abs(remaining) / 1000);
  return { overdue: remaining < 0, value: `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` };
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
  const [financeMonth, setFinanceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [financeTurnoverYear, setFinanceTurnoverYear] = useState(() => new Date().getFullYear());
  const [walletUsers, setWalletUsers] = useState<WalletUser[]>([]);
  const [acquiringMetrics, setAcquiringMetrics] = useState<AcquiringMetrics | null>(null);
  const [acquiringBusinesses, setAcquiringBusinesses] = useState<AcquiringBusiness[]>([]);
  const [acquiringRefreshing, setAcquiringRefreshing] = useState(false);
  const [wheelWins, setWheelWins] = useState<WheelWin[]>([]);
  const [wheelWinSummary, setWheelWinSummary] = useState<WheelWinSummary>({ monthlyWonNzr: 0, monthlyLostNzr: 0, monthlyCollectedNzr: 0, monthlyNetEarningsNzr: 0, monthlyWheelSpentNzr: 0, monthlyPlinkoSpentNzr: 0, monthlyWheelWonNzr: 0, monthlyPlinkoWonNzr: 0, monthlySpinsSpentNzr: 0, monthlySpinsWonNzr: 0, monthlyDoubleSpentNzr: 0, monthlyDoubleWonNzr: 0 });
  const [winsRefreshing, setWinsRefreshing] = useState(false);
  const [usersRefreshing, setUsersRefreshing] = useState(false);
  const [metricsError, setMetricsError] = useState("");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  useEffect(() => {
    if (window.localStorage.getItem("nezeriya_workspace_mode") === "admin") setWorkspaceMode("admin");
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!supabaseUrl || !supabaseKey) {
        setAuthState("signed_out");
        return;
      }
      const persistentKeys = ["nezaria_access_token", "nezaria_refresh_token", "nezeriya_access_role", "nezeriya_owner_session", "nezeriya_session_expires_at"];
      persistentKeys.forEach((key) => {
        const value = window.localStorage.getItem(key);
        if (value && !window.sessionStorage.getItem(key)) window.sessionStorage.setItem(key, value);
        const currentValue = window.sessionStorage.getItem(key);
        if (currentValue && !window.localStorage.getItem(key)) window.localStorage.setItem(key, currentValue);
      });
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const redirectedToken = fragment.get("access_token");
      const redirectedRefreshToken = fragment.get("refresh_token");
      let expiry = Number(window.sessionStorage.getItem("nezeriya_session_expires_at") || window.localStorage.getItem("nezeriya_session_expires_at"));
      if (redirectedToken) {
        expiry = Date.now() + SESSION_DURATION_MS;
        window.sessionStorage.setItem("nezeriya_session_expires_at", String(expiry));
        window.localStorage.setItem("nezeriya_session_expires_at", String(expiry));
      } else if (!Number.isFinite(expiry) || expiry <= 0) {
        expiry = Date.now() + SESSION_DURATION_MS;
        window.sessionStorage.setItem("nezeriya_session_expires_at", String(expiry));
        window.localStorage.setItem("nezeriya_session_expires_at", String(expiry));
      }
      if (expiry <= Date.now()) {
        SESSION_STORAGE_KEYS.forEach((key) => { window.sessionStorage.removeItem(key); window.localStorage.removeItem(key); });
        setAuthState("signed_out");
        return;
      }
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
        const previousUserId = window.sessionStorage.getItem("nezeriya_session_user_id") || window.localStorage.getItem("nezeriya_session_user_id");
        const accountChanged = Boolean(previousUserId && previousUserId !== user.id);
        if (accountChanged) {
          ["nezeriya_access_role", "nezeriya_owner_session", "nezeriya_workspace_mode"].forEach((key) => {
            window.sessionStorage.removeItem(key);
            window.localStorage.removeItem(key);
          });
        }
        window.sessionStorage.setItem("nezeriya_session_user_id", user.id);
        window.localStorage.setItem("nezeriya_session_user_id", user.id);
        setViewerName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Користувач");
        setViewerId(user.id);
        const savedRole = accountChanged ? null : window.sessionStorage.getItem("nezeriya_access_role");
        const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
        setAccessRole(savedRole === "owner" && !ownerSession ? null : savedRole === "owner" || savedRole === "worker" || savedRole === "media" ? savedRole : null);
        setAuthState("signed_in");
      } catch {
        SESSION_STORAGE_KEYS.forEach((key) => {
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
    if (authState !== "signed_in") return;
    const checkExpiry = () => {
      const expiresAt = Number(window.localStorage.getItem("nezeriya_session_expires_at"));
      if (!Number.isFinite(expiresAt) || expiresAt > Date.now()) return;
      SESSION_STORAGE_KEYS.forEach((key) => { window.sessionStorage.removeItem(key); window.localStorage.removeItem(key); });
      setAccessRole(null); setViewerId(""); setWorkspaceMode("ceo"); setAuthState("signed_out");
    };
    checkExpiry();
    const timer = window.setInterval(checkExpiry, 60_000);
    return () => window.clearInterval(timer);
  }, [authState]);

  useEffect(() => {
    if (authState !== "signed_in" || accessRole !== "owner") return;
    let lastRefresh = 0;
    const refreshInactivityWindow = () => {
      if (Date.now() - lastRefresh < 60_000) return;
      lastRefresh = Date.now();
      const expiry = String(Date.now() + SESSION_DURATION_MS);
      window.sessionStorage.setItem("nezeriya_session_expires_at", expiry);
      window.localStorage.setItem("nezeriya_session_expires_at", expiry);
    };
    ["pointerdown", "keydown", "touchstart"].forEach((event) => window.addEventListener(event, refreshInactivityWindow, { passive: true }));
    refreshInactivityWindow();
    return () => ["pointerdown", "keydown", "touchstart"].forEach((event) => window.removeEventListener(event, refreshInactivityWindow));
  }, [authState, accessRole]);

  const financeMonthQuery = (month = financeMonth) => {
    const [year, monthNumber] = month.split("-");
    return /^\d{4}$/.test(year) && /^(0[1-9]|1[0-2])$/.test(monthNumber) ? `year=${year}&month=${Number(monthNumber)}` : "";
  };
  const financeMetricsQuery = (month = financeMonth, turnoverYear = financeTurnoverYear) => [financeMonthQuery(month), `turnoverYear=${turnoverYear}`].filter(Boolean).join("&");

  const loadWalletMetrics = async (month = financeMonth, turnoverYear = financeTurnoverYear) => {
    if (accessRole !== "owner") return;
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    const query = [financeMetricsQuery(month, turnoverYear), `_=${Date.now()}`].filter(Boolean).join("&");
    try {
      const response = await fetch(`/api/owner/metrics?${query}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Metrics unavailable");
      setWalletMetrics(body.metrics || {});
      setMetricsError("");
    } catch (error) {
      const reason = error instanceof Error && error.message !== "Metrics unavailable" && error.message !== "Failed to fetch" ? `: ${error.message}` : "";
      setMetricsError(`Статистика тимчасово недоступна${reason}`);
    }
  };

  useEffect(() => {
    if (accessRole !== "owner") return;
    void loadWalletMetrics();
  }, [accessRole, financeMonth, financeTurnoverYear]);

  useEffect(() => {
    if (accessRole !== "owner") return;
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    void fetch("/api/owner/users", { cache: "no-store", headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession } })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .then(({ ok, body }) => { if (ok) setWalletUsers(Array.isArray(body.items) ? body.items : []); });
  }, [accessRole]);

  const loadWheelWins = async (showNotice = false) => {
    if (accessRole !== "owner") return;
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    setWinsRefreshing(true);
    try {
      const response = await fetch(`/api/owner/wins?_=${Date.now()}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error();
      setWheelWins(Array.isArray(body.items) ? body.items : []);
      const monthlyWonNzr = Number(body.monthlyWonNzr) || 0;
      const monthlyWheelCollectedNzr = Number(body.monthlyWheelCollectedNzr ?? body.monthlyWheelSpentNzr) || 0;
      const monthlyPlinkoCollectedNzr = Number(body.monthlyPlinkoCollectedNzr ?? body.monthlyPlinkoSpentNzr) || 0;
      const monthlyCollectedNzr = Number(body.monthlyCollectedNzr) || monthlyWheelCollectedNzr + monthlyPlinkoCollectedNzr;
      const monthlyNetEarningsNzr = body.monthlyNetEarningsNzr === undefined || body.monthlyNetEarningsNzr === null
        ? monthlyCollectedNzr - monthlyWonNzr
        : Number(body.monthlyNetEarningsNzr) || 0;
      setWheelWinSummary({ monthlyWonNzr, monthlyLostNzr: monthlyNetEarningsNzr, monthlyCollectedNzr, monthlyNetEarningsNzr, monthlyWheelSpentNzr: monthlyWheelCollectedNzr, monthlyPlinkoSpentNzr: monthlyPlinkoCollectedNzr, monthlyWheelWonNzr: Number(body.monthlyWheelWonNzr ?? monthlyWonNzr) || 0, monthlyPlinkoWonNzr: Number(body.monthlyPlinkoWonNzr) || 0, monthlySpinsSpentNzr: Number(body.monthlySpinsSpentNzr) || 0, monthlySpinsWonNzr: Number(body.monthlySpinsWonNzr) || 0, monthlyDoubleSpentNzr: Number(body.monthlyDoubleSpentNzr) || 0, monthlyDoubleWonNzr: Number(body.monthlyDoubleWonNzr) || 0 });
      if (showNotice) { setNotice("Дані виграшів оновлено"); window.setTimeout(() => setNotice(null), 2200); }
    } catch {
      if (showNotice) { setNotice("Не вдалося оновити дані. Спробуйте ще раз."); window.setTimeout(() => setNotice(null), 2600); }
    } finally { setWinsRefreshing(false); }
  };

  useEffect(() => {
    void loadWheelWins();
  }, [accessRole]);

  const refreshUsers = async (showNotice = false) => {
    if (accessRole !== "owner" || usersRefreshing) return;
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    setUsersRefreshing(true);
    try {
      const headers = { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession };
      const [metricsResponse, usersResponse] = await Promise.all([
        fetch(`/api/owner/metrics?${[financeMetricsQuery(), `_=${Date.now()}`].filter(Boolean).join("&")}`, { cache: "no-store", headers }),
        fetch("/api/owner/users", { cache: "no-store", headers }),
      ]);
      const [metricsBody, usersBody] = await Promise.all([metricsResponse.json().catch(() => ({})), usersResponse.json().catch(() => ({}))]);
      if (!metricsResponse.ok || !usersResponse.ok) throw new Error();
      setWalletMetrics(metricsBody.metrics || {});
      setWalletUsers(Array.isArray(usersBody.items) ? usersBody.items : []);
      setMetricsError("");
      if (showNotice) setNotice("Дані користувачів оновлено");
    } catch {
      if (showNotice) setNotice("Не вдалося оновити дані користувачів");
    } finally {
      setUsersRefreshing(false);
      if (showNotice) window.setTimeout(() => setNotice(null), 2600);
    }
  };

  const removeAcquiringBusiness = async (business: AcquiringBusiness) => {
    if (!window.confirm(`Прибрати бізнес «${business.name}» (акаунт ${business.account}) зі сховища еквайрингу? Його товари, оплати й посилання теж буде видалено. Цю дію не можна скасувати.`)) return;
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    const response = await fetch("/api/owner/acquiring", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-owner-session": ownerSession }, body: JSON.stringify({ account: business.account, name: business.name }) }).catch(() => null);
    setNotice(response?.ok ? `Бізнес «${business.name}» прибрано` : "Не вдалося прибрати бізнес");
    window.setTimeout(() => setNotice(null), 2600);
    if (response?.ok) await loadAcquiringMetrics();
  };

  const loadAcquiringMetrics = async (showNotice = false) => {
    if (accessRole !== "owner" || acquiringRefreshing) return;
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    setAcquiringRefreshing(true);
    try {
      const response = await fetch(`/api/owner/acquiring?_=${Date.now()}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error();
      setAcquiringMetrics(body.metrics || null);
      setAcquiringBusinesses(Array.isArray(body.businesses) ? body.businesses : []);
      if (showNotice) setNotice("Дані еквайрингу оновлено");
    } catch {
      if (showNotice) setNotice("Не вдалося оновити дані еквайрингу");
    } finally {
      setAcquiringRefreshing(false);
      if (showNotice) window.setTimeout(() => setNotice(null), 2600);
    }
  };

  useEffect(() => { void loadAcquiringMetrics(); }, [accessRole]);

  useEffect(() => {
    if (accessRole !== "owner") return;
    const refreshMetricsOnly = async () => {
      if (document.visibilityState !== "visible") return;
      const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
      const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session");
      if (!token || !ownerSession) return;
      try {
        const response = await fetch(`/api/owner/metrics?${[financeMetricsQuery(), `_=${Date.now()}`].filter(Boolean).join("&")}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession } });
        const body = await response.json().catch(() => ({}));
        if (response.ok) { setWalletMetrics(body.metrics || {}); setMetricsError(""); }
      } catch { /* Keep the last confirmed metrics visible while the API reconnects. */ }
    };
    const sync = () => {
      if (active === "Користувачі") void refreshUsers();
      else if (active === "Бізнес") void loadAcquiringMetrics();
      else if (active === "Виграші") void loadWheelWins();
      else void refreshMetricsOnly();
    };
    sync();
    const timer = window.setInterval(sync, 15_000);
    const visibility = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [accessRole, active, financeMonth, financeTurnoverYear]);

  const refresh = () => {
    setUpdated("Дані синхронізовано щойно");
    void refreshUsers(true);
    void loadWheelWins();
  };

  const fallbackWheelNet = wheelWinSummary.monthlyWheelSpentNzr - wheelWinSummary.monthlyWheelWonNzr;
  const fallbackPlinkoNet = wheelWinSummary.monthlyPlinkoSpentNzr - wheelWinSummary.monthlyPlinkoWonNzr;
  const fallbackFeature = fallbackWheelNet >= fallbackPlinkoNet ? "Рулетка" : "Plinko";
  const fallbackFeatureValue = Math.max(fallbackWheelNet, fallbackPlinkoNet);

  const signInWithGoogle = () => {
    if (!supabaseUrl) {
      setNotice("Підключення до авторизації ще налаштовується");
      return;
    }
    const redirectTo = encodeURIComponent(`${window.location.origin}/admin`);
    window.location.assign(`${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}&prompt=select_account`);
  };

  const verifyOwnerCode = async (code: string, twoFactorCode = "") => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    if (!token) return "Сесія Google завершилась. Вийди й увійди знову.";
    const response = await fetch("/api/owner/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, twoFactorCode }),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})) as { error?: string };
      if (failure.error) return failure.error;
      return response.status === 401
        ? "Сервер не прийняв вхід: перевір ключі OWNER_ACCESS_CODE та Supabase на Render або увійди через Google знову."
        : "Невірний код доступу власника.";
    }
    const result = await response.json();
    if (typeof result.ownerSession !== "string") return "Сервер не повернув сесію. Спробуй ще раз.";
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
  const selectMedia = () => {
    window.sessionStorage.setItem("nezeriya_access_role", "media");
    window.localStorage.setItem("nezeriya_access_role", "media");
    setAccessRole("media");
  };
  const returnToRoleChoice = () => {
    ["nezeriya_access_role", "nezeriya_owner_session"].forEach((key) => {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    });
    setAccessRole(null);
  };

  const signOut = async () => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    if (supabaseUrl && supabaseKey && token) {
      await fetch(`${supabaseUrl}/auth/v1/logout`, { method: "POST", headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } }).catch(() => undefined);
    }
    SESSION_STORAGE_KEYS.forEach((key) => {
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
    return status === "pending" || status === "approved" || status === "rejected" || status === "terminated" || status === "frozen" ? status : null;
  };

  const cancelWorkerApplication = async () => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    if (!token) return { ok: false, message: "Не вдалося перевірити ваш вхід. Увійдіть ще раз." };
    const response = await fetch("/api/worker/application", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    return response.ok ? { ok: true, message: "Заявку відмінено. Ви можете подати нову." } : { ok: false, message: result.error || "Не вдалося відмінити заявку." };
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
    return <RoleScreen name={viewerName} onOwnerCode={verifyOwnerCode} onWorker={selectWorker} onMedia={selectMedia} />;
  }

  if (accessRole === "worker") {
    return <WorkerScreen name={viewerName} onSubmit={submitWorkerApplication} onCheckStatus={getWorkerApplicationStatus} onCancelApplication={cancelWorkerApplication} onPresence={sendWorkerPresence} />;
  }
  if (accessRole === "media") return <MediaScreen onBack={returnToRoleChoice} />;

  return (
    <main className="shell">
      <aside className="sidebar side2">
        <div className="side2-brand">NEZERIYA</div>
        <div className="side2-switch" role="group" aria-label="Режим"><button className={workspaceMode === "ceo" ? "selected" : ""} onClick={() => switchWorkspace("ceo")}>CEO</button><button className={workspaceMode === "admin" ? "selected" : ""} onClick={() => switchWorkspace("admin")}>Admin</button></div>
        <nav className="side2-nav" aria-label="Головна навігація">
          {(workspaceMode === "ceo" ? navGroups : [{ label: "Підтримка", items: ["Підтримка"] as NavItem[] }]).map((group) => <div className="side2-group" key={group.label}>
            <p className="side2-label">{group.label}</p>
            {group.items.map((item) => (
              <button key={item} onClick={() => setActive(item)} className={`side2-item ${active === item ? "active" : ""}`}>
                <svg viewBox="0 0 24 24" aria-hidden="true">{navIcons[item]}</svg>{item}
              </button>
            ))}
          </div>)}
        </nav>
        <div className="sidebar-bottom"><AccountMenu name={viewerName} role="Власник" onSignOut={() => void signOut()} onNicknameChange={setViewerName} /></div>
      </aside>

      <section className="content">

        <div className="dashboard">
          {workspaceMode === "admin" ? <SupportAdminPanel onPresence={setSupportPresence} /> : active === "Медійка" ? <MediaOwnerPanel /> : active === "Команда" ? <ApplicationsPanel /> : active === "Працівники" ? <EmployeesPanel /> : active === "Користувачі" ? <UsersPanel walletMetrics={walletMetrics} users={walletUsers} refreshing={usersRefreshing} onRefresh={() => void refreshUsers(true)} /> : active === "Виграші" ? <WinsPanel wins={wheelWins} summary={wheelWinSummary} refreshing={winsRefreshing} onRefresh={() => void loadWheelWins(true)} onSilentRefresh={() => void loadWheelWins()} /> : active === "Магазин" ? <ShopPanel walletMetrics={walletMetrics} /> : active === "Бізнес" ? <BusinessPanel metrics={acquiringMetrics} businesses={acquiringBusinesses} refreshing={acquiringRefreshing} onRefresh={() => void loadAcquiringMetrics(true)} onRemove={(business) => void removeAcquiringBusiness(business)} /> : active === "Фінанси" ? <FinancePanel walletMetrics={walletMetrics} selectedMonth={financeMonth} selectedTurnoverYear={financeTurnoverYear} onSelectedMonthChange={setFinanceMonth} onSelectedTurnoverYearChange={setFinanceTurnoverYear} /> : <OverviewPanel walletMetrics={walletMetrics} metricsError={metricsError} fallbackFeature={fallbackFeature} fallbackFeatureValue={fallbackFeatureValue} period={period} onPeriod={setPeriod} refreshing={usersRefreshing} onRefresh={refresh} onOpenSupport={() => { setActive("Підтримка"); setNotice("Чергу звернень відкрито"); }} />}
        </div>
      </section>
      {notice && <div className="toast">✓ {notice}</div>}
    </main>
  );
}

const ovIcons = {
  box: <><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" /><path d="m3 7 9 5 9-5M12 12v10" /></>,
  arrow: <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /></>,
  trophy: <><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 6h3v1a3 3 0 0 1-3 3M7 6H4v1a3 3 0 0 0 3 3" /></>,
};

function OverviewPanel({ walletMetrics, metricsError, fallbackFeature, fallbackFeatureValue, period, onPeriod, refreshing, onRefresh, onOpenSupport }: { walletMetrics: WalletMetrics | null; metricsError: string; fallbackFeature: string; fallbackFeatureValue: number; period: string; onPeriod: (period: string) => void; refreshing: boolean; onRefresh: () => void; onOpenSupport: () => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const m = walletMetrics;
  const featureValue = m?.mostProfitableValueNzr === null || m?.mostProfitableValueNzr === undefined ? fallbackFeatureValue : m.mostProfitableValueNzr;
  const kpis = [
    { icon: "box" as const, tone: "mint", label: "Загальна комісія", value: m ? displayMetric(m.totalCommission, "$") : "—", unit: "" },
    { icon: "arrow" as const, tone: "blue", label: "Комісія за місяць", value: m ? displayMetric(m.monthlyCommission, "$") : "—", unit: "" },
    { icon: "star" as const, tone: "gold", label: "Дохід Telegram Stars", value: m ? displayMetric(m.monthlyStars) : "—", unit: "NZR" },
    { icon: "users" as const, tone: "blue", label: "Зареєстровані користувачі", value: m ? displayMetric(m.users) : "—", unit: "" },
    { icon: "trophy" as const, tone: "mint", label: "Найприбутковіша функція", value: m ? String(m.mostProfitableFeature || fallbackFeature) : "—", unit: m ? `${displayMetric(featureValue)} NZR` : "" },
  ];
  const walletRows: [string, string, boolean?][] = [
    ["Гаманців", displayMetric(m?.wallets)], ["Транзакцій", displayMetric(m?.transactions)],
    ["Невдалих транзакцій", displayMetric(m?.failedTransactions), true], ["DeDust swap", displayMetric(m?.dedustSwaps)],
    ["Реферальний дохід", displayMetric(m?.referralTotal, "$")], ["Втрати рулетки", m ? `${displayMetric(m.wheelLoss)} NZR` : "—"],
  ];
  const nzrRows: [string, string][] = [
    ["NZR транзакцій", displayMetric(m?.nzrTransactions)], ["Продажі NZR", displayMetric(m?.nzrSwapSell)],
    ["Купівлі NZR", displayMetric(m?.nzrSwapBuy)], ["Покупки NZR за Stars", displayMetric(m?.nzrStars)],
  ];
  const totalIncome = m ? displayMetric(metricNumber(m.totalCommission) + metricNumber(m.nzrExchangeNetUsd), "$") : "—";
  const peaks = m?.dailyOnlinePeaks || [];
  const values = peaks.map((item) => metricNumber(item.peakOnline));
  const max = Math.max(0, ...values);
  const top = Math.max(2, Math.ceil(max / 2) * 2);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const step = Math.max(1, Math.ceil(peaks.length / 6));
  const shortDate = (value: string) => { const [, month, day] = value.split("-"); return day && month ? `${day}.${month}` : value; };
  const axis = peaks.flatMap((item, index) => index % step === 0 || index === peaks.length - 1 ? [index === peaks.length - 1 ? "Сьогодні" : shortDate(item.date)] : []);
  const hoveredPeak = hovered === null ? null : peaks[hovered];
  return <section className="ov">
    <header className="ov-head">
      <div><p className="ov-eyebrow">Операційна панель</p><h1>Огляд <span>Nezeriya Wallet</span></h1></div>
      <div className="ov-actions">
        <NotificationBell role="owner" owner />
        <span className="ov-live"><i />Live</span>
        <div className="ov-segment" role="group" aria-label="Період">{["7 днів", "30 днів", "Рік"].map((item) => <button key={item} className={period === item ? "selected" : ""} onClick={() => onPeriod(item)}>{item}</button>)}</div>
        <button className={`ov-btn${refreshing ? " spin" : ""}`} onClick={onRefresh} disabled={refreshing}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 3v5h5" /><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 21v-5h-5" /></svg>Синхронізувати</button>
      </div>
    </header>

    {metricsError && <p className="metrics-error">{metricsError}</p>}

    <section className="ov-kpis" aria-label="Ключові показники">
      {kpis.map((kpi) => <article className="ov-kpi" key={kpi.label}>
        <div className="ov-kpi-top"><span className={`ov-ic ov-${kpi.tone}`}><svg viewBox="0 0 24 24" aria-hidden="true">{ovIcons[kpi.icon]}</svg></span><span>{kpi.label}</span></div>
        <div className="ov-kpi-value">{kpi.value}{kpi.unit && <small>{kpi.unit}</small>}</div>
      </article>)}
    </section>

    <section className="ov-ops">
      <article className="ov-card">
        <p className="ov-eyebrow">Операції гаманця</p><h2>Детальна статистика</h2>
        <dl className="ov-kv">{walletRows.map(([label, value, warn]) => <div key={label}><dt>{label}</dt><dd className={warn ? "warn" : ""}>{value}</dd></div>)}</dl>
      </article>
      <article className="ov-card">
        <p className="ov-eyebrow">NZR</p><h2>Активність токена</h2>
        <dl className="ov-kv">{nzrRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </article>
      <article className="ov-card ov-earn">
        <div><p className="ov-eyebrow">Заробіток</p><h2>Загальна сума доходу</h2></div>
        <strong>{totalIncome}</strong>
        <p className="ov-note">Комісії + Stars за курсом Fragment − успішні викупи NZR</p>
      </article>
    </section>

    <section className="ov-bottom">
      <article className="ov-card ov-chart-card">
        <div className="ov-card-head">
          <div><p className="ov-eyebrow">Жива активність</p><h2>Зараз у гаманці</h2></div>
          <div className="ov-online"><b>{m ? displayMetric(m.onlineUsers) : "—"}</b><span>онлайн зараз</span></div>
        </div>
        <div className="ov-chart-meta"><span>Пік одночасно онлайн за кожен день</span><span>Макс: <b>{displayMetric(max)}</b> · Середнє: <b>{average.toFixed(1).replace(".", ",")}</b></span></div>
        <div className="ov-chart">
          <div className="ov-grid">{[top, top / 2, 0].map((value) => <div key={value}><span>{displayMetric(value)}</span></div>)}</div>
          {peaks.length ? <div className="ov-bars" onMouseLeave={() => setHovered(null)}>{peaks.map((item, index) => {
            const label = `${formatOnlinePeakDate(item.date)} — максимум ${values[index]} онлайн`;
            return <button type="button" key={item.date} className={`ov-bar${index === peaks.length - 1 ? " today" : ""}`} aria-label={label} onMouseEnter={() => setHovered(index)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)}><i style={{ height: `${Math.max(1.5, values[index] / top * 100)}%` }} /></button>;
          })}</div> : <p className="ov-empty">Дані з’являться після першої активної сесії.</p>}
          {hoveredPeak && hovered !== null && <div className="ov-tip" style={{ left: `calc(28px + (100% - 28px) * ${(hovered + .5) / peaks.length})` }}>{formatOnlinePeakDate(hoveredPeak.date)} · пік <b>{displayMetric(hoveredPeak.peakOnline)}</b> онлайн</div>}
        </div>
        <div className="ov-axis">{axis.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
      </article>

      <article className="ov-card ov-support">
        <div className="ov-card-head"><div><p className="ov-eyebrow">Підтримка</p><h2>Черга звернень</h2></div><span className="ov-badge">12</span></div>
        <div className="ov-support-mid"><strong>03:42</strong><span>середній час відповіді</span></div>
        <div className="ov-support-bar">
          <div className="ov-track"><i style={{ width: "66.7%" }} /></div>
          <div><span><b>8</b> у роботі</span><span><b>4</b> очікують</span></div>
        </div>
        <button className="ov-btn ov-btn-block" onClick={onOpenSupport}>Відкрити звернення<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
      </article>
    </section>
  </section>;
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

type SupStatus = SupportTicket["status"];
const supStatusLabel: Record<SupStatus, string> = { new: "Нове", in_progress: "У роботі", awaiting_rating: "Оцінка", closed: "Закрито" };
const supStatusOrder: Record<SupStatus, number> = { new: 0, in_progress: 1, awaiting_rating: 2, closed: 3 };
const supTonAddress = /^(UQ|EQ|0:)[A-Za-z0-9_-]{40,64}$/;
const supQuickReplies = [
  { title: "Привітання", text: "Вітаємо вас у технічній підтримці Nezeriya Wallet. Опишіть, будь ласка, вашу проблему — ми допоможемо." },
  { title: "Статус платежу", text: "Перевіряємо інформацію щодо платежу. Будь ласка, надішліть ID транзакції або скріншот операції." },
  { title: "Telegram Stars", text: "Щоб перевірити поповнення Telegram Stars, надішліть, будь ласка, скріншот або номер операції." },
  { title: "Технічна проблема", text: "Опишіть проблему детальніше та надішліть скріншот. Це допоможе нам швидше знайти рішення." },
  { title: "Ще питання?", text: "Чи можу я ще чимось допомогти?" },
];

function supInitials(name: string) {
  const letters = name.replace(/^@/, "").replace(/[^\p{L}\p{N}]/gu, "");
  return (letters.slice(0, 2) || "?").toUpperCase();
}

function supDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Сьогодні";
  if (diff === 1) return "Вчора";
  return date.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
}

function supTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
}

function supShortTime(value: string) {
  const day = supDay(value);
  if (day === "Сьогодні") return supTime(value);
  if (day === "Вчора") return "вчора";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
}

function SupAvatar({ ticket, size = "" }: { ticket: SupportTicket; size?: "" | "lg" | "xl" }) {
  return <span className={`sup-av ${size}`} data-st={ticket.status} style={{ background: regColors[regHash(ticket.id) % regColors.length] }}>{supInitials(ticket.client_name || ticket.client_username || "?")}</span>;
}

function SupportDesk({ available, onAvailability }: { available?: boolean; onAvailability?: () => void }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<"all" | SupStatus>("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // On narrow screens the client card overlays the chat, so it starts closed.
  const [showInfo, setShowInfo] = useState(() => typeof window === "undefined" || window.innerWidth > 1280);
  const [statusMenu, setStatusMenu] = useState(false);
  const [copied, setCopied] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  const headers = () => {
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    return { Authorization: `Bearer ${token || ""}`, ...(ownerSession ? { "x-owner-session": ownerSession } : {}) };
  };
  const load = async (sync = true) => {
    try {
      const response = await fetch(`/api/support/tickets${sync ? "?sync=1" : ""}`, { headers: headers() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setError(result.error || "Не вдалося завантажити звернення.");
      else {
        const nextTickets: SupportTicket[] = result.tickets || [];
        setTickets(nextTickets);
        setError("");
        setSelectedId((current) => current && nextTickets.some((ticket) => ticket.id === current) ? current : "");
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 5000); return () => window.clearInterval(interval); }, []);
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(interval); }, []);
  useEffect(() => {
    if (!statusMenu) return;
    const close = () => setStatusMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [statusMenu]);

  const counts = { all: tickets.length, new: 0, in_progress: 0, awaiting_rating: 0, closed: 0 };
  tickets.forEach((ticket) => { counts[ticket.status] += 1; });
  const needle = query.trim().toLowerCase();
  const lastOf = (ticket: SupportTicket) => ticket.messages.at(-1);
  const lastAt = (ticket: SupportTicket) => Date.parse(lastOf(ticket)?.sent_at || ticket.updated_at) || 0;
  const list = tickets.filter((ticket) => {
    if (tab !== "all" && ticket.status !== tab) return false;
    if (!needle) return true;
    return [ticket.client_name, ticket.client_username || "", ...ticket.messages.map((item) => item.body)].join(" ").toLowerCase().includes(needle);
  }).sort((a, b) => supStatusOrder[a.status] - supStatusOrder[b.status] || lastAt(b) - lastAt(a));
  const desktopDefault = typeof window !== "undefined" && window.innerWidth > 860 ? list[0] : undefined;
  const selected = tickets.find((ticket) => ticket.id === selectedId) || (selectedId ? undefined : desktopDefault);
  const responseTimer = responseTimerState(selected, now);
  const messageCount = selected?.messages.length || 0;

  useEffect(() => {
    const box = messagesRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [selected?.id, messageCount]);

  const open = (ticket: SupportTicket) => { setSelectedId(ticket.id); setConfirmClose(false); setMessage(""); if (window.innerWidth <= 1280) setShowInfo(false); };
  const action = async (actionName: "take" | "send" | "close", text = message) => {
    if (!selected || busy) return;
    if (actionName === "send" && !text.trim()) return;
    setBusy(true);
    const response = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json", ...headers() }, body: JSON.stringify({ action: actionName, ticketId: selected.id, message: text }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "Не вдалося виконати дію.");
    else {
      setError("");
      if (actionName === "send") setMessage("");
      setSelectedId(selected.id);
      await load(false);
    }
    setConfirmClose(false);
    setBusy(false);
  };
  const closeChat = () => {
    if (!confirmClose) { setConfirmClose(true); window.setTimeout(() => setConfirmClose(false), 3000); return; }
    void action("close");
  };
  const copy = (value: string) => {
    const done = () => { setCopied(value); window.setTimeout(() => setCopied((current) => current === value ? "" : current), 1200); };
    if (navigator.clipboard) void navigator.clipboard.writeText(value).then(done, done);
    else done();
  };

  const thread: ReactNode[] = [];
  if (selected) {
    // Messages from the same side within five minutes form one group: the time
    // is shown only under the last message of the group.
    const sameGroup = (first: SupportMessage | undefined, second: SupportMessage | undefined) => Boolean(first && second && first.sender_type !== "system" && first.sender_type === second.sender_type && supDay(first.sent_at) === supDay(second.sent_at) && Date.parse(second.sent_at) - Date.parse(first.sent_at) < 5 * 60_000);
    let previousDay = "";
    selected.messages.forEach((item, index) => {
      const previous = selected.messages[index - 1];
      const day = supDay(item.sent_at);
      const newDay = Boolean(day && day !== previousDay);
      if (newDay) { thread.push(<div className="sup-day" key={`day-${item.id}`}>{day}</div>); previousDay = day; }
      if (item.sender_type === "system") { thread.push(<div className="sup-sys" key={item.id}>{item.body}</div>); return; }
      const startsGroup = !sameGroup(previous, item);
      const continues = sameGroup(item, selected.messages[index + 1]);
      const text = item.body.trim();
      thread.push(<div className={`sup-m ${item.sender_type === "agent" ? "out" : "in"}${startsGroup && !newDay && previous?.sender_type !== "system" && previous ? " gap" : ""}${continues ? " cont" : ""}`} key={item.id}>
        {supTonAddress.test(text)
          ? <div className="sup-addr"><small>TON-адреса</small><div><code>{text}</code><button className={`sup-cp${copied === text ? " ok" : ""}`} aria-label="Копіювати адресу" onClick={() => copy(text)}>{regCopyIcon}</button></div></div>
          : <div className="sup-bub">{item.body}</div>}
        <span className="sup-meta">{item.sender_type === "agent" ? "Підтримка · " : ""}{supTime(item.sent_at)}</span>
      </div>);
    });
  }

  return <section className="sup">
    <header className="sup-head">
      <div><p className="ov-eyebrow">Nezeriya Admin</p><h1>Чати <span>підтримки</span></h1></div>
      <div className="sup-stats" aria-label="Статистика">
        <div><i className="sup-dot new" /><b>{counts.new}</b><span>нових</span></div>
        <div><i className="sup-dot in_progress" /><b>{counts.in_progress}</b><span>у роботі</span></div>
        <div><i className="sup-dot awaiting_rating" /><b>{counts.awaiting_rating}</b><span>на оцінці</span></div>
        <div><b>{counts.all}</b><span>усього</span></div>
      </div>
      {onAvailability && <div className="sup-op">
        <button className={`sup-op-btn${available ? "" : " off"}`} aria-haspopup="menu" aria-expanded={statusMenu} onClick={(event) => { event.stopPropagation(); setStatusMenu((current) => !current); }}>
          <i />{available ? "Доступний" : "Не в мережі"}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {statusMenu && <div className="sup-op-menu" role="menu">
          <button role="menuitem" onClick={() => { if (!available) onAvailability(); setStatusMenu(false); }}><i />Доступний<small>отримую нові чати</small></button>
          <button role="menuitem" onClick={() => { if (available) onAvailability(); setStatusMenu(false); }}><i className="off" />Не в мережі<small>чати не призначаються</small></button>
        </div>}
      </div>}
    </header>

    {error && <p className="sup-error">{error}</p>}

    <div className={`sup-body${selected ? " show-thread" : ""}${selected && showInfo ? "" : " no-info"}`}>
      <section className="sup-pane sup-list-pane" aria-label="Список чатів">
        <div className="sup-list-top">
          <label className="reg-search sup-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" value={query} placeholder="Пошук чату або повідомлення" autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="sup-tabs" role="tablist">{([["all", "Усі"], ["new", "Нові"], ["in_progress", "У роботі"], ["awaiting_rating", "Оцінка"]] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}<i>{counts[value]}</i></button>)}</div>
        </div>
        {loading ? <p className="sup-list-empty">Синхронізуємо чати…</p> : list.length === 0 ? <p className="sup-list-empty">{tickets.length ? "Нічого не знайдено" : "Нових звернень поки немає"}</p> : <ul className="sup-list">{list.map((ticket) => {
          const last = lastOf(ticket);
          return <li key={ticket.id}><button className={`sup-item${selected?.id === ticket.id ? " active" : ""}`} onClick={() => open(ticket)}>
            <SupAvatar ticket={ticket} />
            <span className="sup-item-name">{ticket.client_name || "Без імені"}</span>
            <span className="sup-item-time">{supShortTime(last?.sent_at || ticket.updated_at)}</span>
            <span className="sup-item-last">{last?.sender_type === "agent" && <b>Ви: </b>}{last?.body || "Нове звернення"}</span>
            <span className={`sup-pill ${ticket.status} small`}>{supStatusLabel[ticket.status]}</span>
          </button></li>;
        })}</ul>}
      </section>

      <section className="sup-pane sup-thread-pane" aria-label="Діалог">
        {!selected ? <div className="sup-thread-empty">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
          <b>Оберіть чат зліва</b>
          <span>Нові звернення позначені жовтою крапкою</span>
        </div> : <>
          <div className="sup-th-head">
            <button className="sup-icon-btn sup-back" aria-label="До списку чатів" onClick={() => setSelectedId("")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg></button>
            <SupAvatar ticket={selected} size="lg" />
            <div className="sup-who"><b>{selected.client_name || "Без імені"}</b><span>{selected.client_username ? `@${selected.client_username}` : "Telegram"}</span></div>
            <span className={`sup-pill ${selected.status}`}>{supStatusLabel[selected.status]}</span>
            {responseTimer && <span className={`sup-timer${responseTimer.overdue ? " overdue" : ""}`}>{responseTimer.overdue ? "Прострочено" : "Відповісти за"} {responseTimer.value}</span>}
            <div className="sup-th-actions">
              {selected.status === "new" && <button className="sup-primary" disabled={busy} onClick={() => void action("take")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>Взяти в роботу</button>}
              {selected.status === "in_progress" && <button className={`sup-ghost${confirmClose ? " confirm" : ""}`} disabled={busy} onClick={closeChat}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m9 12 2 2 4-4" /></svg>{confirmClose ? "Точно закрити?" : "Закрити діалог"}</button>}
              <button className="sup-icon-btn" aria-label="Інформація про клієнта" aria-pressed={showInfo} onClick={() => setShowInfo((current) => !current)}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg></button>
            </div>
          </div>

          <div className="sup-msgs" ref={messagesRef} aria-live="polite">{thread}</div>

          <div className="sup-composer">
            {selected.status === "in_progress" ? <>
              <div className="sup-quick">{supQuickReplies.map((reply) => <button key={reply.title} type="button" onClick={() => setMessage((current) => (current.trim() ? `${current.trim()} ` : "") + reply.text)}>{reply.title}</button>)}</div>
              <form className="sup-input" onSubmit={(event) => { event.preventDefault(); void action("send"); }}>
                <textarea rows={1} value={message} maxLength={4000} placeholder="Напишіть відповідь…  Enter — надіслати, Shift+Enter — новий рядок" onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void action("send"); } }} />
                <button className="sup-send" type="submit" aria-label="Надіслати" disabled={busy || !message.trim()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-6 16-3-7-7-1Z" /></svg></button>
              </form>
            </> : <div className="sup-locked">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              <span>{selected.status === "new" ? "Візьміть чат у роботу, щоб відповісти клієнту" : selected.status === "awaiting_rating" ? `Діалог закрито · ${selected.rating ? `оцінка клієнта ${selected.rating} з 5` : "очікуємо оцінку клієнта"}` : "Діалог завершено"}</span>
            </div>}
          </div>
        </>}
      </section>

      {selected && showInfo && <aside className="sup-pane sup-info" aria-label="Клієнт">
        <button className="sup-icon-btn sup-info-close" aria-label="Закрити картку клієнта" onClick={() => setShowInfo(false)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        <div className="sup-info-top"><SupAvatar ticket={selected} size="xl" /><b>{selected.client_name || "Без імені"}</b><span>{selected.client_username ? `@${selected.client_username}` : "Telegram"}</span></div>
        <dl className="sup-kv">
          {selected.client_username && <div><dt>Username</dt><dd>@{selected.client_username}<button className={`sup-cp${copied === `@${selected.client_username}` ? " ok" : ""}`} aria-label="Копіювати username" onClick={() => copy(`@${selected.client_username}`)}>{regCopyIcon}</button></dd></div>}
          <div><dt>Статус</dt><dd><span className={`sup-pill ${selected.status} small`}>{supStatusLabel[selected.status]}</span></dd></div>
          <div><dt>Відкрито</dt><dd>{supDay(selected.created_at)}, {supTime(selected.created_at)}</dd></div>
          <div><dt>Остання активність</dt><dd>{supDay(selected.updated_at)}, {supTime(selected.updated_at)}</dd></div>
          <div><dt>Повідомлень</dt><dd>{selected.messages.length}</dd></div>
          <div><dt>Оператор</dt><dd>{selected.assigned_to ? "Призначено" : "—"}</dd></div>
        </dl>
        {selected.status === "awaiting_rating" && <div className="sup-rating">{selected.rating ? <><span>Оцінка клієнта</span><span className="sup-stars">{"★".repeat(selected.rating)}<i>{"★".repeat(Math.max(0, 5 - selected.rating))}</i></span></> : <span>Очікуємо оцінку клієнта</span>}</div>}
        {selected.review && <p className="sup-review">«{selected.review}»</p>}
      </aside>}
    </div>
  </section>;
}

function ShopPanel({ walletMetrics: _walletMetrics }: { walletMetrics: WalletMetrics | null }) {
  return <section className="finance-page">
    <section className="heading-row"><div><p className="eyebrow">МАГАЗИН</p><h1>Колекції <span>Nezeriya Wallet</span></h1><p className="subtle">Незабаром тут з&apos;являться колекції.</p></div></section>
    <article className="panel empty-applications"><p className="panel-label">СКОРО</p><h2>Колекції в розробці</h2><p>Коли колекції будуть готові, тут з&apos;являться їхні картки, ціна та можливість придбати.</p></article>
  </section>;
}

function BusinessPanel({ metrics, businesses, refreshing, onRefresh, onRemove }: { metrics: AcquiringMetrics | null; businesses: AcquiringBusiness[]; refreshing: boolean; onRefresh: () => void; onRemove: (business: AcquiringBusiness) => void }) {
  const value = (key: keyof AcquiringMetrics) => metrics ? displayMetric(metrics[key]) : "—";
  const date = (value: string | null) => value ? new Date(value).toLocaleString("uk-UA", { timeZone: "Europe/Kyiv", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  return <section className="users-page">
    <section className="heading-row"><div><p className="eyebrow">ЕКВАЙРИНГ</p><h1>Бізнеси <span>Nezeriya Pay</span></h1><p className="subtle">Усі створені профілі бізнесів синхронізуються зі сховищем еквайрингу.</p></div><div className="heading-actions"><button className="outline-button" type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? "Оновлення..." : "↻ Оновити"}</button><span className="live"><i /> LIVE</span></div></section>
    <section className="users-summary"><article className="panel users-primary"><p>Створено бізнесів</p><strong>{value("businesses")}</strong><span>Усі бізнес-профілі в еквайрингу</span></article><article className="panel"><p>Акаунти еквайрингу</p><strong>{value("merchants")}</strong><span>Унікальні власники бізнесів</span></article><article className="panel"><p>Товари</p><strong>{value("products")}</strong><span>Додано до каталогів бізнесів</span></article><article className="panel"><p>Оплати</p><strong>{value("payments")}</strong><span>Усі збережені платежі</span></article><article className="panel"><p>Платіжні посилання</p><strong>{value("paymentLinks")}</strong><span>Створено для приймання оплат</span></article><article className="panel"><p>Заявки на виплату</p><strong>{value("payouts")}</strong><span>Усі збережені виплати</span></article></section>
    <article className="panel users-table-panel"><div className="panel-head"><div><p className="panel-label">РЕЄСТР ЕКВАЙРИНГУ</p><h2>Створені бізнеси</h2></div><span>{businesses.length} бізнесів показано</span></div>{businesses.length === 0 ? <p className="users-empty">Бізнесів у сховищі еквайрингу поки немає.</p> : <div className="users-table-wrap"><table className="users-table"><thead><tr><th>Бізнес</th><th>Тип</th><th>Власність</th><th>Акаунт еквайрингу</th><th>Активи</th><th>Оновлено</th><th /></tr></thead><tbody>{businesses.map((business, index) => <tr key={`${business.account}-${business.name}-${index}`}><td><strong>{business.name}</strong></td><td>{business.type}</td><td>{business.ownership}</td><td>{business.account}</td><td className="nzr-points">{business.assets.length ? business.assets.join(", ") : "—"}</td><td>{date(business.updatedAt)}</td><td><button className="business-remove" type="button" onClick={() => onRemove(business)}>Прибрати</button></td></tr>)}</tbody></table></div>}</article>
  </section>;
}

type FinMonth = { month: number; stars: number; starsPayoutUsd: number; nzrSalesUsd: number; nzrBuybackUsd: number; feesUsd: number; turnoverUsd: number };
const finMonths = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
const finShort = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"];
const finPercent = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });
const finCount = new Intl.NumberFormat("uk-UA");

function finUsd(value: number, digits = 2) {
  return `$${new Intl.NumberFormat("uk-UA", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value || 0)}`;
}

function finIncome(month: FinMonth) {
  const net = month.starsPayoutUsd + month.nzrSalesUsd - month.nzrBuybackUsd;
  return { net, income: net + month.feesUsd };
}

function FinancePanel({ walletMetrics, selectedMonth, onSelectedMonthChange, onSelectedTurnoverYearChange }: { walletMetrics: WalletMetrics | null; selectedMonth: string; selectedTurnoverYear: number; onSelectedMonthChange: (month: string) => void; onSelectedTurnoverYearChange: (year: number) => void }) {
  const today = new Date();
  const [yearParam, monthParam] = selectedMonth.split("-").map(Number);
  const year = Number.isInteger(yearParam) ? yearParam : today.getFullYear();
  const monthIndex = Number.isInteger(monthParam) ? monthParam - 1 : today.getMonth();
  const [metric, setMetric] = useState<"turnover" | "income">("turnover");
  const [yearData, setYearData] = useState<{ year: number; months: FinMonth[] } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const m = walletMetrics;
  const [seen, setSeen] = useState(() => ({ metrics: m, at: now }));
  if (seen.metrics !== m) setSeen({ metrics: m, at: now });

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    void fetch(`/api/owner/finance/year?year=${year}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}`, "x-owner-session": ownerSession } })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => { if (active && body && Array.isArray(body.months)) setYearData({ year, months: body.months }); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [year]);

  const go = (nextYear: number, nextMonth: number) => {
    let y = nextYear, mo = nextMonth;
    if (mo < 0) { y -= 1; mo = 11; }
    if (mo > 11) { y += 1; mo = 0; }
    if (y > today.getFullYear() || (y === today.getFullYear() && mo > today.getMonth())) return;
    onSelectedMonthChange(`${y}-${String(mo + 1).padStart(2, "0")}`);
    onSelectedTurnoverYearChange(y);
  };
  const years = Array.from({ length: Math.max(1, today.getFullYear() - 2020 + 1) }, (_, index) => today.getFullYear() - index);
  const isFuture = (y: number, mo: number) => y === today.getFullYear() && mo > today.getMonth();

  const value = (key: string) => metricNumber(m?.[key]);
  const income = value("totalCommission") + value("nzrExchangeNetUsd");
  const turnover = value("companyTurnoverUsd");
  const yearTurnover = value("yearlyCompanyTurnoverUsd");
  const fragRate = value("telegramStarsFragmentRateUsd");
  const buyRate = value("nzrBuybackRateUsd");
  const saleRate = value("nzrSaleRateUsd");
  // Right after a month is picked the metrics still describe the previous
  // month until they reload; use them only when they match the selection and
  // fall back to the year figures meanwhile.
  const months = yearData?.year === year ? yearData.months : [];
  const metricsMatch = Boolean(m && Number(m.selectedYear) === year && Number(m.selectedMonth) === monthIndex + 1);
  const selected: FinMonth | null = metricsMatch ? {
    month: monthIndex + 1,
    stars: value("monthlyTelegramStarsReceived"),
    starsPayoutUsd: value("monthlyTelegramStarsFragmentRevenueUsd"),
    nzrSalesUsd: value("monthlyNzrSoldToUsers") * saleRate,
    nzrBuybackUsd: value("monthlyNzrBoughtFromUsers") * buyRate,
    feesUsd: value("monthlyCommission"),
    turnoverUsd: value("monthlyCompanyTurnoverUsd"),
  } : months.find((item) => item.month === monthIndex + 1) || null;
  const selectedCalc = selected ? finIncome(selected) : null;
  const previous = months.find((item) => item.month === monthIndex);
  const previousIncome = previous ? finIncome(previous).income : 0;
  const delta = selectedCalc && previous && previousIncome ? (selectedCalc.income - previousIncome) / Math.abs(previousIncome) * 100 : null;
  const onHold = year === today.getFullYear() && monthIndex === today.getMonth();

  const steps = selected && selectedCalc ? [
    { label: "Stars → Fragment", value: selected.starsPayoutUsd, type: "in" },
    { label: "Продаж NZR", value: selected.nzrSalesUsd, type: "in" },
    { label: "Викуп NZR", value: -selected.nzrBuybackUsd, type: "out" },
    { label: "Чистий прибуток", value: selectedCalc.net, type: "sum" },
    { label: "Комісії", value: selected.feesUsd, type: "in" },
    { label: "Загальний дохід", value: selectedCalc.income, type: "sum" },
  ] : [];
  let running = 0, top = 0, bottom = 0;
  const bars = steps.map((step) => {
    const from = step.type === "sum" ? 0 : running;
    const to = step.type === "sum" ? step.value : running + step.value;
    running = to;
    top = Math.max(top, from, to); bottom = Math.min(bottom, from, to);
    return { ...step, from, to };
  });
  const span = (top - bottom || 1) * 1.12;
  const pos = (amount: number) => (amount - bottom) / span * 100;

  const chartValues = Array.from({ length: 12 }, (_, index) => {
    const item = months.find((entry) => entry.month === index + 1);
    if (index === monthIndex && selected && metricsMatch) return metric === "turnover" ? selected.turnoverUsd : finIncome(selected).income;
    return item ? (metric === "turnover" ? item.turnoverUsd : finIncome(item).income) : null;
  });
  const chartMax = Math.max(0, ...chartValues.map((item) => item ?? 0)) * 1.12 || 1;

  const perNzr = fragRate - buyRate;
  const spreadTotal = value("nzrBuybackSpreadUsd");
  const spreadQty = perNzr > 0 ? Math.round(spreadTotal / perNzr) : 0;
  const rateMax = Math.max(fragRate, buyRate) || 1;
  const flows: [string, number, string][] = [["Продажі", value("nzrSwapSell"), "var(--fin-in)"], ["Покупки за Stars", value("nzrStars"), "var(--aud-gold)"], ["Купівлі", value("nzrSwapBuy"), "var(--fin-sum)"]];
  const flowTotal = flows.reduce((sum, [, amount]) => sum + amount, 0) || 1;
  const seconds = Math.max(0, Math.round((now - seen.at) / 1000));

  return <section className="fin aud">
    <header className="aud-head">
      <div><p className="aud-crumbs reg-eyebrow">Фінанси</p><h1>Фінансова <span>аналітика</span></h1><p className="aud-hint">Дані синхронізуються з Nezeriya Wallet API</p></div>
      <div className="fin-head-actions">
        <span className="aud-live fin-live"><i />{m ? (seconds < 5 ? "Live · щойно" : `Live · ${seconds} с тому`) : "Завантаження…"}</span>
        <div className="fin-period">
          <button className="reg-pg" aria-label="Попередній місяць" disabled={year <= 2020 && monthIndex === 0} onClick={() => go(year, monthIndex - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg></button>
          <div className="reg-select fin-select"><select aria-label="Місяць" value={monthIndex} onChange={(event) => go(year, Number(event.target.value))}>{finMonths.map((name, index) => <option key={name} value={index} disabled={isFuture(year, index)}>{name}</option>)}</select><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></div>
          <div className="reg-select fin-select"><select aria-label="Рік" value={year} onChange={(event) => { const nextYear = Number(event.target.value); go(nextYear, isFuture(nextYear, monthIndex) ? today.getMonth() : monthIndex); }}>{years.map((item) => <option key={item} value={item}>{item} р.</option>)}</select><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></div>
          <button className="reg-pg" aria-label="Наступний місяць" disabled={isFuture(year, monthIndex + 1) || (year === today.getFullYear() && monthIndex >= today.getMonth())} onClick={() => go(year, monthIndex + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></button>
        </div>
      </div>
    </header>

    <section className="fin-all" aria-label="За весь час">
      <div className="fin-all-item main"><span className="fin-lbl">Загальний дохід <i>за весь час</i></span><b className="fin-big win-accent">{m ? finUsd(income) : "—"}</b><span className="fin-sub">Комісії + виплата Fragment за Stars + обмін NZR</span></div>
      <div className="fin-all-item"><span className="fin-lbl">Оборот компанії <i>за весь час</i></span><b className="fin-big">{m ? finUsd(turnover) : "—"}</b><span className="fin-sub">Stars, продаж NZR і виплати за викуп</span></div>
      <div className="fin-all-item"><span className="fin-lbl">Оборот <i>за {year} р.</i></span><b className="fin-big">{m ? finUsd(yearTurnover) : "—"}</b><span className="fin-sub">{m && turnover ? `${finPercent.format(yearTurnover / turnover * 100)}% від обороту за весь час` : ""}</span></div>
      <div className="fin-all-item"><span className="fin-lbl">Маржа доходу <i>за весь час</i></span><b className="fin-big">{m && turnover ? `${finPercent.format(income / turnover * 100)}%` : "—"}</b><span className="fin-sub">Дохід ÷ оборот</span></div>
    </section>

    <section className="fin-month">
      <article className="aud-card fin-wf-card">
        <div className="aud-row fin-wf-head">
          <div><p className="aud-crumbs reg-eyebrow">{finMonths[monthIndex]} {year} р.</p><h2>З чого складається дохід</h2></div>
          <div className="fin-total"><span>Загальний дохід за місяць</span><b>{selectedCalc ? finUsd(selectedCalc.income) : "—"}</b>{delta !== null && <em className={delta >= 0 ? "up" : "down"}>{delta >= 0 ? "▲" : "▼"} {finPercent.format(Math.abs(delta))}% до попереднього місяця</em>}</div>
        </div>
        <div className="fin-wf" role="img" aria-label={bars.map((bar) => `${bar.label} ${finUsd(bar.value)}`).join(", ")}>
          {bars.length ? bars.map((bar, index) => {
            const low = pos(Math.min(bar.from, bar.to)), high = pos(Math.max(bar.from, bar.to));
            const zero = Math.abs(bar.value) < 0.005;
            const sign = bar.type === "sum" ? (bar.value < 0 ? "−" : "") : bar.type === "out" || bar.value < 0 ? "−" : "+";
            return <div className="fin-wf-col" key={bar.label}>
              <div className="fin-wf-track">
                <div className={`fin-wf-bar ${zero ? "zero" : bar.type}`} style={{ bottom: `${low}%`, height: `${high - low}%` }} />
                <div className="fin-wf-val" style={{ bottom: `${high}%` }}>{sign}{finUsd(Math.abs(bar.value))}</div>
                {index < bars.length - 1 && <div className="fin-wf-link" style={{ bottom: `${pos(bar.to)}%` }} />}
              </div>
              <div className="fin-wf-lbl">{bar.label}<b>{sign}{finUsd(Math.abs(bar.value))}</b></div>
            </div>;
          }) : <p className="aud-hint fin-empty">Немає даних за цей місяць</p>}
        </div>
        <div className="fin-legend"><span><i className="in" />Надходження</span><span><i className="out" />Витрати</span><span><i className="sum" />Підсумок</span></div>
        <div className="fin-mini">
          <div><span>Оборот за місяць</span><b>{selected ? finUsd(selected.turnoverUsd) : "—"}</b></div>
          <div><span>Чистий прибуток</span><b>{selectedCalc ? finUsd(selectedCalc.net) : "—"}</b></div>
          <div><span>Комісії</span><b>{selected ? finUsd(selected.feesUsd) : "—"}</b></div>
        </div>
      </article>

      <article className="aud-card fin-year">
        <div className="aud-row">
          <div><p className="aud-crumbs reg-eyebrow">Динаміка</p><h2>{metric === "turnover" ? "Оборот" : "Дохід"} по місяцях · {year}</h2></div>
          <div className="side2-switch win-mini" role="group" aria-label="Показник"><button className={metric === "turnover" ? "selected" : ""} onClick={() => setMetric("turnover")}>Оборот</button><button className={metric === "income" ? "selected" : ""} onClick={() => setMetric("income")}>Дохід</button></div>
        </div>
        <div className="fin-ybars">{chartValues.map((amount, index) => {
          const future = isFuture(year, index);
          const height = amount === null ? 0 : Math.max(0, amount) / chartMax * 100;
          return <button key={finShort[index]} className={`fin-yb${amount !== null ? " has" : ""}${index === monthIndex ? " sel" : ""}${future ? " future" : ""}`} disabled={future} aria-label={`${finMonths[index]}: ${amount === null ? "немає даних" : finUsd(amount)}`} onClick={() => go(year, index)}>
            <span className="fin-yb-track"><i style={{ height: `${height}%` }} />{amount ? <span className="fin-yb-val" style={{ bottom: `calc(${height}% + 4px)` }}>{finUsd(amount, 0)}</span> : null}</span>
            <span className="fin-yb-m">{finShort[index]}</span>
          </button>;
        })}</div>
        <p className="aud-hint win-small">{months.length || year !== today.getFullYear() || monthIndex === 0 ? "Клік по стовпчику — перейти до місяця." : "Завантажуємо дані по місяцях…"}</p>
      </article>
    </section>

    <section className="fin-cards">
      <article className="aud-card fin-card">
        <div className="fin-card-head"><span className="aud-icon aud-gold"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></svg></span>
          <div><p className="aud-crumbs reg-eyebrow">Telegram Stars · Fragment</p><h3>Дохід зі Stars</h3></div>
          {onHold && <span className="fin-hold">Утримання Telegram</span>}</div>
        <div className="fin-conv">
          <div><b>{selected ? finCount.format(selected.stars) : "—"}</b><span>Stars</span></div>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          <div><b className="win-accent">{selected ? finUsd(selected.starsPayoutUsd) : "—"}</b><span>очікувана виплата</span></div>
        </div>
        <dl className="fin-kv">
          <div><dt>Курс виплати</dt><dd>1 Star = {m ? finUsd(fragRate, 4) : "—"}</dd></div>
          <div><dt>Статус</dt><dd className="muted">Дохід доступний після періоду утримання Telegram</dd></div>
        </dl>
      </article>

      <article className="aud-card fin-card">
        <div className="fin-card-head"><span className="aud-icon aud-blue"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3" /></svg></span>
          <div><p className="aud-crumbs reg-eyebrow">Спред NZR</p><h3>Маржа Stars → викуп NZR</h3></div></div>
        <div className="fin-spread">
          <div className="fin-sp-row"><span>Виплата Fragment за Star</span><b>{m ? finUsd(fragRate, 4) : "—"}</b></div>
          <div className="fin-sp-bar"><i className="frag" style={{ width: `${fragRate / rateMax * 100}%` }} /></div>
          <div className="fin-sp-row"><span>Курс викупу NZR</span><b>{m ? finUsd(buyRate, 4) : "—"}</b></div>
          <div className="fin-sp-bar"><i className="buy" style={{ width: `${buyRate / rateMax * 100}%` }} /><em style={{ left: `${buyRate / rateMax * 100}%`, width: `${Math.max(perNzr, 0) / rateMax * 100}%` }} /></div>
        </div>
        <div className="fin-formula"><span>{m ? `${finUsd(perNzr, 4)} / NZR` : "—"}</span><span>×</span><span>{m ? `${finCount.format(spreadQty)} NZR` : "—"}</span><span>=</span><b className="win-accent">{m ? finUsd(spreadTotal) : "—"}</b></div>
        <p className="aud-hint win-small">Загальна маржа за весь час: різниця між виплатою Fragment за Star і курсом викупу NZR, помножена на викуплені NZR.</p>
      </article>

      <article className="aud-card fin-card">
        <div className="fin-card-head"><span className="aud-icon fin-red"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></svg></span>
          <div><p className="aud-crumbs reg-eyebrow">Ризики й партнери</p><h3>Контроль за весь час</h3></div></div>
        <div className="fin-risk">
          <div className="warn"><span>Втрати рулетки</span><b>{m ? `${finCount.format(value("wheelLoss"))} NZR` : "—"}</b></div>
          <div className="warn"><span>Невдалих транзакцій</span><b>{m ? finCount.format(value("failedTransactions")) : "—"}</b></div>
          <div><span>Реферальний дохід</span><b>{m ? finUsd(value("referralTotal"), 0) : "—"}</b></div>
          <div><span>Операцій DeDust</span><b>{m ? finCount.format(value("dedustSwaps")) : "—"}</b></div>
        </div>
      </article>
    </section>

    <section className="aud-card fin-nzr" aria-labelledby="finNzrTitle">
      <div className="aud-row"><div><p className="aud-crumbs reg-eyebrow">NZR</p><h2 id="finNzrTitle">Операції токена</h2></div><span className="aud-hint">за весь час</span></div>
      <div className="fin-nzr-grid">
        <div><span>Транзакцій NZR</span><b>{m ? finCount.format(value("nzrTransactions")) : "—"}</b></div>
        <div><span>Продажі NZR</span><b>{m ? finCount.format(value("nzrSwapSell")) : "—"}</b></div>
        <div><span>Купівлі NZR</span><b>{m ? finCount.format(value("nzrSwapBuy")) : "—"}</b></div>
        <div><span>Покупки NZR за Stars</span><b>{m ? finCount.format(value("nzrStars")) : "—"}</b></div>
      </div>
      <div className="fin-flow">
        <div className="fin-flow-bar">{flows.map(([label, amount, color]) => amount > 0 && <i key={label} style={{ flexGrow: amount, background: color }} />)}</div>
        <div className="fin-flow-leg">{flows.map(([label, amount, color]) => <span key={label}><i style={{ background: color }} />{label}<b>{finPercent.format(amount / flowTotal * 100)}%</b></span>)}</div>
      </div>
    </section>
  </section>;
}

const audIcons = {
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18.5 14.8c1.6.8 2.6 2.6 3 5.2" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h2" /><path d="M3 10h18" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  phone: <><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M10.5 18h3" /></>,
  clock: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M9.5 2.5h5" /></>,
};

function AudIcon({ name, tone }: { name: keyof typeof audIcons; tone: "mint" | "blue" | "gold" | "violet" }) {
  return <span className={`aud-icon aud-${tone}`}><svg viewBox="0 0 24 24" aria-hidden="true">{audIcons[name]}</svg></span>;
}

function audPercent(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function audPercentLabel(value: number) {
  return `${new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
}

function AudienceRevenueCards({ metrics, users }: { metrics: WalletMetrics | null; users: WalletUser[] }) {
  const value = (key: string) => {
    const raw = metrics?.[key];
    if (raw === null || raw === undefined || raw === "" || !Number.isFinite(Number(raw))) return null;
    return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 4 }).format(Number(raw));
  };
  const amount = (key: string, unit: string) => {
    const formatted = value(key);
    return formatted === null ? <span className="aud-missing">Немає даних</span> : <>{formatted} {unit === "★" ? <i className="aud-star">★</i> : unit}</>;
  };
  return <>
    <section className="aud-grid aud-grid-bottom">
      {(["ltv", "arpu"] as const).map((kind) => {
        const total = value(`${kind}CommissionUsdt`);
        return <article className="aud-card" key={kind}>
          <div className="aud-row"><p className="aud-label">{kind === "ltv" ? "LTV" : "ARPU"}</p><span className="aud-chip">{kind === "ltv" ? "накопичений" : "за місяць"}</span></div>
          <div className="aud-stat">{total === null ? <span className="aud-num-l aud-missing">Немає даних</span> : <><span className="aud-num-l">{total}</span><span className="aud-unit">USDT</span></>}</div>
          <span className="aud-hint">{kind === "ltv" ? "Комісії на зареєстрованого користувача" : "Комісії на активного користувача · орієнтовно"}</span>
          <dl className="aud-rows">
            <div><dt>Платежі Stars</dt><dd>{amount(`${kind}Stars`, "★")}</dd></div>
            <div><dt>Рулетка <small>· ставки − NZR-призи</small></dt><dd>{amount(`${kind}WheelNzr`, "NZR")}</dd></div>
            <div><dt>Plinko <small>· ставки − призи</small></dt><dd>{amount(`${kind}PlinkoNzr`, "NZR")}</dd></div>
          </dl>
          <span className="aud-foot">{kind === "ltv" ? `За весь доступний час · ${displayMetric(metrics?.revenueRegisteredUsers)} користувачів` : `${metrics?.revenueMonth || "Поточний місяць"} · ${displayMetric(metrics?.revenueActiveUsers)} активних користувачів`}</span>
        </article>;
      })}
      <CountryStats users={users} />
    </section>
    <LtvMethodology gamesSince={metrics?.revenueGamesSince} />
  </>;
}

function CountryStats({ users }: { users: WalletUser[] }) {
  const people = [...new Map(users.map((user) => [user.id, user])).values()];
  const confirmed = people.flatMap((user) => {
    const country = countryLabel(user.phoneCountry);
    return country ? [{ user, country }] : [];
  });
  const countries = [...confirmed.reduce((map, item) => {
    const existing = map.get(item.country.code);
    map.set(item.country.code, { ...item.country, count: (existing?.count || 0) + 1 });
    return map;
  }, new Map<string, { code: string; flag: string; name: string; count: number }>()).values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "uk"));
  return <article className="aud-card">
    <p className="aud-label">Географія реєстрацій</p>
    <div className="aud-stat"><span className="aud-num-l">{confirmed.length}</span><span className="aud-hint">підтверджені номери</span></div>
    {countries.length ? <ul className="aud-geo">{countries.map((country) => {
      const share = audPercent(country.count, confirmed.length);
      return <li key={country.code}>
        <div className="aud-geo-top"><span><span className="aud-cc">{country.code}</span>{country.name}</span><b>{country.count} <span>· {Math.round(share)}%</span></b></div>
        <div className="aud-track"><div className="aud-fill" style={{ width: `${Math.max(share, 1.5)}%` }} /></div>
      </li>;
    })}</ul> : <p className="users-empty">Країни з’являться після підтвердження контакту.</p>}
  </article>;
}

type RegSort = "user" | "tgId" | "country" | "walletId" | "nzr" | "invited" | "premium";
const regColors = ["#3DDC97", "#8AB4FF", "#F5C451", "#B794F6", "#FF9F7A", "#6ED3E0"];
const regNumber = new Intl.NumberFormat("uk-UA");
const regPercent = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });
const regCopyIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>;
const regSortIcon = <svg className="reg-ar" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>;

function regHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index++) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return Math.abs(hash);
}

function RegHighlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const needle = query.replace(/^@/, "").toLowerCase();
  if (!needle) return <>{text}</>;
  const parts: ReactNode[] = [];
  const lower = text.toLowerCase();
  let from = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(<mark key={at}>{text.slice(at, at + needle.length)}</mark>);
    from = at + needle.length;
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}

function LtvMethodology({ gamesSince }: { gamesSince?: string | number | null }) {
  return <details className="reg-method">
    <summary>
      <span className="reg-method-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg></span>
      <span>Як рахуються LTV і ARPU</span>
      <svg className="reg-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </summary>
    <ul>
      <li><b>Користувач</b> — одна людина, незалежно від кількості гаманців.</li>
      <li><b>LTV</b> — накопичений дохід, а не прогноз.</li>
      <li><b>Активний для ARPU</b> — відкрив гаманець, зробив операцію або грав протягом місяця.</li>
      <li><b>Комісія ARPU</b> оцінена за успішними операціями й поточним тарифом.</li>
      <li><b>Stars і NZR</b> не додаються до USDT — це окремі одиниці.</li>
      <li><b>Це дохід до витрат</b>, а не чистий прибуток.</li>
      <li><b>Ігри</b> — за збереженим журналом{gamesSince ? ` з ${formatOnlinePeakDate(String(gamesSince))}` : ""}; призи в USDT і негрошові призи в NZR не оцінюються.</li>
    </ul>
  </details>;
}

function WalletRegistry({ users }: { users: WalletUser[] }) {
  const [query, setQuery] = useState("");
  const [premium, setPremium] = useState<"all" | "premium" | "regular">("all");
  const [country, setCountry] = useState("all");
  const [invitedOnly, setInvitedOnly] = useState(false);
  const [sort, setSort] = useState<{ key: RegSort; dir: "asc" | "desc" }>(() => {
    try { const saved = JSON.parse(window.localStorage.getItem("nz-reg") || "{}"); if (saved.key) return { key: saved.key, dir: saved.dir === "asc" ? "asc" : "desc" }; } catch { /* storage unavailable */ }
    return { key: "nzr", dir: "desc" };
  });
  const [size, setSize] = useState(() => {
    try { const saved = JSON.parse(window.localStorage.getItem("nz-reg") || "{}"); if ([10, 25, 50, 100].includes(saved.size)) return saved.size as number; } catch { /* storage unavailable */ }
    return 25;
  });
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { window.localStorage.setItem("nz-reg", JSON.stringify({ key: sort.key, dir: sort.dir, size })); } catch { /* storage unavailable */ }
  }, [sort, size]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toUpperCase();
      if (event.key === "/" && tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") { event.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const rows = users.map((user) => ({
    user,
    key: `${user.id}-${user.walletIds.join("-")}`,
    name: user.username ? `@${user.username}` : user.name || "Без username",
    sub: user.username && user.name ? user.name : "",
    walletId: user.walletIds.join(", "),
    country: countryLabel(user.phoneCountry),
    nzr: metricNumber(user.nzrPoints),
    invited: metricNumber(user.referralCount),
  }));
  const people = [...new Map(rows.map((row) => [row.user.id, row])).values()];
  const totalReferrals = people.reduce((sum, row) => sum + row.invited, 0);
  const maxNzr = Math.max(1, ...rows.map((row) => row.nzr));
  const maxInvited = Math.max(1, ...rows.map((row) => row.invited));
  const stats: [string, number][] = [
    ["Гаманців", rows.length],
    ["З поінтами", rows.filter((row) => row.nzr > 0).length],
    ["Усього NZR", rows.reduce((sum, row) => sum + row.nzr, 0)],
    ["Premium", rows.filter((row) => row.user.premium).length],
    ["З рефералами", people.filter((row) => row.invited > 0).length],
    ["Рефералів", totalReferrals],
  ];
  const countryCounts = [...rows.reduce((map, row) => {
    if (row.country) map.set(row.country.code, { label: row.country.name, count: (map.get(row.country.code)?.count || 0) + 1 });
    return map;
  }, new Map<string, { label: string; count: number }>()).entries()].sort((a, b) => b[1].count - a[1].count);
  const unverified = rows.filter((row) => !row.country).length;

  const needle = query.trim().replace(/^@/, "").toLowerCase();
  const direction = sort.dir === "asc" ? 1 : -1;
  const filtered = rows.filter((row) => {
    if (premium === "premium" && !row.user.premium) return false;
    if (premium === "regular" && row.user.premium) return false;
    if (country === "none" && row.country) return false;
    if (country !== "all" && country !== "none" && row.country?.code !== country) return false;
    if (invitedOnly && !row.invited) return false;
    if (needle && ![row.user.username, row.user.name, row.user.id, row.walletId].join(" ").toLowerCase().includes(needle)) return false;
    return true;
  }).sort((a, b) => {
    const value = (row: typeof a): string | number => {
      if (sort.key === "user") return row.name.replace(/^@/, "").toLowerCase();
      if (sort.key === "country") return row.country ? row.country.name : "яяя";
      if (sort.key === "premium") return row.user.premium ? 1 : 0;
      if (sort.key === "tgId") return row.user.id;
      if (sort.key === "walletId") return row.user.walletIds[0] || 0;
      return row[sort.key];
    };
    const first = value(a), second = value(b);
    if (first < second) return -direction;
    if (first > second) return direction;
    return b.nzr - a.nzr;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const slice = filtered.slice(start, start + size);
  const pageList = [...new Set([1, pages, current - 1, current, current + 1].filter((item) => item >= 1 && item <= pages))].sort((a, b) => a - b);
  const filtersActive = Boolean(query || premium !== "all" || country !== "all" || invitedOnly);

  const changeSort = (key: RegSort) => {
    setSort((previous) => previous.key === key ? { key, dir: previous.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "user" || key === "country" ? "asc" : "desc" });
    setPage(1);
  };
  const copy = (value: string, id: string) => {
    const done = () => { setCopied(id); window.setTimeout(() => setCopied((currentId) => currentId === id ? null : currentId), 1200); };
    if (navigator.clipboard) void navigator.clipboard.writeText(value).then(done, done);
    else done();
  };
  const reset = () => { setQuery(""); setPremium("all"); setCountry("all"); setInvitedOnly(false); setPage(1); };
  const header: [RegSort, string, boolean?][] = [["user", "Користувач"], ["tgId", "Telegram ID"], ["country", "Країна номера"], ["walletId", "Wallet ID"], ["nzr", "NZR-поінти", true], ["invited", "Реферали", true], ["premium", "Статус"]];

  return <section className="reg-card" aria-labelledby="regTitle">
    <div className="reg-head">
      <div>
        <p className="aud-crumbs reg-eyebrow">Реєстр гаманців</p>
        <h2 id="regTitle">Гаманці користувачів і NZR-поінти</h2>
        <p className="aud-hint">«Реферали» — унікальні люди, запрошені по всіх гаманцях користувача; для кількох його гаманців показник однаковий. % — частка від усіх рефералів.</p>
      </div>
      <div className="reg-stats">{stats.map(([label, value]) => <div key={label}><span>{label}</span><b>{regNumber.format(value)}</b></div>)}</div>
    </div>

    <div className="reg-toolbar">
      <label className="reg-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input ref={searchRef} type="search" value={query} placeholder="Пошук: @username, Telegram ID, Wallet ID" autoComplete="off" onChange={(event) => { setQuery(event.target.value); setPage(1); }} onKeyDown={(event) => { if (event.key === "Escape") { setQuery(""); setPage(1); } }} />
        <kbd>/</kbd>
      </label>
      <div className="side2-switch reg-segment" role="group" aria-label="Статус">{([["all", "Усі"], ["premium", "Premium"], ["regular", "Звичайні"]] as const).map(([value, label]) => <button key={value} className={premium === value ? "selected" : ""} onClick={() => { setPremium(value); setPage(1); }}>{label}</button>)}</div>
      <div className="reg-select">
        <select aria-label="Країна" value={country} onChange={(event) => { setCountry(event.target.value); setPage(1); }}>
          <option value="all">Усі країни</option>
          {countryCounts.map(([code, item]) => <option key={code} value={code}>{item.label} · {item.count}</option>)}
          {unverified > 0 && <option value="none">Не підтверджено · {unverified}</option>}
        </select>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </div>
      <label className="reg-toggle"><input type="checkbox" checked={invitedOnly} onChange={(event) => { setInvitedOnly(event.target.checked); if (event.target.checked) setSort({ key: "invited", dir: "desc" }); setPage(1); }} /><span />З рефералами</label>
      {filtersActive && <button className="reg-reset" onClick={reset}>Скинути</button>}
    </div>

    <div className="reg-box">
      {users.length === 0 ? <p className="users-empty reg-empty-text">Список гаманців завантажується з Nezeriya Wallet API.</p> : <table className="reg-table">
        <thead><tr>{header.map(([key, label, numeric]) => <th key={key} className={numeric ? "num" : ""} aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}><button type="button" onClick={() => changeSort(key)}>{label}{regSortIcon}</button></th>)}</tr></thead>
        <tbody>{slice.map((row) => {
          const initials = row.name.replace(/^@/, "").slice(0, 2).toUpperCase();
          return <tr key={row.key}>
            <td><div className="reg-user"><span className="reg-av" style={{ background: regColors[regHash(String(row.user.id)) % regColors.length] }}>{initials}</span><div><span className="reg-name"><RegHighlight text={row.name} query={query} /></span>{row.sub && <span className="reg-sub"><RegHighlight text={row.sub} query={query} /></span>}</div></div></td>
            <td data-l="Telegram ID"><span className="reg-id"><RegHighlight text={String(row.user.id)} query={query} /><button className={`reg-cp${copied === `tg-${row.key}` ? " ok" : ""}`} aria-label="Копіювати Telegram ID" onClick={() => copy(String(row.user.id), `tg-${row.key}`)}>{copied === `tg-${row.key}` ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg> : regCopyIcon}</button></span></td>
            <td data-l="Країна">{row.country ? <span className="reg-cc"><i>{row.country.code}</i>{row.country.name}</span> : <span className="reg-unv">Не підтверджено</span>}</td>
            <td data-l="Wallet ID">{row.walletId ? <span className="reg-id"><RegHighlight text={row.walletId} query={query} /><button className={`reg-cp${copied === `w-${row.key}` ? " ok" : ""}`} aria-label="Копіювати Wallet ID" onClick={() => copy(row.walletId, `w-${row.key}`)}>{copied === `w-${row.key}` ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg> : regCopyIcon}</button></span> : "—"}</td>
            <td data-l="NZR-поінти" className="num"><div className="reg-pts"><span className="reg-bar"><i style={{ width: `${(row.nzr / maxNzr * 100).toFixed(1)}%` }} /></span><b className={row.nzr ? "" : "zero"}>{regNumber.format(row.nzr)} NZR</b></div></td>
            <td data-l="Реферали" className="num">{row.invited ? <div className="reg-pts ref"><span className="reg-bar"><i style={{ width: `${(row.invited / maxInvited * 100).toFixed(1)}%` }} /></span><b>{regNumber.format(row.invited)}</b><small>{regPercent.format(totalReferrals ? row.invited / totalReferrals * 100 : 0)}%</small></div> : <span className="reg-zero">0</span>}</td>
            <td data-l="Статус">{row.user.premium ? <span className="reg-pill prem"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></svg>Premium</span> : <span className="reg-pill">Звичайний</span>}</td>
          </tr>;
        })}</tbody>
      </table>}
      {users.length > 0 && filtered.length === 0 && <div className="reg-nothing"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><div><b>Нічого не знайдено</b><span>Змініть пошук або скиньте фільтри.</span></div></div>}
    </div>

    <div className="reg-foot">
      <span className="aud-hint">{filtered.length ? `Показано ${regNumber.format(start + 1)}–${regNumber.format(start + slice.length)} з ${regNumber.format(filtered.length)}${filtered.length !== rows.length ? ` (усього ${regNumber.format(rows.length)})` : ""}` : "0 гаманців"}</span>
      <div className="reg-pager">
        <div className="reg-select small"><select aria-label="Рядків на сторінці" value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map((item) => <option key={item} value={item}>{item}</option>)}</select><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></div>
        <button className="reg-pg" aria-label="Попередня сторінка" disabled={current <= 1} onClick={() => setPage(current - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg></button>
        {pageList.map((item, index) => <span key={item} className="reg-pg-group">{index > 0 && item - pageList[index - 1] > 1 && <span className="reg-gap">…</span>}<button className={`reg-pg${item === current ? " active" : ""}`} aria-current={item === current ? "page" : undefined} onClick={() => setPage(item)}>{item}</button></span>)}
        <button className="reg-pg" aria-label="Наступна сторінка" disabled={current >= pages} onClick={() => setPage(current + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></button>
      </div>
    </div>
  </section>;
}

function UsersPanel({ walletMetrics, users, refreshing, onRefresh }: { walletMetrics: WalletMetrics | null; users: WalletUser[]; refreshing: boolean; onRefresh: () => void }) {
  const totalUsers = metricNumber(walletMetrics?.users);
  const premiumUsers = metricNumber(walletMetrics?.premiumUsers);
  const standardUsers = Math.max(0, totalUsers - premiumUsers);
  const premiumShare = audPercent(premiumUsers, totalUsers);
  const activeUsers = metricNumber(walletMetrics?.revenueActiveUsers);
  const activeShare = audPercent(activeUsers, totalUsers);
  const registered = walletMetrics ? displayMetric(walletMetrics.users) : "—";
  const highestNrzBalance = walletMetrics?.maxNzrBalance;
  const analyticsWindow = walletMetrics ? displayMetric(walletMetrics.analyticsWindowDays ?? 30) : "30";
  const kpis = [
    { icon: "wallet" as const, tone: "gold" as const, label: "Найбільший баланс", value: highestNrzBalance === null || highestNrzBalance === undefined ? "—" : displayMetric(highestNrzBalance), unit: "NZR", hint: "Максимум серед усіх гаманців" },
    { icon: "calendar" as const, tone: "blue" as const, label: "Середній вік акаунтів", value: formatAccountAge(walletMetrics?.averageWalletAgeDays), unit: "", hint: `Активні за останні ${analyticsWindow} днів` },
    { icon: "phone" as const, tone: "violet" as const, label: "Сесій на користувача", value: walletMetrics ? displayMetric(walletMetrics.sessionsPerUser) : "—", unit: "відкриттів", hint: "Відкриття Mini App" },
    { icon: "clock" as const, tone: "mint" as const, label: "Тривалість сесії", value: formatSessionDuration(walletMetrics?.averageSessionDurationSeconds), unit: "", hint: "Середній час у Mini App" },
  ];
  return <section className="users-page aud">
    <section className="aud-head">
      <div><p className="aud-crumbs">Аналітика <span>/</span> Користувачі</p><h1>Аудиторія <span>Nezeriya Wallet</span></h1><p className="aud-hint">Актуальні дані з адміністративного API гаманця</p></div>
      <button className={`aud-live${refreshing ? " loading" : ""}`} type="button" onClick={onRefresh} disabled={refreshing} title="Оновити зараз"><i />{refreshing ? "Оновлення…" : "Live · оновити"}</button>
    </section>

    <section className="aud-grid aud-grid-top">
      <article className="aud-card aud-hero">
        <div className="aud-hero-main">
          <p className="aud-label"><AudIcon name="users" tone="mint" />Зареєстровано користувачів</p>
          <strong className="aud-num-xl">{registered}</strong>
          <span className="aud-hint">усього за весь час</span>
          <div className="aud-legend">
            <div><p><i className="aud-dot-blue" />Telegram Premium</p><b>{walletMetrics ? displayMetric(premiumUsers) : "—"}</b><span>{walletMetrics ? audPercentLabel(premiumShare) : ""}</span></div>
            <div><p><i className="aud-dot-mint" />Звичайні</p><b>{walletMetrics ? displayMetric(standardUsers) : "—"}</b><span>{walletMetrics ? audPercentLabel(100 - premiumShare) : ""}</span></div>
          </div>
        </div>
        <div className="aud-donut">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="aud-donut-track" cx="60" cy="60" r="50" />
            {totalUsers > 0 && <circle className="aud-donut-regular" cx="60" cy="60" r="50" pathLength={100} />}
            <circle className="aud-donut-premium" cx="60" cy="60" r="50" pathLength={100} style={{ strokeDasharray: `${premiumShare.toFixed(1)} ${(100 - premiumShare).toFixed(1)}` }} />
          </svg>
          <div><b>{walletMetrics ? audPercentLabel(premiumShare) : "—"}</b><span>Premium</span></div>
        </div>
      </article>

      <article className="aud-card aud-active">
        <div className="aud-row"><p className="aud-label">Активні за місяць</p><span className="aud-chip">{walletMetrics?.revenueMonth || "—"}</span></div>
        <div className="aud-stat"><span className="aud-num-l">{walletMetrics ? displayMetric(activeUsers) : "—"}</span><span className="aud-hint">користувачів</span></div>
        <div className="aud-progress">
          <div><span className="aud-hint">Частка від усіх</span><b>{walletMetrics ? audPercentLabel(activeShare) : "—"}</b></div>
          <div className="aud-track"><div className="aud-fill" style={{ width: `${walletMetrics ? Math.max(activeShare, 1.5) : 0}%` }} /></div>
        </div>
      </article>
    </section>

    <section className="aud-grid aud-grid-kpi">
      {kpis.map((kpi) => <article className="aud-kpi" key={kpi.label}>
        <p className="aud-label"><AudIcon name={kpi.icon} tone={kpi.tone} />{kpi.label}</p>
        <div className="aud-stat"><span className="aud-num-m">{kpi.value}</span>{kpi.unit && kpi.value !== "—" && <span className="aud-unit">{kpi.unit}</span>}</div>
        <span className="aud-hint">{kpi.hint}</span>
      </article>)}
    </section>

    <AudienceRevenueCards metrics={walletMetrics} users={users} />
    <WalletRegistry users={users} />
  </section>;
}

type WinGame = "roulette" | "plinko" | "spins" | "double";
type WinRow = { key: string; ts: number; tgId: string; name: string; sub: string; walletId: string; game: WinGame; stake: number; payout: number; payoutLabel: string; outcome: string; picked: string; result: string; mult: number | null; net: number };
type WinSort = "ts" | "user" | "game" | "stake" | "outcome" | "payout" | "net";
const winGames: WinGame[] = ["roulette", "plinko", "spins", "double"];
const winGameLabel: Record<WinGame, string> = { roulette: "Рулетка", plinko: "Plinko", spins: "Spins", double: "Double" };
const winGameIcon: Record<WinGame, ReactNode> = {
  roulette: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v6M12 15v6M3 12h6M15 12h6" /></svg>,
  plinko: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.5" /><circle cx="8" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /><circle cx="5" cy="15" r="1.5" /><circle cx="12" cy="15" r="1.5" /><circle cx="19" cy="15" r="1.5" /><path d="M4 20h16" /></svg>,
  spins: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M9 5v14M15 5v14" /><path d="M5.5 12h1M11.5 12h1M17.5 12h1" /></svg>,
  double: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></svg>,
};
const winDoubleColor: Record<string, string> = { червоне: "red", чорне: "black", зелене: "green" };
const winNumber = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 });
const winOne = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

function winNzr(value: string) {
  if (!value.toUpperCase().includes("NZR")) return null;
  const found = value.replace(/\s/g, "").match(/-?\d+(?:[.,]\d+)?/);
  return found ? Math.abs(Number(found[0].replace(",", "."))) : null;
}

function winSigned(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${winNumber.format(Math.abs(value))}`;
}

function winRelative(ts: number, now: number) {
  const seconds = Math.max(0, Math.round((now - ts) / 1000));
  if (seconds < 60) return `${seconds} с тому`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} хв тому`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} год тому`;
  return new Date(ts).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Turns a wallet game record into a row. Plinko, Spins and Double come as
// "<Game> · ставка N NZR" (Double adds "· обраний → що випало"); Roulette
// comes with the wheel number (wheel 1 costs 10 NZR, wheel 2 costs 30 NZR);
// old USDT prizes have no known stake.
function winRow(win: WheelWin): WinRow {
  const dropped = String(win.dropped || "");
  const reward = String(win.reward || "");
  const label = String(win.game || dropped).toLowerCase();
  const game: WinGame = label.startsWith("plinko") ? "plinko" : label.startsWith("spins") ? "spins" : label.startsWith("double") ? "double" : "roulette";
  const roundGame = game !== "roulette";
  const stake = roundGame ? Number(dropped.match(/ставка\s*(\d+(?:[.,]\d+)?)/i)?.[1]?.replace(",", ".") || 0) : Number(win.wheel) === 1 ? 10 : Number(win.wheel) === 2 ? 30 : 0;
  const nzr = winNzr(reward);
  // Only old USDT prizes have an unknown value; an empty spin pays 0 NZR.
  const unknownPrize = nzr === null && /usdt/i.test(reward);
  const payout = nzr ?? 0;
  const colors = game === "double" ? dropped.split("·").at(-1)?.split("→").map((part) => part.trim()) || [] : [];
  // The wallet server runs in UTC and sends local date-times without a zone.
  const createdAt = String(win.createdAt || "");
  const ts = Date.parse(/(z|[+-]\d\d:?\d\d)$/i.test(createdAt) ? createdAt : `${createdAt}Z`) || 0;
  return {
    key: `${win.id}-${win.walletId}-${win.createdAt}-${dropped}-${reward}`,
    ts,
    tgId: String(win.id),
    name: win.username ? `@${win.username}` : win.name || "Без username",
    sub: win.username && win.name ? win.name : "",
    walletId: String(win.walletId ?? ""),
    game,
    stake,
    payout,
    payoutLabel: unknownPrize ? reward : `${winNumber.format(payout)} NZR`,
    outcome: roundGame ? "" : dropped || "—",
    picked: colors.length === 2 ? colors[0] : "",
    result: colors.length === 2 ? colors[1] : "",
    mult: (game === "plinko" || game === "spins") && stake ? payout / stake : null,
    net: unknownPrize ? 0 : payout - stake,
  };
}

function WinsSplit({ values, signed = false, bar = true }: { values: Record<WinGame, number>; signed?: boolean; bar?: boolean }) {
  const total = winGames.reduce((sum, game) => sum + Math.max(0, values[game]), 0) || 1;
  const format = (value: number) => signed ? winSigned(value) : winNumber.format(value);
  return <div className="win-split">
    {bar && <div className="win-split-bar">{winGames.map((game) => values[game] > 0 && <i key={game} className={game} style={{ width: `${values[game] / total * 100}%` }} />)}</div>}
    <div className="win-split-leg">{winGames.map((game) => <span key={game}><i className={game} />{winGameLabel[game]} <b>{format(values[game])}</b></span>)}</div>
  </div>;
}

function WinsPanel({ wins, summary, refreshing, onRefresh, onSilentRefresh }: { wins: WheelWin[]; summary: WheelWinSummary; refreshing: boolean; onRefresh: () => void; onSilentRefresh: () => void }) {
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<"all" | WinGame>("all");
  const [result, setResult] = useState<"all" | "win" | "loss">("all");
  const [player, setPlayer] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: WinSort; dir: "asc" | "desc" }>({ key: "ts", dir: "desc" });
  const [size, setSize] = useState(() => {
    try { const saved = JSON.parse(window.localStorage.getItem("nz-wins") || "{}"); if ([10, 25, 50, 100].includes(saved.size)) return saved.size as number; } catch { /* storage unavailable */ }
    return 25;
  });
  const [page, setPage] = useState(1);
  const [topBy, setTopBy] = useState<"payout" | "games">("payout");
  const [now, setNow] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const silentRefresh = useRef(onSilentRefresh);

  // Identical records (same player, second and prize) get a counter, counted
  // from the oldest game so keys stay the same when newer games arrive.
  const rows = wins.map((win) => winRow(win));
  const repeats = new Map<string, number>();
  for (let index = rows.length - 1; index >= 0; index--) {
    const count = repeats.get(rows[index].key) || 0;
    repeats.set(rows[index].key, count + 1);
    if (count) rows[index].key = `${rows[index].key}#${count}`;
  }
  const rowKeys = rows.map((row) => row.key).join("|");
  // Games that arrived with the latest refresh are highlighted for a moment.
  const [seen, setSeen] = useState(() => ({ keys: rowKeys, fresh: new Set<string>(), at: now }));
  if (seen.keys !== rowKeys) {
    const previous = new Set(seen.keys ? seen.keys.split("|") : []);
    setSeen({ keys: rowKeys, fresh: seen.keys ? new Set(rows.map((row) => row.key).filter((key) => !previous.has(key))) : new Set(), at: now });
  }
  const fresh = seen.fresh;
  const updatedAt = seen.at;

  useEffect(() => { silentRefresh.current = onSilentRefresh; }, [onSilentRefresh]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { const timer = window.setInterval(() => silentRefresh.current(), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { try { window.localStorage.setItem("nz-wins", JSON.stringify({ size })); } catch { /* storage unavailable */ } }, [size]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toUpperCase();
      if (event.key === "/" && tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") { event.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const won = summary.monthlyWonNzr;
  const collected = summary.monthlyCollectedNzr;
  const rtp = collected ? won / collected * 100 : 0;
  const wonByGame: Record<WinGame, number> = { roulette: summary.monthlyWheelWonNzr, plinko: summary.monthlyPlinkoWonNzr, spins: summary.monthlySpinsWonNzr, double: summary.monthlyDoubleWonNzr };
  const spentByGame: Record<WinGame, number> = { roulette: summary.monthlyWheelSpentNzr, plinko: summary.monthlyPlinkoSpentNzr, spins: summary.monthlySpinsSpentNzr, double: summary.monthlyDoubleSpentNzr };
  const netByGame = Object.fromEntries(winGames.map((item) => [item, spentByGame[item] - wonByGame[item]])) as Record<WinGame, number>;
  const rtpText = winGames.filter((item) => spentByGame[item]).map((item) => `${winGameLabel[item]} ${winOne.format(wonByGame[item] / spentByGame[item] * 100)}%`).join(", ");

  const needle = query.trim().replace(/^@/, "").toLowerCase();
  const direction = sort.dir === "asc" ? 1 : -1;
  const filtered = rows.filter((row) => {
    if (game !== "all" && row.game !== game) return false;
    if (result === "win" && row.net <= 0) return false;
    if (result === "loss" && row.net >= 0) return false;
    if (player && row.tgId !== player) return false;
    if (needle && ![row.name, row.sub, row.tgId, row.walletId].join(" ").toLowerCase().includes(needle)) return false;
    return true;
  }).sort((a, b) => {
    const value = (row: WinRow): string | number => sort.key === "user" ? row.name.replace(/^@/, "").toLowerCase() : sort.key === "outcome" ? (row.mult ?? row.payout) : row[sort.key];
    const first = value(a), second = value(b);
    return first < second ? -direction : first > second ? direction : b.ts - a.ts;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const slice = filtered.slice(start, start + size);
  const pageList = [...new Set([1, pages, current - 1, current, current + 1].filter((item) => item >= 1 && item <= pages))].sort((a, b) => a - b);
  const sumStake = filtered.reduce((sum, row) => sum + row.stake, 0);
  const sumPayout = filtered.reduce((sum, row) => sum + row.payout, 0);
  const filtersActive = Boolean(query || game !== "all" || result !== "all" || player);
  const playerRow = player ? rows.find((row) => row.tgId === player) : undefined;

  const topMap = new Map<string, { row: WinRow; payout: number; stake: number; games: number }>();
  rows.forEach((row) => {
    if (game !== "all" && row.game !== game) return;
    const entry = topMap.get(row.tgId) || { row, payout: 0, stake: 0, games: 0 };
    entry.payout += row.payout; entry.stake += row.stake; entry.games += 1;
    topMap.set(row.tgId, entry);
  });
  const top = [...topMap.values()].sort((a, b) => b[topBy] - a[topBy]).slice(0, 8);
  const topMax = top[0]?.[topBy] || 1;

  const hours = Array.from({ length: 24 }, () => 0);
  rows.forEach((row) => { if (row.ts) hours[new Date(row.ts).getHours()] += 1; });
  const hoursMax = Math.max(1, ...hours);
  const peakHour = hours.indexOf(Math.max(...hours));

  const changeSort = (key: WinSort) => { setSort((previous) => previous.key === key ? { key, dir: previous.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "user" || key === "game" ? "asc" : "desc" }); setPage(1); };
  const pickPlayer = (id: string) => { setPlayer((currentPlayer) => currentPlayer === id ? null : id); setPage(1); historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const reset = () => { setQuery(""); setGame("all"); setResult("all"); setPlayer(null); setPage(1); };
  const avatar = (row: WinRow, small = false) => <span className={`reg-av${small ? " win-av-sm" : ""}`} style={{ background: regColors[regHash(row.tgId) % regColors.length] }}>{row.name.replace(/^@/, "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?"}</span>;
  const header: [WinSort, string, boolean?][] = [["ts", "Час"], ["user", "Гравець"], ["game", "Гра"], ["stake", "Ставка", true], ["outcome", "Що випало"], ["payout", "Отримав", true], ["net", "Підсумок", true]];
  const seconds = Math.max(0, Math.round((now - updatedAt) / 1000));

  return <section className="win aud">
    <header className="aud-head">
      <div><p className="aud-crumbs reg-eyebrow">Рулетка, Plinko, Spins і Double</p><h1>Виграші <span>користувачів</span></h1><p className="aud-hint">Реєстр призів, отриманих в іграх Nezeriya Wallet</p></div>
      <button className={`aud-live${refreshing ? " loading" : ""}`} type="button" onClick={onRefresh} disabled={refreshing} title="Оновити зараз"><i />{refreshing ? "Оновлення…" : seconds < 5 ? "Live · щойно" : `Live · ${seconds} с тому`}</button>
    </header>

    <section className="win-kpis" aria-label="Підсумки місяця">
      <article className="aud-card win-kpi">
        <div className="aud-row"><p className="aud-label">Виплачено виграшів</p><span className="aud-chip">за місяць</span></div>
        <div className="aud-stat"><span className="aud-num-l">{winNumber.format(won)}</span><span className="aud-unit">NZR</span></div>
        <WinsSplit values={wonByGame} />
      </article>
      <article className="aud-card win-kpi">
        <div className="aud-row"><p className="aud-label">Зібрано ставок</p><span className="aud-chip">за місяць</span></div>
        <div className="aud-stat"><span className="aud-num-l">{winNumber.format(collected)}</span><span className="aud-unit">NZR</span></div>
        <WinsSplit values={spentByGame} />
      </article>
      <article className="aud-card win-kpi win-net-card">
        <div className="aud-row"><p className="aud-label">Чистий заробіток</p><span className="aud-chip">ставки − виграші</span></div>
        <div className="aud-stat"><span className="aud-num-l win-accent">{winNumber.format(summary.monthlyNetEarningsNzr)}</span><span className="aud-unit">NZR</span></div>
        <WinsSplit values={netByGame} signed bar={false} />
      </article>
      <article className="aud-card win-kpi">
        <div className="aud-row"><p className="aud-label">Повернення гравцям</p><span className="aud-chip">RTP</span></div>
        <div className="aud-stat"><span className="aud-num-l">{winOne.format(rtp)}</span><span className="aud-unit">%</span></div>
        <div className="win-rtp"><i style={{ width: `${Math.min(rtp, 100)}%` }} /></div>
        <span className="aud-hint win-small">Маржа {winOne.format(100 - rtp)}%{rtpText ? ` · ${rtpText}` : ""}</span>
      </article>
    </section>

    <section className="win-grid">
      <article className="reg-card win-history" ref={historyRef} aria-labelledby="winHistoryTitle">
        <div className="reg-head win-head">
          <div><p className="aud-crumbs reg-eyebrow">Історія ігор</p><h2 id="winHistoryTitle">Останні результати</h2></div>
          <div className="reg-stats">{([["Ігор", winNumber.format(filtered.length)], ["Ставок", `${winNumber.format(sumStake)} NZR`], ["Виплачено", `${winNumber.format(sumPayout)} NZR`], ["Підсумок для нас", `${winSigned(sumStake - sumPayout)} NZR`]] as const).map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>
        </div>

        <div className="reg-toolbar">
          <label className="reg-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input ref={searchRef} type="search" value={query} placeholder="Пошук: @username, Telegram ID, Wallet ID" autoComplete="off" onChange={(event) => { setQuery(event.target.value); setPage(1); }} onKeyDown={(event) => { if (event.key === "Escape") { setQuery(""); setPage(1); } }} />
            <kbd>/</kbd>
          </label>
          <div className="side2-switch reg-segment" role="group" aria-label="Гра">{([["all", "Усі ігри"], ...winGames.map((item) => [item, winGameLabel[item]] as const)] as const).map(([value, label]) => <button key={value} className={game === value ? "selected" : ""} onClick={() => { setGame(value); setPage(1); }}>{label}</button>)}</div>
          <div className="side2-switch reg-segment" role="group" aria-label="Результат">{([["all", "Усі"], ["win", "У плюсі"], ["loss", "У мінусі"]] as const).map(([value, label]) => <button key={value} className={result === value ? "selected" : ""} onClick={() => { setResult(value); setPage(1); }}>{label}</button>)}</div>
          {filtersActive && <button className="reg-reset" onClick={reset}>Скинути</button>}
        </div>

        {player && <div className="win-player-filter">Тільки гравець <b>{playerRow?.name || player}</b><button aria-label="Прибрати фільтр гравця" onClick={() => setPlayer(null)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>}

        <div className="reg-box win-box">
          {rows.length === 0 ? <p className="users-empty reg-empty-text">Результатів поки немає. Нові ігри з&apos;являться тут після завершення.</p> : <table className="reg-table win-table">
            <thead><tr>{header.map(([key, label, numeric]) => <th key={key} className={numeric ? "num" : ""} aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}><button type="button" onClick={() => changeSort(key)}>{label}{regSortIcon}</button></th>)}</tr></thead>
            <tbody>{slice.map((row) => <tr key={row.key} className={fresh.has(row.key) ? "win-new" : ""}>
              <td><div className="win-time" title={row.ts ? new Date(row.ts).toLocaleString("uk-UA") : ""}><b>{row.ts ? new Date(row.ts).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}</b><span>{row.ts ? winRelative(row.ts, now) : ""}</span></div></td>
              <td data-l="Гравець"><button className="win-user" title="Показати лише ігри цього гравця" onClick={() => pickPlayer(row.tgId)}>{avatar(row, true)}<span><span className="reg-name">{row.name}</span><span className="reg-sub win-mono">{row.tgId}</span></span></button></td>
              <td data-l="Гра"><span className={`win-game ${row.game}`}>{winGameIcon[row.game]}{winGameLabel[row.game]}</span></td>
              <td data-l="Ставка" className="num"><span className="win-stake">{row.stake ? winNumber.format(row.stake) : "—"}</span></td>
              <td data-l="Що випало">{row.mult !== null ? <span className={`win-mult${row.mult >= 2 ? " hot" : row.mult < 1 ? " cold" : ""}`}>×{winOne.format(row.mult)}</span> : row.game === "double" ? <span className="win-double" title={`Обрано ${row.picked}, випало ${row.result}`}><i className={winDoubleColor[row.picked] || ""} />→<i className={winDoubleColor[row.result] || ""} /><span>{row.result}</span></span> : <span className="win-outcome">{row.outcome}</span>}</td>
              <td data-l="Отримав" className="num"><span className={`win-pay${row.payout ? "" : " zero"}`}>{row.payoutLabel}</span></td>
              <td data-l="Підсумок" className="num"><span className={`win-net ${row.net > 0 ? "pos" : row.net < 0 ? "neg" : "even"}`}>{winSigned(row.net)}</span></td>
            </tr>)}</tbody>
          </table>}
          {rows.length > 0 && filtered.length === 0 && <div className="reg-nothing"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><div><b>Нічого не знайдено</b><span>Змініть пошук або скиньте фільтри.</span></div></div>}
        </div>

        <div className="reg-foot">
          <span className="aud-hint">{filtered.length ? `Показано ${winNumber.format(start + 1)}–${winNumber.format(start + slice.length)} з ${winNumber.format(filtered.length)}${filtered.length !== rows.length ? ` (усього ${winNumber.format(rows.length)})` : ""}` : "0 результатів"}</span>
          <div className="reg-pager">
            <div className="reg-select small"><select aria-label="Рядків на сторінці" value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map((item) => <option key={item} value={item}>{item}</option>)}</select><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></div>
            <button className="reg-pg" aria-label="Попередня сторінка" disabled={current <= 1} onClick={() => setPage(current - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg></button>
            {pageList.map((item, index) => <span key={item} className="reg-pg-group">{index > 0 && item - pageList[index - 1] > 1 && <span className="reg-gap">…</span>}<button className={`reg-pg${item === current ? " active" : ""}`} aria-current={item === current ? "page" : undefined} onClick={() => setPage(item)}>{item}</button></span>)}
            <button className="reg-pg" aria-label="Наступна сторінка" disabled={current >= pages} onClick={() => setPage(current + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></button>
          </div>
        </div>
      </article>

      <aside className="win-side">
        <article className="aud-card win-top">
          <div className="aud-row"><div><p className="aud-crumbs reg-eyebrow">Гравці</p><h2>Топ гравців</h2></div>
            <div className="side2-switch win-mini" role="group" aria-label="Сортувати топ"><button className={topBy === "payout" ? "selected" : ""} onClick={() => setTopBy("payout")}>Виграші</button><button className={topBy === "games" ? "selected" : ""} onClick={() => setTopBy("games")}>Ігри</button></div>
          </div>
          {top.length ? <ol className="win-top-list">{top.map((entry, index) => <li key={entry.row.tgId}><button aria-pressed={player === entry.row.tgId} onClick={() => pickPlayer(entry.row.tgId)}>
            <span className="win-rank">{index + 1}</span>{avatar(entry.row, true)}
            <span className="win-top-mid"><b>{entry.row.name}</b><span className="win-top-bar"><i style={{ width: `${entry[topBy] / topMax * 100}%` }} /></span></span>
            <span className="win-top-val"><b>{topBy === "payout" ? `${winNumber.format(entry.payout)} NZR` : `${winNumber.format(entry.games)} ігор`}</b><span>{topBy === "payout" ? `${winNumber.format(entry.games)} ігор` : `${winNumber.format(entry.payout)} NZR`} · {winSigned(entry.payout - entry.stake)}</span></span>
          </button></li>)}</ol> : <p className="aud-hint">Немає даних</p>}
          <p className="aud-hint win-small">Клік по гравцю — показати лише його ігри.</p>
        </article>

        <article className="aud-card win-hours-card">
          <div><p className="aud-crumbs reg-eyebrow">Активність</p><h2>Ігри по годинах</h2></div>
          <div className="win-hours">{hours.map((count, hour) => <span key={hour} className={hour === peakHour && count ? "peak" : ""} data-tip={`${String(hour).padStart(2, "0")}:00 · ${count} ігор`} aria-label={`${String(hour).padStart(2, "0")}:00 — ${count} ігор`}><i style={{ height: `${count / hoursMax * 100}%` }} /></span>)}</div>
          <div className="win-hours-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
        </article>
      </aside>
    </section>
  </section>;
}

function EmployeesPanel() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [monthHours, setMonthHours] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<EmployeeProfile | null>(null);
  const [terminating, setTerminating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline" | "frozen">("all");

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
    const formatChartDate = (index: number) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(date);
    };
    chart.innerHTML = `<p>Робочі години за кожен день · 30 днів</p><div>${values.map((value, day) => `<i data-tooltip="${formatChartDate(day)}: ${value} год." title="${formatChartDate(day)}: ${value} год." style="height:${Math.max(4, value / max * 100)}%"></i>`).join("")}</div><div class="work-chart-axis"><span>30 днів тому</span><span>Сьогодні</span></div><small>Наведіть на стовпчик, щоб побачити точну кількість годин.</small>`;
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
    const formatChartDate = (index: number) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(date);
    };
    chart.innerHTML = `<p class="panel-label">РОБОЧИЙ ЧАС КОМАНДИ</p><h2>Середні робочі години на працівника · 30 днів</h2><div class="monthly-work-bars">${monthHours.map((value, index) => `<i data-tooltip="${formatChartDate(index)}: у середньому ${value} год." title="${formatChartDate(index)}: у середньому ${value} год. на працівника" style="height:${Math.max(4, value / max * 100)}%"></i>`).join("")}</div><div><span>30 днів тому</span><span>Сьогодні</span></div><small>Наведіть на стовпчик, щоб побачити середню кількість годин за день.</small>`;
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
      setSelected((current) => current ? { ...current, payouts: body.action === "create_payout" ? [payout, ...current.payouts] : body.action === "delete_payout" ? current.payouts.filter((item) => item.id !== payout.id) : current.payouts.map((item) => item.id === payout.id ? payout : item) } : current);
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
    const payoutItems = Array.from(payroll.querySelectorAll(".owner-payout-list>div"));
    const onDetails = (event: Event) => {
      if ((event.target as HTMLElement).closest("button")) return;
      const payout = payouts[payoutItems.indexOf(event.currentTarget as HTMLElement)];
      if (!payout) return;
      modal.querySelector(".payout-detail-modal")?.remove();
      const detail = document.createElement("div");
      detail.className = "payout-detail-modal";
      detail.innerHTML = `<div><button class="payout-detail-close" aria-label="Закрити">×</button><p class="panel-label">ДЕТАЛІ ВИПЛАТИ</p><h3>${Number(payout.amount).toFixed(2)} USDT</h3><p>Статус: <b>${payout.status === "paid" ? "Виплачено" : "До сплати"}</b></p><p>Створено: <b>${new Date(payout.created_at).toLocaleString("uk-UA")}</b></p><p>${payout.paid_at ? `Виплачено: <b>${new Date(payout.paid_at).toLocaleString("uk-UA")}</b>` : "Ще не позначена як виплачена"}</p><p>Примітка: <b>${payout.note || "Без примітки"}</b></p><button class="payout-detail-delete">Видалити виплату</button></div>`;
      const close = () => detail.remove();
      detail.querySelector(".payout-detail-close")?.addEventListener("click", close);
      detail.querySelector(".payout-detail-delete")?.addEventListener("click", () => { if (window.confirm("Видалити цю виплату назавжди?")) { close(); void request({ action: "delete_payout", payout_id: payout.id }); } });
      modal.append(detail);
    };
    payoutItems.forEach((item) => item.addEventListener("click", onDetails));
    modal.querySelector(".terminate-employee")?.insertAdjacentElement("afterend", payroll);
    return () => { createButton?.removeEventListener("click", onCreate); paidButtons.forEach((button) => button.removeEventListener("click", onPaid)); payoutItems.forEach((item) => item.removeEventListener("click", onDetails)); payroll.remove(); };
  }, [selected]);
  useEffect(() => {
    const page = document.querySelector(".employees-page");
    if (!page || employees.length === 0) return;
    page.querySelector(".employees-efficiency-table")?.remove();
    const table = document.createElement("section");
    table.className = "panel employees-efficiency-table";
    const formatMinutes = (minutes: number | null) => minutes === null ? "—" : minutes < 60 ? `${minutes} хв` : `${Math.floor(minutes / 60)} год ${minutes % 60} хв`;
    table.innerHTML = `<p class="panel-label">ЕФЕКТИВНІСТЬ ПІДТРИМКИ</p><h2>Показники працівників</h2><div class="efficiency-head"><span>Працівник</span><span>Рейтинг</span><span>Закриті чати</span><span>1-ша відповідь</span><span>Години / 30 дн.</span><span>Статус</span></div>${employees.map((employee) => {
      const rating = employee.reviews.length ? (employee.reviews.reduce((sum, review) => sum + review.rating, 0) / employee.reviews.length).toFixed(2) : "—";
      const hours = (employee.daily_activity || []).reduce((sum, value) => sum + value, 0);
      const online = employee.last_active_at ? Date.now() - new Date(employee.last_active_at).getTime() < 90000 : false;
      return `<div class="efficiency-row"><span class="efficiency-name"><b>${employee.full_name}</b><small>${employee.city}</small></span><span class="efficiency-rating">${rating === "—" ? "—" : `★ ${rating}`}</span><span>${employee.closed_chats}</span><span>${formatMinutes(employee.first_response_minutes)}</span><span>${hours} год</span><span class="${online ? "online" : "offline"}">${online ? "Онлайн" : "Не в мережі"}</span></div>`;
    }).join("")}`;
    const monthly = page.querySelector(".monthly-work-chart");
    monthly?.insertAdjacentElement("afterend", table);
    return () => table.remove();
  }, [employees]);
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
  const freezeEmployee = async () => {
    if (!selected) return;
    const action = selected.status === "frozen" ? "unfreeze" : "freeze";
    const question = action === "freeze" ? `Заморозити акаунт ${selected.full_name}? Доступ до підтримки буде призупинено.` : `Розморозити акаунт ${selected.full_name}? Доступ до підтримки буде відновлено.`;
    if (!window.confirm(question)) return;
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    setTerminating(true);
    const response = await fetch("/api/owner/employees", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-owner-session": ownerSession }, body: JSON.stringify({ id: selected.id, action }) });
    if (response.ok) {
      const status = action === "freeze" ? "frozen" : "approved";
      setEmployees((items) => items.map((employee) => employee.id === selected.id ? { ...employee, status } : employee));
      setSelected((employee) => employee ? { ...employee, status } : employee);
    } else setError("Не вдалося змінити статус працівника. Спробуйте ще раз.");
    setTerminating(false);
  };
  const savePermissions = async (permissions: Pick<EmployeeProfile, "can_use_chats" | "can_view_reviews" | "can_view_ratings" | "can_view_salary" | "can_view_statistics">) => {
    if (!selected) return;
    const token = window.sessionStorage.getItem("nezaria_access_token");
    const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
    if (!token || !ownerSession) return;
    const response = await fetch("/api/owner/employees", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-owner-session": ownerSession }, body: JSON.stringify({ id: selected.id, action: "update_permissions", permissions }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { window.alert(result.error || "Не вдалося зберегти права доступу."); return; }
    setSelected((current) => current ? { ...current, ...permissions } : current);
    setEmployees((items) => items.map((employee) => employee.id === selected.id ? { ...employee, ...permissions } : employee));
  };
  useEffect(() => {
    const modal = document.querySelector(".employee-profile");
    if (!modal || !selected) return;
    modal.querySelector(".employee-permissions")?.remove();
    const section = document.createElement("section");
    section.className = "employee-permissions";
    const permissionList: [keyof Pick<EmployeeProfile, "can_use_chats" | "can_view_reviews" | "can_view_ratings" | "can_view_salary" | "can_view_statistics">, string][] = [["can_use_chats", "Чати"], ["can_view_reviews", "Відгуки"], ["can_view_ratings", "Оцінки та рейтинг"], ["can_view_salary", "Зарплата"], ["can_view_statistics", "Особиста статистика"]];
    section.innerHTML = `<p class="panel-label">ПРАВА ДОСТУПУ</p><h3>Розділи працівника</h3><small>CEO може вимкнути окремі розділи. Зміни застосовуються одразу.</small><div>${permissionList.map(([key, label]) => `<label><input type="checkbox" data-permission="${key}" ${selected[key] ? "checked" : ""} />${label}</label>`).join("")}</div>`;
    const onChange = () => {
      const permissions = Object.fromEntries(Array.from(section.querySelectorAll<HTMLInputElement>("[data-permission]")).map((input) => [input.dataset.permission!, input.checked])) as Pick<EmployeeProfile, "can_use_chats" | "can_view_reviews" | "can_view_ratings" | "can_view_salary" | "can_view_statistics">;
      void savePermissions(permissions);
    };
    const inputs = Array.from(section.querySelectorAll<HTMLInputElement>("input"));
    inputs.forEach((input) => input.addEventListener("change", onChange));
    modal.insertBefore(section, modal.querySelector(".freeze-employee"));
    return () => { inputs.forEach((input) => input.removeEventListener("change", onChange)); section.remove(); };
  }, [selected]);
  useEffect(() => {
    const modal = document.querySelector(".employee-profile");
    if (!modal || !selected || modal.querySelector(".operator-settings")) return;
    const section = document.createElement("section");
    section.className = "operator-settings";
    section.innerHTML = `<h3>Налаштування оператора</h3><label>Статус<select><option value="online">Онлайн</option><option value="break">Перерва</option><option value="offline">Офлайн</option></select></label><label>Ліміт активних чатів<input type="number" min="1" max="50" /></label><button>Зберегти налаштування</button>`;
    const status = section.querySelector("select") as HTMLSelectElement;
    const limit = section.querySelector("input") as HTMLInputElement;
    const save = section.querySelector("button") as HTMLButtonElement;
    status.value = (selected as EmployeeProfile & { operator_status?: string }).operator_status || "online";
    limit.value = String((selected as EmployeeProfile & { active_chat_limit?: number }).active_chat_limit || 5);
    save.onclick = async () => {
      const token = window.sessionStorage.getItem("nezaria_access_token"); const ownerSession = window.sessionStorage.getItem("nezeriya_owner_session");
      const response = await fetch("/api/owner/employees", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}`, "x-owner-session": ownerSession || "" }, body: JSON.stringify({ action: "update_operator_settings", id: selected.id, operator_status: status.value, active_chat_limit: Number(limit.value) }) });
      if (response.ok) { save.textContent = "Збережено"; void loadEmployees(); }
    };
    modal.insertBefore(section, modal.querySelector(".freeze-employee"));
    return () => section.remove();
  }, [selected]);
  const reviewCount = employees.reduce((total, employee) => total + employee.reviews.length, 0);
  const averageRating = reviewCount ? (employees.reduce((total, employee) => total + employee.reviews.reduce((sum, review) => sum + review.rating, 0), 0) / reviewCount).toFixed(2) : "—";
  const filteredEmployees = employees.filter((employee) => {
    const query = search.trim().toLocaleLowerCase("uk-UA");
    const matchesQuery = !query || `${employee.full_name} ${employee.city} ${employee.phone}`.toLocaleLowerCase("uk-UA").includes(query);
    const online = employee.status !== "frozen" && Boolean(employee.last_active_at) && Date.now() - new Date(employee.last_active_at!).getTime() < 90000;
    const matchesStatus = statusFilter === "all" || statusFilter === "frozen" && employee.status === "frozen" || statusFilter === "online" && online || statusFilter === "offline" && employee.status !== "frozen" && !online;
    return matchesQuery && matchesStatus;
  });

  return <section className="employees-page">
    <section className="heading-row"><div><p className="eyebrow">ПРАЦІВНИКИ</p><h1>Ефективність <span>команди</span></h1><p className="subtle">Тут відображаються лише працівники, яких ви реально прийняли.</p></div><button className="sync" onClick={() => void loadEmployees()}>↻ Оновити</button></section>
    <div className="list-filters"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Пошук за ім’ям, містом або телефоном" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "online" | "offline" | "frozen")}><option value="all">Усі статуси</option><option value="online">Онлайн</option><option value="offline">Не в мережі</option><option value="frozen">Заморожені</option></select><span>Знайдено: {filteredEmployees.length}</span></div>
    <section className="employees-summary"><article className="panel"><p>Усього працівників</p><strong>{employees.length}</strong></article><article className="panel"><p>Відгуків клієнтів</p><strong>{reviewCount}</strong></article><article className="panel"><p>Середній рейтинг</p><strong>{averageRating === "—" ? "—" : `${averageRating} ★`}</strong></article><article className="panel"><p>Статус даних</p><strong className="employee-live">LIVE</strong></article></section>
    {loading ? <article className="panel empty-applications">Завантажуємо працівників…</article> : error ? <article className="panel empty-applications">{error}</article> : employees.length === 0 ? <article className="panel empty-applications">Ще немає прийнятих працівників. Приймайте заявки у розділі «Команда».</article> : filteredEmployees.length === 0 ? <article className="panel empty-applications">За цими фільтрами працівників не знайдено.</article> : <article className="panel employees-table-panel"><div className="panel-head"><div><p className="panel-label">КОМАНДА ПІДТРИМКИ</p><h2>Усі працівники</h2></div></div><div className="team-table employees-table">{filteredEmployees.map((employee) => {
      const rating = employee.reviews.length ? (employee.reviews.reduce((sum, review) => sum + review.rating, 0) / employee.reviews.length).toFixed(2) : "—";
      const initials = employee.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
      const isOnline = employee.status !== "frozen" && Boolean(employee.last_active_at) && Date.now() - new Date(employee.last_active_at!).getTime() < 90000;
      return <button className="team-row employee-row" key={employee.id} onClick={() => setSelected(employee)}><div className="member"><div className="avatar member-avatar employee-avatar">{employee.avatar_url ? <img src={employee.avatar_url} alt={`Фото ${employee.full_name}`} /> : initials}</div><div><strong>{employee.full_name}</strong><small>{employee.city}</small></div></div><div><small>Рейтинг</small><strong className="rating">{rating === "—" ? "—" : `★ ${rating}`}</strong></div><div><small>Відгуків</small><strong>{employee.reviews.length}</strong></div><span className={`status ${employee.status === "frozen" ? "frozen" : isOnline ? "online" : "break"}`}>{employee.status === "frozen" ? "Заморожено" : isOnline ? "Онлайн" : "Не в мережі"}</span></button>;
    })}</div></article>}
    {selected && <section className="employee-modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><article className="panel employee-profile" role="dialog" aria-modal="true" aria-label={`Профіль ${selected.full_name}`} onMouseDown={(event) => event.stopPropagation()}><button className="profile-close" onClick={() => setSelected(null)} aria-label="Закрити">×</button><div className="employee-profile-head"><div className="profile-avatar">{selected.avatar_url ? <img src={selected.avatar_url} alt={`Фото ${selected.full_name}`} /> : selected.full_name.slice(0, 1).toUpperCase()}</div><div><p className="panel-label">ПРАЦІВНИК</p><h2>{selected.full_name}</h2><p>{selected.city} · {selected.age} років</p></div></div><div className="employee-info"><span>Телефон<strong>{selected.phone}</strong></span><span>Прийнятий<strong>{new Date(selected.created_at).toLocaleDateString("uk-UA")}</strong></span></div><button className="freeze-employee" onClick={() => void freezeEmployee()} disabled={terminating}>{terminating ? "Оновлюємо статус…" : selected.status === "frozen" ? "Розморозити акаунт" : "Заморозити акаунт"}</button><button className="terminate-employee" onClick={() => void terminateEmployee()} disabled={terminating}>{terminating ? "Звільняємо…" : "Звільнити працівника"}</button><div className="reviews-head"><h3>Відгуки клієнтів</h3><span>{selected.reviews.length}</span></div>{selected.reviews.length === 0 ? <p className="no-reviews">Відгуків ще немає. Вони з’являться після запуску чатів підтримки та оцінювання діалогів.</p> : <div className="reviews-list">{selected.reviews.map((review) => <article className="review" key={review.id}><div><strong>{review.client_name}</strong><span>{"★".repeat(review.rating)}</span></div><p>{review.comment}</p><small>{new Date(review.created_at).toLocaleDateString("uk-UA")}</small></article>)}</div>}</article></section>}
  </section>;
}

function ApplicationsPanel() {
  const [applications, setApplications] = useState<WorkerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [view, setView] = useState<"active" | "archive">("active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "terminated">("all");

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

  const visibleApplications = applications.filter((application) => {
    const inView = view === "archive" ? application.status === "rejected" || application.status === "terminated" : application.status === "pending" || application.status === "approved";
    const query = search.trim().toLocaleLowerCase("uk-UA");
    const matchesQuery = !query || `${application.full_name} ${application.city} ${application.phone}`.toLocaleLowerCase("uk-UA").includes(query);
    const matchesStatus = statusFilter === "all" || application.status === statusFilter;
    return inView && matchesQuery && matchesStatus;
  });

  return <section className="applications-page">
    <section className="heading-row"><div><p className="eyebrow">КОМАНДА</p><h1>Заявки <span>працівників</span></h1><p className="subtle">Перевіряйте дані, фото документа та ухвалюйте рішення.</p></div><button className="sync" onClick={() => void loadApplications()}>↻ Оновити</button></section>
    <div className="application-tabs"><button className={view === "active" ? "selected" : ""} onClick={() => setView("active")}>Активні</button><button className={view === "archive" ? "selected" : ""} onClick={() => setView("archive")}>Архів</button></div>
    <div className="list-filters"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Пошук за ПІБ, містом або телефоном" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "pending" | "approved" | "rejected" | "terminated")}><option value="all">Усі статуси</option><option value="pending">На розгляді</option><option value="approved">Прийнято</option><option value="rejected">Відхилено</option><option value="terminated">Звільнено</option></select><span>Знайдено: {visibleApplications.length}</span></div>
    {loading ? <article className="panel empty-applications">Завантажуємо заявки…</article> : error ? <article className="panel empty-applications">{error}</article> : visibleApplications.length === 0 ? <article className="panel empty-applications">{view === "archive" ? "В архіві поки немає заявок." : "Нових заявок поки немає."}</article> : <div className="applications-list">{visibleApplications.map((application) => <article className="panel application-card" key={application.id}>
      <div className="application-main"><div className="candidate-details"><div className="face-square">{application.face_photo_url ? <a href={application.face_photo_url} target="_blank" rel="noreferrer"><img src={application.face_photo_url} alt={`Фото обличчя: ${application.full_name}`} /></a> : <span>Фото</span>}</div><div><p className="panel-label">КАНДИДАТ</p><h2>{application.full_name}</h2><p className="application-meta">{application.city} · {application.age} років · {application.phone}</p><p className="application-date">{new Date(application.created_at).toLocaleString("uk-UA")}</p></div></div><span className={`application-status ${application.status}`}>{application.status === "pending" ? "На розгляді" : application.status === "approved" ? "Прийнято" : application.status === "terminated" ? "Звільнено" : "Відхилено"}</span></div>
      <div><small className="document-label">Фото паспорта</small><div className="document-preview">{application.photo_url ? <a href={application.photo_url} target="_blank" rel="noreferrer"><img src={application.photo_url} alt={`Фото паспорта: ${application.full_name}`} /></a> : <span>Фото недоступне</span>}</div></div>
      {application.status === "pending" && <div className="application-actions"><button className="reject" disabled={busyId === application.id} onClick={() => void decide(application.id, "rejected")}>Відхилити</button><button className="approve" disabled={busyId === application.id} onClick={() => void decide(application.id, "approved")}>{busyId === application.id ? "Зберігаємо…" : "Прийняти"}</button></div>}{application.status === "rejected" && <div className="application-actions"><button className="delete-archive" disabled={busyId === application.id} onClick={() => void removeArchived(application.id)}>{busyId === application.id ? "Видаляємо…" : "Видалити"}</button></div>}
    </article>)}</div>}
  </section>;
}

function WorkerStatusScreen({ name, title, text, onCancel }: { name: string; title: string; text: string; onCancel?: () => Promise<{ ok: boolean; message: string }> }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const cancel = async () => {
    if (!onCancel || !window.confirm("Відмінити заявку? Внесені дані та фото буде видалено.")) return;
    setCancelling(true);
    setCancelError("");
    const result = await onCancel();
    setCancelling(false);
    if (!result.ok) setCancelError(result.message);
    else window.location.reload();
  };
  return <main className="auth-page"><section className="auth-card worker-card"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div><p className="eyebrow">КАБІНЕТ ПРАЦІВНИКА</p><h1>Вітаємо, {name}.<br /><span>{title}</span></h1><p className="auth-copy">{text}</p><div className="worker-status"><i /> Оновлюється автоматично після перезавантаження сторінки</div>{onCancel && <><button className="back-link cancel-application" type="button" disabled={cancelling} onClick={() => void cancel()}>{cancelling ? "Відміняємо…" : "Відмінити заявку"}</button>{cancelError && <p className="auth-error">{cancelError}</p>}</>}</section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;
}

function NotificationBell({ role, owner }: { role: "owner" | "worker" | "media"; owner?: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ id: string; title: string; text: string; created_at: string; tone: string }[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [context, setContext] = useState<{ id: string; x: number; y: number } | null>(null);
  const key = `nezeriya_seen_notifications_${role}`;
  const load = async () => { const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token"); if (!token) return; const response = await fetch(`/api/notifications?role=${role}`, { headers: { Authorization: `Bearer ${token}`, ...(owner ? { "x-owner-session": window.sessionStorage.getItem("nezeriya_owner_session") || "" } : {}) } }); if (response.ok) { const result = await response.json(); let read: string[] = []; try { const saved = JSON.parse(window.localStorage.getItem(key) || "[]"); if (Array.isArray(saved)) read = saved; } catch { /* Ignore invalid browser cache. */ } setItems((result.notifications || []).filter((item: { id: string }) => !read.includes(item.id))); } };
  useEffect(() => { try { const saved = JSON.parse(window.localStorage.getItem(key) || "[]"); if (Array.isArray(saved)) setSeen(saved); } catch { /* Ignore invalid browser cache. */ } void load(); const timer = window.setInterval(() => void load(), 60000); return () => window.clearInterval(timer); }, []);
  const unread = items.filter((item) => !seen.includes(item.id)).length;
  const markRead = () => { const ids = [...new Set([...seen, ...items.map((item) => item.id)])]; setSeen(ids); window.localStorage.setItem(key, JSON.stringify(ids)); setItems([]); };
  const markOneRead = (id: string) => { const ids = [...new Set([...seen, id])]; setSeen(ids); window.localStorage.setItem(key, JSON.stringify(ids)); setItems((current) => current.filter((item) => item.id !== id)); setContext(null); };
  return <div className="notification-center" onClick={() => setContext(null)}><button className="notification-bell" type="button" aria-label="Сповіщення" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}>♧{unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}</button>{open && <section className="notification-popover"><header><strong>Сповіщення</strong><button type="button" onClick={markRead}>Прочитано</button></header>{items.length ? <div>{items.map((item) => <article key={item.id} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); setContext({ id: item.id, x: event.clientX, y: event.clientY }); }}><i className={item.tone} /><span><b>{item.title}</b><small>{item.text} · {new Date(item.created_at).toLocaleDateString("uk-UA")}</small></span></article>)}</div> : <p>Нових подій поки немає.</p>}</section>}{context && <button type="button" className="notification-context-menu" style={{ left: context.x, top: context.y }} onClick={() => markOneRead(context.id)}>Позначити прочитаним</button>}</div>;
}

function AccountMenu({ name, role, avatar, onSignOut, onNicknameChange }: { name: string; role: string; avatar?: string | null; onSignOut: () => void; onNicknameChange?: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nickname, setNickname] = useState(name);
  const [language, setLanguage] = useState("uk");
  const [currency, setCurrency] = useState("USD");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setNickname(window.localStorage.getItem("nezeriya_profile_nickname") || name);
    setLanguage(window.localStorage.getItem("nezeriya_interface_language") || "uk");
    setCurrency(window.localStorage.getItem("nezeriya_display_currency") || "USD");
    setTheme((window.localStorage.getItem("nezeriya_interface_theme") as "dark" | "light") || "dark");
  }, [name]);
  const save = () => {
    const value = nickname.trim() || name;
    window.localStorage.setItem("nezeriya_profile_nickname", value);
    window.localStorage.setItem("nezeriya_interface_language", language);
    window.localStorage.setItem("nezeriya_display_currency", currency);
    window.localStorage.setItem("nezeriya_interface_theme", theme);
    document.documentElement.dataset.theme = theme;
    onNicknameChange?.(value);
    setNickname(value);
    setSettingsOpen(false);
  };
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    if (!settingsOpen) return;
    const settings = document.querySelector(".account-settings");
    if (!settings || settings.querySelector(".theme-setting")) return;
    const label = document.createElement("label");
    label.className = "theme-setting";
    label.textContent = "Тема";
    const select = document.createElement("select");
    select.innerHTML = `<option value="dark">Темна</option><option value="light">Світла</option>`;
    select.value = theme;
    const change = () => setTheme(select.value as "dark" | "light");
    select.addEventListener("change", change);
    label.append(select);
    settings.insertBefore(label, settings.querySelector(".account-save"));
    return () => { select.removeEventListener("change", change); label.remove(); };
  }, [settingsOpen, theme]);
  useEffect(() => {
    if (!settingsOpen || role === "Власник") return;
    const settings = document.querySelector(".account-settings");
    if (!settings || settings.querySelector(".level-setting")) return;
    const saved = window.localStorage.getItem("nezeriya_worker_progress");
    if (!saved) return;
    try {
      const progress = JSON.parse(saved) as { level: number; xp: number; level_progress: number; next_level_xp: number };
      const level = document.createElement("div");
      level.className = "level-setting";
      level.innerHTML = `<small>РІВЕНЬ ПІДТРИМКИ</small><strong>Рівень ${progress.level} · ${progress.xp} XP</strong><span>${progress.level_progress} / ${progress.next_level_xp} XP до наступного рівня</span>`;
      settings.insertBefore(level, settings.querySelector(".account-save"));
      return () => level.remove();
    } catch { return; }
  }, [settingsOpen, role]);
  useEffect(() => {
    if (role === "Власник") return;
    const notificationRole = role === "Медіа-команда" ? "media" : "worker";
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    if (!token) return;
    const button = document.createElement("button");
    button.type = "button"; button.className = "floating-notification-bell"; button.textContent = "♧";
    const popup = document.createElement("section"); popup.className = "floating-notification-popover"; popup.hidden = true;
    const contextMenu = document.createElement("button"); contextMenu.type = "button"; contextMenu.className = "floating-notification-context"; contextMenu.textContent = "Позначити прочитаним"; contextMenu.hidden = true;
    let items: { id: string; title: string; text: string; created_at: string }[] = [];
    const cacheKey = `nezeriya_seen_notifications_${notificationRole}`;
    const seen = () => { try { const value = JSON.parse(window.localStorage.getItem(cacheKey) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };
    const render = () => { const known = seen(); const unread = items.filter((item) => !known.includes(item.id)).length; button.innerHTML = `♧${unread ? `<b>${unread > 9 ? "9+" : unread}</b>` : ""}`; popup.replaceChildren(); const title = document.createElement("header"); const strong = document.createElement("strong"); strong.textContent = "Сповіщення"; const read = document.createElement("button"); read.type = "button"; read.textContent = "Прочитано"; read.onclick = () => { window.localStorage.setItem(cacheKey, JSON.stringify(items.map((item) => item.id))); render(); }; title.append(strong, read); popup.append(title); if (!items.length) { const empty = document.createElement("p"); empty.textContent = "Нових подій поки немає."; popup.append(empty); return; } items.forEach((item) => { const article = document.createElement("article"), dot = document.createElement("i"), text = document.createElement("span"), itemTitle = document.createElement("b"), detail = document.createElement("small"); itemTitle.textContent = item.title; detail.textContent = `${item.text} · ${new Date(item.created_at).toLocaleDateString("uk-UA")}`; text.append(itemTitle, detail); article.append(dot, text); popup.append(article); }); };
    const attachContextMenu = () => { const read = popup.querySelector("header button") as HTMLButtonElement | null; if (read) read.onclick = () => { const ids = [...new Set([...seen(), ...items.map((item) => item.id)])]; window.localStorage.setItem(cacheKey, JSON.stringify(ids)); items = []; render(); attachContextMenu(); }; popup.querySelectorAll("article").forEach((article, index) => { article.addEventListener("contextmenu", (event) => { event.preventDefault(); const item = items[index]; if (!item) return; contextMenu.style.left = `${event.clientX}px`; contextMenu.style.top = `${event.clientY}px`; contextMenu.hidden = false; contextMenu.onclick = () => { const ids = [...new Set([...seen(), item.id])]; window.localStorage.setItem(cacheKey, JSON.stringify(ids)); items = items.filter((value) => value.id !== item.id); contextMenu.hidden = true; render(); attachContextMenu(); }; }); }); };
    const load = async () => { const response = await fetch(`/api/notifications?role=${notificationRole}`, { headers: { Authorization: `Bearer ${token}` } }); if (response.ok) { const result = await response.json(); const read = seen(); items = (result.notifications || []).filter((item: { id: string }) => !read.includes(item.id)); render(); attachContextMenu(); } };
    button.onclick = () => { popup.hidden = !popup.hidden; contextMenu.hidden = true; };
    document.addEventListener("click", () => { contextMenu.hidden = true; }); document.body.append(button, popup, contextMenu); void load(); const timer = window.setInterval(() => void load(), 60000);
    return () => { window.clearInterval(timer); button.remove(); popup.remove(); contextMenu.remove(); };
  }, [role]);
  return <div className="account-menu"><button type="button" className="account-menu-toggle" onClick={() => setOpen((value) => !value)}>{avatar ? <img src={avatar} alt="Фото профілю" /> : <span className="account-menu-avatar">{(nickname || name).slice(0, 1).toUpperCase()}</span>}<span><strong>{nickname || name}</strong><small>{role}</small></span><b>•••</b></button>{open && <div className="account-menu-popover"><button type="button" onClick={() => { setSettingsOpen(true); setOpen(false); }}>Налаштування</button><button type="button" className="account-logout" onClick={onSignOut}>Вийти</button></div>}{settingsOpen && <div className="account-settings-backdrop" onMouseDown={() => setSettingsOpen(false)}><section className="account-settings panel" onMouseDown={(event) => event.stopPropagation()}><button className="profile-close" type="button" onClick={() => setSettingsOpen(false)}>×</button><p className="eyebrow">НАЛАШТУВАННЯ ПРОФІЛЮ</p><h2>Мій профіль</h2><label>Нік<input value={nickname} maxLength={40} onChange={(event) => setNickname(event.target.value)} /></label><label>Мова<select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="uk">Українська</option><option value="ru">Русский</option></select></label><label>Валюта<select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="USD">USD · Долар США</option><option value="EUR">EUR · Євро</option><option value="UAH">UAH · Гривня</option><option value="USDT">USDT</option></select></label><button className="account-save" type="button" onClick={save}>Зберегти зміни</button></section></div>}</div>;
}

type WorkerPortalProfile = { full_name: string; city: string; avatar_url: string | null; ton_usdt_wallet: string | null; reviews: EmployeeReview[]; payouts: WorkerPayout[]; can_use_chats: boolean; can_view_reviews: boolean; can_view_ratings: boolean; can_view_salary: boolean; can_view_statistics: boolean; progression?: { xp: number; level: number; level_progress: number; next_level_xp: number; closed_chats: number; messages_sent: number; stars_earned: number } };

function WorkerWorkspace({ name }: { name: string }) {
  return <WorkerPortal name={name} />;
}

function WorkerPortal({ name }: { name: string }) {
  const [view, setView] = useState<"chats" | "reviews" | "ratings" | "salary" | "statistics">("chats");
  const [operatorStatus, setOperatorStatus] = useState<"online" | "break" | "offline">("online");
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
    void fetch("/api/worker/status", { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : null).then((result) => {
      if (result?.operator_status === "online" || result?.operator_status === "break" || result?.operator_status === "offline") setOperatorStatus(result.operator_status);
    });
  }, []);
  const changeOperatorStatus = async (status: "online" | "break" | "offline") => {
    const token = window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token");
    if (!token) return;
    const response = await fetch("/api/worker/status", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ operator_status: status }) });
    if (response.ok) setOperatorStatus(status);
  };
  useEffect(() => {
    const progress = profile?.progression;
    if (!progress) return;
    window.localStorage.setItem("nezeriya_worker_progress", JSON.stringify(progress));
  }, [profile]);
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
    // Navigation is rendered by React below. Do not mutate React-owned DOM here.
    return;
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
    // Navigation is rendered by React below. Do not mutate React-owned DOM here.
    return;
    const nav = document.querySelector(".worker-portal-nav");
    if (!nav || nav.querySelector(".worker-statistics-nav")) return;
    const button = document.createElement("button");
    button.className = "worker-statistics-nav";
    button.textContent = "◫ Статистика";
    button.onclick = () => setView("statistics");
    nav.append(button);
    return () => button.remove();
  }, []);
  useEffect(() => {
    // Access controls are rendered by React. Manual DOM updates crash on refresh.
    return;
    if (!profile) return;
    const nav = document.querySelector(".worker-portal-nav");
    if (!nav) return;
    const rules: Record<string, boolean> = { "Чати": profile.can_use_chats, "Відгуки": profile.can_view_reviews, "Оцінки": profile.can_view_ratings, "Зарплата": profile.can_view_salary, "Статистика": profile.can_view_statistics };
    const targets: [string, "chats" | "reviews" | "ratings" | "salary" | "statistics"][] = [["Чати", "chats"], ["Відгуки", "reviews"], ["Оцінки", "ratings"], ["Зарплата", "salary"], ["Статистика", "statistics"]];
    nav.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { const key = Object.keys(rules).find((item) => button.textContent?.includes(item)); if (key) button.style.display = rules[key] ? "" : "none"; });
    if (!targets.some(([text, targetView]) => targetView === view && rules[text])) setView(targets.find(([text]) => rules[text])?.[1] || "chats");
  }, [profile, view]);
  useEffect(() => {
    // Wallet information is rendered by React. Keep the React tree intact.
    return;
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
    // Salary view is being migrated to React; never overwrite its DOM node.
    return;
    if (view !== "salary") return;
    const content = document.querySelector(".worker-portal-content");
    if (!content) return;
    if (!profile?.can_view_salary) { content.innerHTML = `<article class="panel empty-applications">Доступ до зарплати вимкнений CEO.</article>`; return; }
    content.innerHTML = `<section class="worker-feedback salary-panel"><p class="eyebrow">ЗАРПЛАТА</p><h1>Моя зарплата</h1><article class="panel"><p>Адреса для виплати USDT (TON)</p><label class="salary-wallet-label">USDT гаманець · мережа TON<input class="salary-wallet-input" placeholder="UQ..." autocomplete="off" /></label><div class="salary-wallet-actions"><button class="salary-wallet-save">Зберегти</button><small class="salary-wallet-message">Вкажіть адресу для отримання майбутніх виплат.</small></div></article><article class="panel"><p>Історія виплат</p><strong>—</strong><small>Після першого нарахування тут з’являться дата, сума та статус виплати.</small></article></section>`;
    const payouts = profile?.payouts || [];
    const history = content.querySelector(".salary-panel article:last-child");
    if (history) {
      const pending = payouts.filter((payout) => payout.status === "pending").reduce((sum, payout) => sum + Number(payout.amount), 0);
      history.innerHTML = `<p>Історія виплат</p><strong>${pending ? `${pending.toFixed(2)} USDT` : "—"}</strong><small>${pending ? "Очікує на виплату" : "Немає виплат, що очікують"}</small>${payouts.length ? `<div class="payout-history">${payouts.map((payout) => `<div><span><b>${Number(payout.amount).toFixed(2)} USDT</b><small>${payout.note || "Зарплата"} · ${new Date(payout.created_at).toLocaleDateString("uk-UA")}</small></span><em class="${payout.status}">${payout.status === "paid" ? "Виплачено" : "До сплати"}</em></div>`).join("")}</div>` : ""}`;
    }
    const payoutRows = Array.from(content.querySelectorAll(".payout-history>div"));
    const onPayoutDetails = (event: Event) => {
      const payout = payouts[payoutRows.indexOf(event.currentTarget as HTMLElement)];
      if (!payout) return;
      content.querySelector(".worker-payout-detail")?.remove();
      const detail = document.createElement("div");
      detail.className = "worker-payout-detail";
      detail.innerHTML = `<button aria-label="Закрити">×</button><p class="panel-label">ДЕТАЛІ ВИПЛАТИ</p><h2>${Number(payout.amount).toFixed(2)} USDT</h2><p>Статус: <b>${payout.status === "paid" ? "Виплачено" : "До сплати"}</b></p><p>Дата нарахування: <b>${new Date(payout.created_at).toLocaleString("uk-UA")}</b></p><p>${payout.paid_at ? `Дата виплати: <b>${new Date(payout.paid_at).toLocaleString("uk-UA")}</b>` : "Виплата ще очікується"}</p><p>Примітка: <b>${payout.note || "Без примітки"}</b></p>`;
      detail.querySelector("button")?.addEventListener("click", () => detail.remove());
      content.querySelector(".salary-panel")?.append(detail);
    };
    payoutRows.forEach((row) => row.addEventListener("click", onPayoutDetails));
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
    return () => { button.removeEventListener("click", onSave); payoutRows.forEach((row) => row.removeEventListener("click", onPayoutDetails)); };
  }, [view, profile]);
  useEffect(() => {
    // Statistics view is being migrated to React; never overwrite its DOM node.
    return;
    if (view !== "statistics") return;
    const content = document.querySelector(".worker-portal-content");
    if (!content) return;
    if (!profile?.can_view_statistics) { content.innerHTML = `<article class="panel empty-applications">Доступ до статистики вимкнений CEO.</article>`; return; }
    const paid = (profile.payouts || []).filter((payout) => payout.status === "paid").reduce((sum, payout) => sum + Number(payout.amount), 0);
    const rating = profile.reviews.length ? (profile.reviews.reduce((sum, review) => sum + review.rating, 0) / profile.reviews.length).toFixed(2) : "—";
    content.innerHTML = `<section class="worker-feedback"><p class="eyebrow">СТАТИСТИКА</p><h1>Моя статистика</h1><div class="rating-summary"><article class="panel"><p>Відгуків клієнтів</p><strong>${profile.reviews.length}</strong></article><article class="panel"><p>Середній рейтинг</p><strong>${rating === "—" ? "—" : `${rating} ★`}</strong></article><article class="panel"><p>Виплачено зарплати</p><strong>${paid.toFixed(2)} USDT</strong></article></div></section>`;
  }, [view, profile]);
  const logout = () => {
    ["nezaria_access_token", "nezaria_refresh_token", "nezeriya_access_role", "nezeriya_owner_session"].forEach((key) => { window.sessionStorage.removeItem(key); window.localStorage.removeItem(key); });
    window.location.reload();
  };
  const reviews = profile?.reviews || [];
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2) : "—";
  const avatar = profile?.avatar_url;
  const displayName = profile?.full_name || name;
  const progression = profile?.progression;
  const levelProgress = progression ? Math.min(100, progression.level_progress / progression.next_level_xp * 100) : 0;
  return <main className="worker-portal"><aside className="worker-portal-sidebar"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div><nav className="worker-portal-nav"><button className={view === "chats" ? "selected" : ""} onClick={() => setView("chats")}>◉ Чати</button><button className={view === "reviews" ? "selected" : ""} onClick={() => setView("reviews")}>★ Відгуки</button><button className={view === "ratings" ? "selected" : ""} onClick={() => setView("ratings")}>✦ Оцінки</button></nav><div className="worker-profile"><AccountMenu name={displayName} role={profile?.city || "Працівник підтримки"} avatar={avatar} onSignOut={logout} /></div></aside><section className="worker-portal-content">{progression && <section className="worker-xp-card"><div><small>РІВЕНЬ ПІДТРИМКИ</small><strong>Рівень {progression.level}</strong><span>{progression.xp.toLocaleString("uk-UA")} XP</span></div><div className="worker-xp-progress"><span><b style={{ width: `${levelProgress}%` }} /></span><small>{progression.level_progress} / {progression.next_level_xp} XP до рівня {progression.level + 1}</small></div><p>Закриті чати: <b>{progression.closed_chats}</b> · Повідомлення: <b>{progression.messages_sent}</b> · Зірки: <b>{progression.stars_earned}</b></p></section>}{view === "chats" ? <SupportDesk /> : loading ? <article className="panel empty-applications">Завантажуємо дані…</article> : view === "reviews" ? <section className="worker-feedback"><p className="eyebrow">ВІДГУКИ</p><h1>Відгуки клієнтів</h1>{reviews.length === 0 ? <article className="panel empty-applications">Відгуків поки немає.</article> : <div className="worker-review-list">{reviews.map((review) => <article className="panel worker-review" key={review.id}><strong>{review.client_name}</strong><span>{"★".repeat(review.rating)}</span><p>{review.comment}</p><small>{new Date(review.created_at).toLocaleDateString("uk-UA")}</small></article>)}</div>}</section> : <section className="worker-feedback"><p className="eyebrow">ОЦІНКИ</p><h1>Рейтинг акаунта</h1><div className="rating-summary"><article className="panel"><p>Середній показник</p><strong>{average === "—" ? "—" : `${average} ★`}</strong></article><article className="panel"><p>Усього оцінок</p><strong>{reviews.length}</strong></article></div><div className="rating-breakdown">{[5,4,3,2,1].map((rating) => <div key={rating}><span>{rating} ★</span><i><b style={{ width: reviews.length ? `${reviews.filter((review) => review.rating === rating).length / reviews.length * 100}%` : "0%" }} /></i><strong>{reviews.filter((review) => review.rating === rating).length}</strong></div>)}</div></section>}</section></main>;
}

function MediaScreen({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<{ application: { status: string } | null; banners: { id: string; title: string; description: string | null; target_url: string | null; image_url: string | null }[] }>({ application: null, banners: [] });
  const [payouts, setPayouts] = useState<{ id: string; amount: number; status: "pending" | "paid"; note: string | null; created_at: string; paid_at: string | null }[]>([]);
  const [engagement, setEngagement] = useState<{ clicks: number; average_rating: number | null; reviews: { id: string; author_name: string; rating: number; comment: string; created_at: string }[] }>({ clicks: 0, average_rating: null, reviews: [] });
  const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  const [view, setView] = useState<"banners" | "salary" | "statistics">("banners");
  const load = async () => { const token = window.sessionStorage.getItem("nezaria_access_token"); const r = await fetch("/api/media", { headers: { Authorization: `Bearer ${token || ""}` } }); if (r.ok) setData(await r.json()); setLoading(false); };
  const loadPayouts = async () => { const token = window.sessionStorage.getItem("nezaria_access_token"); const r = await fetch("/api/media/payouts", { headers: { Authorization: `Bearer ${token || ""}` } }); if (r.ok) { const result = await r.json(); setPayouts(result.payouts || []); } };
  const loadEngagement = async () => { const token = window.sessionStorage.getItem("nezaria_access_token"); const r = await fetch("/api/media/engagement", { headers: { Authorization: `Bearer ${token || ""}` } }); if (r.ok) setEngagement(await r.json()); };
  useEffect(() => { void load(); void loadPayouts(); void loadEngagement(); }, []);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const token = window.sessionStorage.getItem("nezaria_access_token"); const r = await fetch("/api/media", { method: "POST", headers: { Authorization: `Bearer ${token || ""}` }, body: new FormData(event.currentTarget) }); const result = await r.json().catch(() => ({})); setMessage(r.ok ? "Заявку надіслано CEO." : result.error || "Не вдалося надіслати заявку."); if (r.ok) void load(); };
  const cancel = async () => { if (!window.confirm("Відмінити заявку? Дані та фото буде видалено.")) return; const token = window.sessionStorage.getItem("nezaria_access_token"); const r = await fetch("/api/media", { method: "DELETE", headers: { Authorization: `Bearer ${token || ""}` } }); const result = await r.json().catch(() => ({})); if (r.ok) { setData((current) => ({ ...current, application: null })); setMessage("Заявку відмінено. Ви можете подати нову."); } else setMessage(result.error || "Не вдалося відмінити заявку."); };
  const logout = () => { ["nezaria_access_token", "nezaria_refresh_token", "nezeriya_access_role", "nezeriya_owner_session"].forEach((key) => { window.sessionStorage.removeItem(key); window.localStorage.removeItem(key); }); window.location.reload(); };
  const trackBanner = (bannerId: string) => { const token = window.sessionStorage.getItem("nezaria_access_token"); void fetch("/api/media/engagement", { method: "POST", headers: { Authorization: `Bearer ${token || ""}`, "Content-Type": "application/json" }, body: JSON.stringify({ banner_id: bannerId }) }); setEngagement((current) => ({ ...current, clicks: current.clicks + 1 })); };
  if (loading) return <main className="auth-page"><article className="auth-card">Завантажуємо кабінет медійки…</article></main>;
  if (!data.application || data.application.status === "rejected") return <main className="auth-page"><section className="auth-card media-application"><button className="back-link" type="button" onClick={onBack}>← Назад до вибору ролі</button><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div><p className="eyebrow">МЕДІЙКА</p><h1>Заявка до<br /><span>медіа-команди.</span></h1><form onSubmit={submit}><input name="full_name" placeholder="ПІБ *" required /><input name="city" placeholder="Місто *" required /><input name="phone" placeholder="Телефон *" required /><input name="telegram_channel" placeholder="Telegram-канал: @nazva_kanalu *" pattern="@[A-Za-z0-9_]{5,}" required /><input name="portfolio_url" type="url" placeholder="Посилання на портфоліо *" required /><label>Фото профілю *<input name="avatar" type="file" accept="image/*" required /></label><button className="google-button mint-action">Надіслати заявку</button>{message && <p className="auth-error">{message}</p>}</form></section></main>;
  if (data.application.status !== "approved") return <main className="auth-page"><article className="auth-card"><p className="eyebrow">МЕДІЙКА</p><h1>Заявка на <span>розгляді.</span></h1><p className="auth-copy">CEO перевіряє ваші дані. Після прийняття відкриється кабінет із банерами.</p><button className="back-link cancel-application" type="button" onClick={() => void cancel()}>Відмінити заявку</button>{message && <p className="auth-error">{message}</p>}</article></main>;
  const pending = payouts.filter((payout) => payout.status === "pending").reduce((sum, payout) => sum + Number(payout.amount), 0);
  const paid = payouts.filter((payout) => payout.status === "paid").reduce((sum, payout) => sum + Number(payout.amount), 0);
  return <main className="media-cabinet"><aside className="media-sidebar"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div><nav><button className={view === "banners" ? "selected" : ""} onClick={() => setView("banners")}>▣ Банери</button><button className={view === "statistics" ? "selected" : ""} onClick={() => { setView("statistics"); void loadEngagement(); }}>◈ Статистика</button><button className={view === "salary" ? "selected" : ""} onClick={() => { setView("salary"); void loadPayouts(); }}>₮ Зарплата</button></nav><AccountMenu name="Медійка" role="Медіа-команда" onSignOut={logout} /></aside><section className="media-content">{view === "salary" ? <section className="worker-feedback salary-panel"><p className="eyebrow">ЗАРПЛАТА</p><h1>Моя зарплата</h1><div className="media-salary-summary"><article className="panel"><p>До сплати</p><strong>{pending.toFixed(2)} USDT</strong><small>Виплати, що очікують переказу.</small></article><article className="panel"><p>Виплачено всього</p><strong>{paid.toFixed(2)} USDT</strong><small>Підтверджені CEO виплати.</small></article></div><article className="panel"><p>Історія виплат</p>{payouts.length === 0 ? <small>CEO ще не створив нарахувань.</small> : <div className="payout-history">{payouts.map((payout) => <div key={payout.id}><span><b>{Number(payout.amount).toFixed(2)} USDT</b><small>{payout.note || "Нарахування медійці"} · {new Date(payout.created_at).toLocaleDateString("uk-UA")}</small></span><em className={payout.status}>{payout.status === "paid" ? "Виплачено" : "До сплати"}</em></div>)}</div>}</article></section> : view === "statistics" ? <section className="worker-feedback"><p className="eyebrow">СТАТИСТИКА МЕДІЙКИ</p><h1>Результати публікацій</h1><div className="media-stat-cards"><article className="panel"><p>Доступних банерів</p><strong>{data.banners.length}</strong></article><article className="panel"><p>Переходів за посиланнями</p><strong>{engagement.clicks}</strong></article><article className="panel"><p>Середній рейтинг</p><strong>{engagement.average_rating === null ? "—" : `${engagement.average_rating.toFixed(2)} ★`}</strong></article><article className="panel"><p>Відгуків</p><strong>{engagement.reviews.length}</strong></article></div><article className="panel media-review-panel"><h2>Відгуки</h2>{engagement.reviews.length ? engagement.reviews.map((review) => <div className="media-review" key={review.id}><span><strong>{review.author_name}</strong><b>{"★".repeat(review.rating)}</b></span><p>{review.comment}</p><small>{new Date(review.created_at).toLocaleDateString("uk-UA")}</small></div>) : <p className="subtle">Відгуків поки немає.</p>}</article></section> : <><p className="eyebrow">МАТЕРІАЛИ ДЛЯ ПУБЛІКАЦІЙ</p><h1>Доступні банери</h1>{data.banners.length ? <div className="banner-grid">{data.banners.map((banner) => <article className="panel media-banner" key={banner.id}>{banner.image_url && <img src={banner.image_url} alt={banner.title} />}<h2>{banner.title}</h2>{banner.description && <p>{banner.description}</p>}{banner.target_url && <a href={banner.target_url} target="_blank" rel="noreferrer" onClick={() => trackBanner(banner.id)}>Відкрити посилання →</a>}</article>)}</div> : <article className="panel empty-applications">CEO ще не додав банери.</article>}</>}</section></main>;
}

function MediaOwnerPanel() {
  const [data, setData] = useState<{ applications: { id: string; full_name: string; city: string; phone: string; telegram_channel: string; portfolio_url: string; status: string }[]; banners: { id: string; title: string; description: string | null; target_url: string | null; image_url: string | null }[] }>({ applications: [], banners: [] });
  const [payouts, setPayouts] = useState<{ id: string; media_application_id: string; amount: number; status: "pending" | "paid"; note: string | null; created_at: string }[]>([]);
  const [mediaStatistics, setMediaStatistics] = useState<{ id: string; full_name: string; banners: number; clicks: number; paid: number; pending: number; reviews: number; average_rating: number | null }[]>([]);
  const [payoutForm, setPayoutForm] = useState({ media_application_id: "", amount: "", note: "", status: "pending" as "pending" | "paid" });
  const [reviewForm, setReviewForm] = useState({ media_application_id: "", author_name: "Клієнт", rating: "5", comment: "" });
  const [message, setMessage] = useState("");
  const headers = () => ({ Authorization: `Bearer ${window.sessionStorage.getItem("nezaria_access_token") || ""}`, "x-owner-session": window.sessionStorage.getItem("nezeriya_owner_session") || "" });
  const load = async () => { const [media, paymentData, analytics] = await Promise.all([fetch("/api/owner/media", { headers: headers() }), fetch("/api/owner/media/payouts", { headers: headers() }), fetch("/api/owner/media/analytics", { headers: headers() })]); if (media.ok) setData(await media.json()); if (paymentData.ok) { const result = await paymentData.json(); setPayouts(result.payouts || []); } if (analytics.ok) { const result = await analytics.json(); setMediaStatistics(result.statistics || []); } };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const panel = document.querySelector(".media-payroll");
    const list = panel?.querySelector(".owner-payout-list");
    if (!panel || !list || panel.querySelector(".payout-filter-bar")) return;
    const filters = document.createElement("div"); filters.className = "list-filters payout-filter-bar";
    const input = document.createElement("input"); input.placeholder = "Пошук виплати або медійки";
    const status = document.createElement("select"); status.innerHTML = "<option value=\"all\">Усі виплати</option><option value=\"pending\">До сплати</option><option value=\"paid\">Виплачено</option>";
    const count = document.createElement("span");
    const apply = () => { let visible = 0; list.querySelectorAll(":scope>div").forEach((row) => { const matchesText = row.textContent?.toLocaleLowerCase("uk-UA").includes(input.value.trim().toLocaleLowerCase("uk-UA")) ?? true; const matchesStatus = status.value === "all" || row.querySelector(`em.${status.value}`); const show = matchesText && Boolean(matchesStatus); (row as HTMLElement).style.display = show ? "flex" : "none"; if (show) visible += 1; }); count.textContent = `Знайдено: ${visible}`; };
    input.addEventListener("input", apply); status.addEventListener("change", apply); filters.append(input, status, count); panel.querySelector(".owner-payroll-form")?.insertAdjacentElement("afterend", filters); apply();
    return () => filters.remove();
  }, [payouts]);
  const decide = async (id: string, status: string) => { await fetch("/api/owner/media", { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); void load(); };
  const upload = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const r = await fetch("/api/owner/media", { method: "POST", headers: headers(), body: new FormData(event.currentTarget) }); const result = await r.json().catch(() => ({})); setMessage(r.ok ? "Банер додано." : result.error || "Не вдалося додати банер."); if (r.ok) { event.currentTarget.reset(); void load(); } };
  const createPayout = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const amount = Number(payoutForm.amount); const r = await fetch("/api/owner/media/payouts", { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ ...payoutForm, amount }) }); const result = await r.json().catch(() => ({})); setMessage(r.ok ? "Виплату створено." : result.error || "Не вдалося створити виплату."); if (r.ok) { setPayoutForm({ media_application_id: "", amount: "", note: "", status: "pending" }); void load(); } };
  const markPaid = async (id: string) => { const r = await fetch("/api/owner/media/payouts", { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); const result = await r.json().catch(() => ({})); setMessage(r.ok ? "Виплату позначено як здійснену." : result.error || "Не вдалося оновити виплату."); if (r.ok) void load(); };
  const addReview = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const r = await fetch("/api/owner/media/analytics", { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ ...reviewForm, rating: Number(reviewForm.rating) }) }); const result = await r.json().catch(() => ({})); setMessage(r.ok ? "Відгук додано." : result.error || "Не вдалося додати відгук."); if (r.ok) { setReviewForm({ media_application_id: "", author_name: "Клієнт", rating: "5", comment: "" }); void load(); } };
  const approved = data.applications.filter((application) => application.status === "approved");
  const applicationName = (id: string) => data.applications.find((application) => application.id === id)?.full_name || "Медійка";
  return <section className="media-owner-page">
    <section className="heading-row"><div><p className="eyebrow">МЕДІЙКА</p><h1>Медіа <span>кабінет</span></h1><p className="subtle">Заявки медійок, банери, переходи та виплати.</p></div><button className="sync" onClick={() => void load()}>↻ Оновити</button></section>
    <article className="panel media-upload"><h2>Додати банер</h2><form onSubmit={upload}><input name="title" placeholder="Назва банера *" required /><input name="target_url" type="url" placeholder="Посилання (необов’язково)" /><textarea name="description" placeholder="Опис" /><input name="image" type="file" accept="image/*" required /><button>Завантажити банер</button></form>{message && <p>{message}</p>}</article>
    <article className="panel media-payroll"><div className="owner-payroll-head"><h2>Виплати медійкам</h2><span>Створюйте USDT-виплати та підтверджуйте переказ.</span></div><form className="media-payroll-form" onSubmit={createPayout}><select value={payoutForm.media_application_id} required onChange={(event) => setPayoutForm({ ...payoutForm, media_application_id: event.target.value })}><option value="">Оберіть медійку</option>{approved.map((application) => <option key={application.id} value={application.id}>{application.full_name}</option>)}</select><input type="number" min="0.01" step="0.01" placeholder="Сума USDT" value={payoutForm.amount} required onChange={(event) => setPayoutForm({ ...payoutForm, amount: event.target.value })} /><input placeholder="Примітка (необов’язково)" value={payoutForm.note} onChange={(event) => setPayoutForm({ ...payoutForm, note: event.target.value })} /><select value={payoutForm.status} onChange={(event) => setPayoutForm({ ...payoutForm, status: event.target.value as "pending" | "paid" })}><option value="pending">До сплати</option><option value="paid">Виплачено</option></select><button>Створити</button></form>{payouts.length ? <div className="owner-payout-list">{payouts.map((payout) => <div key={payout.id}><span><b>{Number(payout.amount).toFixed(2)} USDT · {applicationName(payout.media_application_id)}</b><small>{payout.note || "Без примітки"} · {new Date(payout.created_at).toLocaleDateString("uk-UA")}</small></span><em className={payout.status}>{payout.status === "paid" ? "Виплачено" : "До сплати"}</em>{payout.status === "pending" && <button onClick={() => void markPaid(payout.id)}>Позначити виплаченою</button>}</div>)}</div> : <p className="subtle">Виплат ще немає.</p>}</article>
    <section className="media-stat-grid">{mediaStatistics.map((stat) => <article className="panel media-stat-row" key={stat.id}><div><h2>{stat.full_name}</h2><p>{stat.banners} банерів · {stat.clicks} переходів</p></div><div><b>{stat.paid.toFixed(2)} USDT</b><small>виплачено</small></div><div><b>{stat.pending.toFixed(2)} USDT</b><small>до сплати</small></div><div><b>{stat.average_rating === null ? "—" : `${stat.average_rating.toFixed(2)} ★`}</b><small>{stat.reviews} відгуків</small></div></article>)}</section>
    <article className="panel media-review-form"><h2>Додати відгук медійці</h2><form onSubmit={addReview}><select value={reviewForm.media_application_id} required onChange={(event) => setReviewForm({ ...reviewForm, media_application_id: event.target.value })}><option value="">Оберіть медійку</option>{approved.map((application) => <option key={application.id} value={application.id}>{application.full_name}</option>)}</select><input value={reviewForm.author_name} maxLength={100} placeholder="Ім’я автора" onChange={(event) => setReviewForm({ ...reviewForm, author_name: event.target.value })} /><select value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: event.target.value })}>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} зірок</option>)}</select><input value={reviewForm.comment} required placeholder="Текст відгуку" onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })} /><button>Зберегти відгук</button></form></article>
    <section className="media-owner-grid"><article className="panel"><h2>Заявки медійок</h2>{data.applications.length ? data.applications.map((application) => <div className="media-application-row" key={application.id}><div><strong>{application.full_name}</strong><small>{application.city} · {application.phone} · {application.telegram_channel}</small><a href={application.portfolio_url} target="_blank" rel="noreferrer">Портфоліо</a></div><em className={application.status}>{application.status === "pending" ? "На розгляді" : application.status === "approved" ? "Прийнято" : "Відхилено"}</em>{application.status === "pending" && <span><button onClick={() => void decide(application.id, "approved")}>Прийняти</button><button className="reject" onClick={() => void decide(application.id, "rejected")}>Відхилити</button></span>}</div>) : <p>Заявок поки немає.</p>}</article><article className="panel"><h2>Опубліковані банери</h2><div className="banner-list">{data.banners.map((banner) => <div key={banner.id}>{banner.image_url && <img src={banner.image_url} alt="" />}<strong>{banner.title}</strong></div>)}</div></article></section>
  </section>;
  return <section className="media-owner-page"><section className="heading-row"><div><p className="eyebrow">МЕДІЙКА</p><h1>Медіа <span>кабінет</span></h1><p className="subtle">Заявки медійок, банери та виплати.</p></div><button className="sync" onClick={() => void load()}>↻ Оновити</button></section><article className="panel media-upload"><h2>Додати банер</h2><form onSubmit={upload}><input name="title" placeholder="Назва банера *" required /><input name="target_url" type="url" placeholder="Посилання (необов’язково)" /><textarea name="description" placeholder="Опис" /><input name="image" type="file" accept="image/*" required /><button>Завантажити банер</button></form>{message && <p>{message}</p>}</article><article className="panel media-payroll"><div className="owner-payroll-head"><h2>Виплати медійкам</h2><span>Створюйте USDT-виплати та підтверджуйте переказ.</span></div><form className="media-payroll-form" onSubmit={createPayout}><select value={payoutForm.media_application_id} required onChange={(event) => setPayoutForm({ ...payoutForm, media_application_id: event.target.value })}><option value="">Оберіть медійку</option>{approved.map((application) => <option key={application.id} value={application.id}>{application.full_name}</option>)}</select><input type="number" min="0.01" step="0.01" placeholder="Сума USDT" value={payoutForm.amount} required onChange={(event) => setPayoutForm({ ...payoutForm, amount: event.target.value })} /><input placeholder="Примітка (необов’язково)" value={payoutForm.note} onChange={(event) => setPayoutForm({ ...payoutForm, note: event.target.value })} /><select value={payoutForm.status} onChange={(event) => setPayoutForm({ ...payoutForm, status: event.target.value as "pending" | "paid" })}><option value="pending">До сплати</option><option value="paid">Виплачено</option></select><button>Створити</button></form>{payouts.length ? <div className="owner-payout-list">{payouts.map((payout) => <div key={payout.id}><span><b>{Number(payout.amount).toFixed(2)} USDT · {applicationName(payout.media_application_id)}</b><small>{payout.note || "Без примітки"} · {new Date(payout.created_at).toLocaleDateString("uk-UA")}</small></span><em className={payout.status}>{payout.status === "paid" ? "Виплачено" : "До сплати"}</em>{payout.status === "pending" && <button onClick={() => void markPaid(payout.id)}>Позначити виплаченою</button>}</div>)}</div> : <p className="subtle">Виплат ще немає.</p>}</article><section className="media-owner-grid"><article className="panel"><h2>Заявки медійок</h2>{data.applications.length ? data.applications.map((application) => <div className="media-application-row" key={application.id}><div><strong>{application.full_name}</strong><small>{application.city} · {application.phone} · {application.telegram_channel}</small><a href={application.portfolio_url} target="_blank" rel="noreferrer">Портфоліо</a></div><em className={application.status}>{application.status === "pending" ? "На розгляді" : application.status === "approved" ? "Прийнято" : "Відхилено"}</em>{application.status === "pending" && <span><button onClick={() => void decide(application.id, "approved")}>Прийняти</button><button className="reject" onClick={() => void decide(application.id, "rejected")}>Відхилити</button></span>}</div>) : <p>Заявок поки немає.</p>}</article><article className="panel"><h2>Опубліковані банери</h2><div className="banner-list">{data.banners.map((banner) => <div key={banner.id}>{banner.image_url && <img src={banner.image_url} alt="" />}<strong>{banner.title}</strong></div>)}</div></article></section></section>;
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

function RoleScreen({ name, onOwnerCode, onWorker, onMedia }: { name: string; onOwnerCode: (code: string, twoFactorCode?: string) => Promise<true | string>; onWorker: () => void; onMedia: () => void }) {
  const [mode, setMode] = useState<"choose" | "owner">("choose");
  const [code, setCode] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"uk" | "ru">("uk");
  const copy = language === "ru" ? {
    workspace: "ВХОД В РАБОЧЕЕ ПРОСТРАНСТВО", greeting: "Добро пожаловать", choose: "Выберите роль.", explanation: "Роль определяет, какие инструменты будут доступны в вашем кабинете.",
    owner: "Владелец", ownerDescription: "Полная аналитика, команда и настройки", worker: "Сотрудник", workerDescription: "Подать заявку или перейти в поддержку", media: "Я медийщик", mediaDescription: "Подать заявку и получить баннеры для публикаций",
    back: "← Назад", ownerCheck: "ПОДТВЕРЖДЕНИЕ ВЛАДЕЛЬЦА", enter: "Введите", accessCode: "код доступа.", codeDescription: "Код безопасно проверяется на сервере и никогда не показывается в браузере.", codePlaceholder: "Код владельца", open: "Открыть панель", checking: "Проверяем…",
  } : {
    workspace: "ВХІД У РОБОЧИЙ ПРОСТІР", greeting: "Вітаємо", choose: "Оберіть роль.", explanation: "Роль визначає, які інструменти будуть доступні у вашому кабінеті.",
    owner: "Власник", ownerDescription: "Повна аналітика, команда та налаштування", worker: "Працівник", workerDescription: "Подати заявку або перейти до підтримки", media: "Я медійка", mediaDescription: "Подати заявку та отримати банери для публікацій",
    back: "← Назад", ownerCheck: "ПІДТВЕРДЖЕННЯ ВЛАСНИКА", enter: "Введіть", accessCode: "код доступу.", codeDescription: "Код перевіряється безпечно на сервері та ніколи не показується у браузері.", codePlaceholder: "Код власника", open: "Відкрити панель", checking: "Перевіряємо…",
  };
  useEffect(() => { const saved = window.localStorage.getItem("nezeriya_interface_language"); if (saved === "uk" || saved === "ru") setLanguage(saved); }, []);
  const changeLanguage = (value: "uk" | "ru") => { setLanguage(value); window.localStorage.setItem("nezeriya_interface_language", value); };
  useEffect(() => {
    if (mode !== "choose") return;
    const options = document.querySelector(".role-options");
    if (!options || options.querySelector(".media-role-option")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "role-option media-role-option";
    button.innerHTML = `<b>▣</b><span><strong>${copy.media}</strong><small>${copy.mediaDescription}</small></span><i>→</i>`;
    button.onclick = onMedia;
    options.append(button);
    return () => button.remove();
  }, [mode, onMedia, language]);

  useEffect(() => {
    if (mode !== "owner") return;
    const form = document.querySelector(".role-card form");
    const submitButton = form?.querySelector(".mint-action");
    if (!form || !submitButton || form.querySelector(".owner-two-factor")) return;
    const input = document.createElement("input");
    input.className = "owner-code owner-two-factor";
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "one-time-code";
    input.maxLength = 6;
    input.placeholder = "Код 2FA з Authenticator";
    input.setAttribute("aria-label", "Код двофакторної автентифікації");
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 6);
      setTwoFactorCode(input.value);
    });
    form.insertBefore(input, submitButton);
    return () => input.remove();
  }, [mode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await onOwnerCode(code, twoFactorCode);
    setLoading(false);
    if (result !== true) setError(result);
  };

  return <main className="auth-page"><section className="auth-card role-card"><label className="language-select">🌐 <select value={language} onChange={(event) => changeLanguage(event.target.value as "uk" | "ru")} aria-label="Мова"><option value="uk">Українська</option><option value="ru">Русский</option></select></label><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div>{mode === "choose" ? <><p className="eyebrow">{copy.workspace}</p><h1>{copy.greeting}, {name}.<br /><span>{copy.choose}</span></h1><p className="auth-copy">{copy.explanation}</p><div className="role-options"><button className="role-option" onClick={() => setMode("owner")}><b>◈</b><span><strong>{copy.owner}</strong><small>{copy.ownerDescription}</small></span><i>→</i></button><button className="role-option" onClick={onWorker}><b>◌</b><span><strong>{copy.worker}</strong><small>{copy.workerDescription}</small></span><i>→</i></button></div></> : <form onSubmit={submit}><button className="back-link" type="button" onClick={() => setMode("choose")}>{copy.back}</button><p className="eyebrow">{copy.ownerCheck}</p><h1>{copy.enter}<br /><span>{copy.accessCode}</span></h1><p className="auth-copy">{copy.codeDescription}</p><input className="owner-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder={copy.codePlaceholder} autoFocus required /><button className="google-button mint-action" disabled={loading}>{loading ? copy.checking : copy.open}</button>{error && <p className="auth-error">{error}</p>}</form>}</section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;
}

function WorkerScreen({ name, onSubmit, onCheckStatus, onCancelApplication, onPresence }: { name: string; onSubmit: (application: { full_name: string; city: string; age: number; phone: string; ton_usdt_wallet: string }, document: File, facePhoto: File) => Promise<{ ok: boolean; message: string }>; onCheckStatus: () => Promise<"pending" | "approved" | "rejected" | "terminated" | "frozen" | null>; onCancelApplication: () => Promise<{ ok: boolean; message: string }>; onPresence: () => Promise<void> }) {
  const [form, setForm] = useState({ first_name: name, last_name: "", patronymic: "", city: "", age: "", phone: "", ton_usdt_wallet: "", document_note: "" });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [facePhotoFile, setFacePhotoFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"checking" | "pending" | "approved" | "rejected" | "terminated" | "frozen" | null>("checking");

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
    if (applicationStatus === "checking" || applicationStatus === "approved" || applicationStatus === "pending" || applicationStatus === "terminated" || applicationStatus === "frozen") return;
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
  if (applicationStatus === "frozen") return <WorkerStatusScreen name={name} title="Акаунт тимчасово заморожено." text="Доступ до кабінету підтримки тимчасово призупинено власником. Зверніться до власника для розморозки." />;
  if (applicationStatus === "pending") return <WorkerStatusScreen name={name} title="Заявка на розгляді." text="Власник перевіряє ваші дані. Після прийняття тут відкриється робочий кабінет." onCancel={onCancelApplication} />;

  return <main className="auth-page"><section className="auth-card worker-card"><div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div>{submitted ? <><p className="eyebrow">ЗАЯВКУ НАДІСЛАНО</p><h1>Дякуємо,<br /><span>{name}.</span></h1><p className="auth-copy">Власник перевірить вашу заявку. Після схвалення тут відкриється кабінет підтримки.</p><div className="worker-status"><i /> {message}</div></> : <form onSubmit={submit}><p className="eyebrow">АНКЕТА ПРАЦІВНИКА</p><h1>Приєднайтесь<br /><span>до команди.</span></h1><p className="auth-copy">Заповніть дані для розгляду заявки. Усі поля з позначкою * обов’язкові.</p><div className="form-grid"><label>Прізвище *<input value={form.last_name} onChange={(event) => update("last_name", event.target.value)} required /></label><label>Ім’я *<input value={form.first_name} onChange={(event) => update("first_name", event.target.value)} required /></label><label>По батькові *<input value={form.patronymic} onChange={(event) => update("patronymic", event.target.value)} required /></label><label>Місто *<input value={form.city} onChange={(event) => update("city", event.target.value)} required /></label><label>Вік *<input type="number" min="16" max="99" value={form.age} onChange={(event) => update("age", event.target.value)} required /></label><label>Телефон *<input value={form.phone} onChange={(event) => update("phone", event.target.value)} required /></label></div><label className="wide-field">Фото паспорта *<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} required /></label><label className="wide-field">Фото обличчя *<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFacePhotoFile(event.target.files?.[0] || null)} required /></label><label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>Погоджуюсь на обробку моїх персональних даних для розгляду заявки.</span></label><p className="auth-copy">JPG, PNG або WEBP — до 8 МБ кожне.</p><button className="google-button mint-action" disabled={loading}>{loading ? "Надсилаємо…" : "Надіслати заявку"}</button>{message && <p className="auth-error">{message}</p>}</form>}</section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;
}
