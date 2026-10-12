import Link from "next/link";
import "./acquiring/marketing-theme.css";

export default function NotFound() {
  return <main className="np-marketing" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><section className="np-wrap" style={{ textAlign: "center", padding: "48px 0" }}><p className="np-kicker">— 404</p><h1 style={{ font: "600 clamp(2.2rem, 7vw, 5rem)/1.1 Unbounded, Arial, sans-serif", letterSpacing: "-.01em" }}>Сторінку не знайдено</h1><p style={{ color: "var(--np-muted)", fontSize: 18 }}>Перейдіть на головну сторінку Nezeriya Pay або відкрийте кабінет.</p><Link className="np-page-button" href="/acquiring">На головну <span>↗</span></Link></section></main>;
}
