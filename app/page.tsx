"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const multipliers = { low: [5.6, 2.1, 1.4, 1.1, 1, .7, .7, 1, 1.1, 1.4, 2.1, 5.6], medium: [13, 3, 1.6, 1.1, .7, .5, .5, .7, 1.1, 1.6, 3, 13], high: [29, 4, 1.8, .7, .4, .2, .2, .4, .7, 1.8, 4, 29] } as const;
type Risk = keyof typeof multipliers;
type TelegramWebApp = {
  ready: () => void; expand: () => void; setHeaderColor?: (color: string) => void; setBackgroundColor?: (color: string) => void;
  themeParams?: Record<string, string | undefined>; onEvent?: (event: string, listener: () => void) => void; offEvent?: (event: string, listener: () => void) => void;
  HapticFeedback?: { impactOccurred: (style: "light" | "medium" | "heavy") => void; notificationOccurred: (type: "success" | "error") => void };
};
declare global { interface Window { Telegram?: { WebApp?: TelegramWebApp } } }

export default function Plinko() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [balance, setBalance] = useState(1000), [bet, setBet] = useState(10), [risk, setRisk] = useState<Risk>("medium"), [rows, setRows] = useState(12), [playing, setPlaying] = useState(false), [result, setResult] = useState<{ multiplier: number; win: number } | null>(null);
  const drawBoard = useCallback((ball?: { x: number; y: number }) => {
    const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    const c = canvas.getContext("2d"); if (!c) return; c.scale(dpr, dpr); const w = rect.width, h = rect.height, slots = 12, top = 42, bottom = h - 54, gapY = (bottom - top) / rows;
    c.fillStyle = "#071422"; c.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) { const count = r + 1, spacing = Math.min(33, (w - 44) / (count + 1)), start = w / 2 - ((count - 1) * spacing) / 2; for (let i = 0; i < count; i++) { const x = start + i * spacing, y = top + r * gapY; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fillStyle = "#4ea8da"; c.fill(); c.beginPath(); c.arc(x - 1, y - 1, 1.5, 0, Math.PI * 2); c.fillStyle = "#b9e9ff"; c.fill(); } }
    const values = multipliers[risk], slotW = w / slots; values.forEach((v, i) => { c.fillStyle = v >= 5 ? "#ff4d65" : v >= 1.4 ? "#ffbd49" : v < 1 ? "#397cb5" : "#4ebd9d"; c.beginPath(); c.roundRect(i * slotW + 3, bottom + 12, slotW - 6, 31, 5); c.fill(); c.fillStyle = "#06131e"; c.font = "700 11px Arial"; c.textAlign = "center"; c.fillText(`${v}×`, i * slotW + slotW / 2, bottom + 32); });
    if (ball && Number.isFinite(ball.x) && Number.isFinite(ball.y)) { const glow = c.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, 20); glow.addColorStop(0, "#fff7b8"); glow.addColorStop(.25, "#ffd34f"); glow.addColorStop(1, "transparent"); c.fillStyle = glow; c.beginPath(); c.arc(ball.x, ball.y, 20, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(ball.x, ball.y, 8, 0, Math.PI * 2); c.fillStyle = "#ffe86f"; c.fill(); c.beginPath(); c.arc(ball.x - 2, ball.y - 3, 2.5, 0, Math.PI * 2); c.fillStyle = "#fff"; c.fill(); }
  }, [risk, rows]);
  useEffect(() => { drawBoard(); }, [drawBoard]); useEffect(() => { const resize = () => drawBoard(); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, [drawBoard]);
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;
    const syncTheme = () => {
      const background = webApp.themeParams?.bg_color || "#06111d";
      document.documentElement.style.setProperty("--telegram-background", background);
    };
    syncTheme(); webApp.ready(); webApp.expand(); webApp.setHeaderColor?.("#071523"); webApp.setBackgroundColor?.("#06111d");
    webApp.onEvent?.("themeChanged", syncTheme);
    return () => webApp.offEvent?.("themeChanged", syncTheme);
  }, []);
  function drop() {
    if (playing || bet <= 0 || bet > balance) return;
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
    setPlaying(true); setResult(null); setBalance(x => x - bet);
    const directions = Array.from({ length: rows }, () => Math.random() < .5 ? -1 : 1);
    const rightTurns = directions.filter(direction => direction === 1).length;
    const target = Math.min(11, Math.floor((rightTurns / rows) * 12));
    const duration = Math.max(3200, rows * 285), started = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - started) / duration, 1), canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.getBoundingClientRect().width, h = canvas.getBoundingClientRect().height;
      const boardTop = 42, boardBottom = h - 54, gapY = (boardBottom - boardTop) / rows;
      const progress = Math.min(p * rows, rows - .001), row = Math.max(0, Math.min(rows - 1, Math.floor(progress))), local = progress - row;
      const pathStart = w / 2 + (target + .5 - 6) * (w / 12) * (row / rows);
      const pathEnd = w / 2 + (target + .5 - 6) * (w / 12) * ((row + 1) / rows);
      const bounce = Math.sin(local * Math.PI);
      const x = pathStart + (pathEnd - pathStart) * local + directions[row] * bounce * 14;
      const y = boardTop + progress * gapY - bounce * 16;
      drawBoard({ x, y });
      if (p < 1) requestAnimationFrame(animate);
      else {
        const multiplier = multipliers[risk][target], win = Math.round(bet * multiplier * 100) / 100;
        setBalance(x => x + win); setResult({ multiplier, win }); setPlaying(false);
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(multiplier >= 1 ? "success" : "error");
      }
    };
    requestAnimationFrame(animate);
  }
  return <main className="plinko-app"><header><div className="brand"><span>✦</span> NEZARIA <small>PLINKO</small></div><div className="demo">ДЕМО-РЕЖИМ</div><div className="balance">Баланс <b>{balance.toLocaleString("uk-UA", { minimumFractionDigits: 2 })} USDT</b></div></header><section className="game-shell"><aside className="controls"><p className="eyebrow">НАЛАШТУВАННЯ ГРИ</p><label>Ставка <div className="input-line"><input type="number" min="1" value={bet} onChange={e => setBet(Math.max(1, Number(e.target.value)))} /><span>USDT</span></div></label><div className="quick"><button onClick={() => setBet(Math.max(1, bet / 2))}>½</button><button onClick={() => setBet(bet * 2)}>×2</button><button onClick={() => setBet(Math.floor(balance))}>MAX</button></div><label>Ризик</label><div className="segmented">{(["low", "medium", "high"] as Risk[]).map(item => <button className={risk === item ? "active" : ""} onClick={() => setRisk(item)} key={item}>{item === "low" ? "Низький" : item === "medium" ? "Середній" : "Високий"}</button>)}</div><label>Кількість рядів <span className="value">{rows}</span></label><input className="range" type="range" min="8" max="16" value={rows} onChange={e => setRows(Number(e.target.value))} /><button className="drop" onClick={drop} disabled={playing || bet > balance}>{playing ? "КУЛЬКА В ГРІ..." : "ЗАПУСТИТИ КУЛЬКУ"}</button><p className="fair">◈ Тестова гра · без реальних ставок</p></aside><section className="board-area"><div className="board-head"><div><p>PLINKO</p><h1>Обери шлях кульки</h1></div><span>{risk === "low" ? "Стабільна гра" : risk === "medium" ? "Збалансований ризик" : "Високі множники"}</span></div><canvas aria-label="Ігрове поле Plinko" ref={canvasRef} />{result && <div className={`result ${result.multiplier >= 1 ? "win" : "loss"}`}>{result.multiplier >= 1 ? "+" : ""}{result.win.toFixed(2)} USDT <small>{result.multiplier}×</small></div>}</section></section></main>;
}
