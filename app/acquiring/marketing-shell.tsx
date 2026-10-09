"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./marketing-theme.css";

export const marketingLinks = [
  ["features", "Можливості", "/acquiring/features"],
  ["how", "Як це працює", "/acquiring/how"],
  ["cabinet", "Кабінет", "/acquiring/cabinet"],
  ["about", "Про нас", "/acquiring/about"],
  ["security", "Безпека", "/acquiring/security"],
  ["developers", "Розробникам", "/acquiring/developers"],
  ["pricing", "Тариф", "/acquiring/pricing"],
  ["faq", "FAQ", "/acquiring/faq"],
] as const;

function Brand() {
  return <Link className="np-brand" href="/acquiring" aria-label="Nezeriya Pay — головна"><span className="np-logo-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="2.25" y="3" width="15" height="18" rx="3" stroke="currentColor" strokeWidth="1.7" /><path d="M6.5 16V8l6.5 8V8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 8.5c1.7.8 2.5 2 2.5 3.5s-.8 2.7-2.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>NEZERIYA <strong>PAY</strong></Link>;
}

export function MarketingHeader({ active, onEnter }: { active?: string; onEnter?: () => void }) {
  const [open, setOpen] = useState(false);
  const enter = () => { setOpen(false); if (onEnter) onEnter(); else window.location.assign("/acquiring?login=1"); };
  return <header className={`np-nav${open ? " open" : ""}`}>
    <div className="np-wrap np-nav-row">
      <Brand />
      <button className="np-nav-toggle" type="button" aria-label="Відкрити меню" aria-expanded={open} onClick={() => setOpen((value) => !value)}>☰</button>
      <nav className="np-nav-links" aria-label="Основна навігація">
        {marketingLinks.map(([key, label, href]) => <Link key={key} href={href} aria-current={active === key ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
      </nav>
      <div className="np-nav-actions"><button className="np-login" type="button" onClick={enter}>Увійти</button><button className="np-register" type="button" onClick={enter}>Реєстрація</button></div>
    </div>
  </header>;
}

export function MarketingFooter() {
  return <footer className="np-footer"><div className="np-wrap np-footer-row"><Brand /><span className="np-footer-copy">Приймання платежів у USDT і GRAM для бізнесу.</span><a className="np-footer-link" href="https://t.me/Nezeriya_Wallet_Bot?startapp" target="_blank" rel="noreferrer">@Nezeriya_Wallet_Bot</a></div></footer>;
}

export function MarketingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".np-marketing");
    if (!root) return;
    root.classList.add("np-js");
    const revealElements = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));

    // Some embedded browsers (and privacy-hardened WebViews) do not expose
    // IntersectionObserver. Never let a decorative animation hide the page in
    // that case: the content must remain usable without this browser API.
    if (!("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return () => root.classList.remove("np-js");
    }

    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); reveal.unobserve(entry.target); } }), { threshold: .15 });
    revealElements.forEach((element) => reveal.observe(element));
    const updateProgress = () => root.style.setProperty("--np-scroll", `${Math.min(100, (window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) * 100)}%`);
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    return () => { reveal.disconnect(); window.removeEventListener("scroll", updateProgress); root.classList.remove("np-js"); };
  }, []);
  return <div className="np-scroll-progress" aria-hidden="true" />;
}
