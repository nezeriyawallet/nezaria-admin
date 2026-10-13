"use client";

import { useEffect, useState } from "react";

type Setup = { configured: true } | { configured: false; secret: string; qrSvg: string };

const authHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${window.sessionStorage.getItem("nezaria_access_token") || window.localStorage.getItem("nezaria_access_token") || ""}`,
  "x-owner-session": window.sessionStorage.getItem("nezeriya_owner_session") || window.localStorage.getItem("nezeriya_owner_session") || "",
});

export default function OwnerTwoFactorSetup() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/owner/2fa", { cache: "no-store", headers: authHeaders() });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setError(body.error || "Не вдалося підготувати 2FA.");
      else setSetup(body as Setup);
    })();
  }, []);

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!setup || setup.configured) return;
    setChecking(true);
    setError("");
    const response = await fetch("/api/owner/2fa", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ secret: setup.secret, code }),
    });
    const body = await response.json().catch(() => ({}));
    setChecking(false);
    if (response.ok) setConfirmed(true);
    else setError(body.error || "Код не збігається.");
  };

  const copySecret = async () => {
    if (!setup || setup.configured) return;
    await navigator.clipboard.writeText(setup.secret);
    setCopied(true);
  };

  return <main className="auth-page"><section className="auth-card role-card">
    <div className="brand"><span className="brand-mark">N</span><span>nezeriya<span className="brand-light">.wallet</span></span></div>
    <p className="eyebrow">Захист входу власника</p>
    <h1>Налаштування<br /><span>2FA</span></h1>
    {!setup && !error && <p className="auth-copy">Готуємо QR-код…</p>}
    {setup?.configured && <p className="auth-copy">2FA вже налаштована. Вхід у кабінет вимагає код з Authenticator.</p>}
    {setup && !setup.configured && !confirmed && <form onSubmit={confirm}>
      <p className="auth-copy">1. Відкрий Google Authenticator → «+» → «Сканувати QR-код» і наведи камеру на код нижче.</p>
      <div style={{ background: "#fff", borderRadius: 16, padding: 12, width: 220, margin: "12px auto" }} dangerouslySetInnerHTML={{ __html: setup.qrSvg }} />
      <p className="auth-copy">2. Введи 6-значний код, який з'явився в Authenticator для «Nezeriya».</p>
      <input className="owner-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Код з Authenticator" required />
      <button className="google-button mint-action" disabled={checking || code.length !== 6}>{checking ? "Перевіряємо…" : "Перевірити код"}</button>
    </form>}
    {setup && !setup.configured && confirmed && <>
      <p className="auth-copy">✅ Код підходить. Останній крок — збережи ключ на Render, щоб вхід почав його вимагати:</p>
      <button className="google-button mint-action" type="button" onClick={copySecret}>{copied ? "Ключ скопійовано ✓" : "Скопіювати ключ"}</button>
      <p className="auth-copy">Render → <b>nezeriya-dashboard</b> → Environment → Edit → поле біля <b>OWNER_2FA_TOTP_SECRET</b> → Ctrl+V → <b>Save and deploy</b>. Не закривай цю сторінку, доки не збережеш.</p>
    </>}
    {error && <p className="auth-error">{error}</p>}
  </section><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></main>;
}
