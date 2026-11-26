// Nezeriya site: header state, mobile menu, scroll reveal, 3D tilt, particles, tabs.
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector(".site-header");
  const progress = document.querySelector(".progress");

  const onScroll = () => {
    const y = window.scrollY;
    header && header.classList.toggle("scrolled", y > 20);
    if (progress) {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const burger = document.querySelector(".burger");
  burger && burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  document.querySelectorAll(".nav-links a").forEach((a) => a.addEventListener("click", () => document.body.classList.remove("menu-open")));

  // Reveal on scroll + rings + counters
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.dataset.count) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18 });
  document.querySelectorAll(".reveal, .ring, [data-count]").forEach((el) => io.observe(el));

  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split(".")[1] || "").length;
    const suffix = el.innerHTML.replace(/^[\d.,\s]+/, "");
    if (reduce) return;
    const t0 = performance.now(), dur = 1600;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const v = target * (1 - Math.pow(1 - p, 3));
      el.innerHTML = v.toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Spotlight on tiles
  document.querySelectorAll(".tile").forEach((t) => {
    t.addEventListener("pointermove", (e) => {
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", `${e.clientX - r.left}px`);
      t.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  // 3D tilt for cards marked [data-tilt]
  if (!reduce) {
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      const base = el.style.transform || "";
      const max = parseFloat(el.dataset.tilt) || 14;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `${base} rotateY(${x * max}deg) rotateX(${-y * max}deg)`;
        el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
        el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
      });
      el.addEventListener("pointerleave", () => { el.style.transform = base; });
    });
  }

  // Phone screen: scale the 390px-wide app layout to the phone's screen
  const fitOne = (sc) => { const w = sc.clientWidth; if (w > 0) sc.style.setProperty("--k", (w / 390).toFixed(5)); };
  const screens = document.querySelectorAll(".screen.app");
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver((es) => es.forEach((e) => fitOne(e.target)));
    screens.forEach((sc) => ro.observe(sc));
  } else {
    addEventListener("resize", () => screens.forEach(fitOne));
    screens.forEach(fitOne);
  }

  // MacBook screen: scale the 1440px-wide desktop layout to the lid
  const macs = document.querySelectorAll(".mac-screen");
  const fitMac = (sc) => { const w = sc.clientWidth; if (w > 0) sc.style.setProperty("--k", (w / 1440).toFixed(5)); };
  if ("ResizeObserver" in window) { const mro = new ResizeObserver((es) => es.forEach((e) => fitMac(e.target))); macs.forEach((sc) => mro.observe(sc)); }
  else { addEventListener("resize", () => macs.forEach(fitMac)); macs.forEach(fitMac); }

  // Tabs
  document.querySelectorAll("[data-tabs]").forEach((root) => {
    const buttons = root.querySelectorAll(".tabs button");
    const panels = root.querySelectorAll(".tab-panel");
    buttons.forEach((b, i) => b.addEventListener("click", () => {
      buttons.forEach((x) => x.classList.toggle("on", x === b));
      panels.forEach((p, j) => p.classList.toggle("on", j === i));
    }));
  });

  // Table of contents highlight
  const tocLinks = [...document.querySelectorAll(".toc a")];
  if (tocLinks.length) {
    const map = new Map(tocLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const tio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          tocLinks.forEach((a) => a.classList.remove("on"));
          const a = map.get(e.target.id);
          a && a.classList.add("on");
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); s && tio.observe(s); });
  }

  // Particle network behind the hero word
  const canvas = document.getElementById("particles");
  if (canvas && !reduce) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr, pts = [];
    const mouse = { x: -9999, y: -9999 };
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(110, (w * h) / 14000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.4, lime: Math.random() < 0.25,
      }));
    };
    resize();
    addEventListener("resize", resize);
    canvas.parentElement.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 140) { p.x += dx / d * 1.2; p.y += dy / d * 1.2; }
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130) {
            ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 130) * 0.18})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = p.lime ? "rgba(255,255,255,.85)" : "rgba(160,165,175,.45)";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  // Hero letters: subtle parallax with the pointer
  const word = document.querySelector(".hero-word");
  if (word && !reduce) {
    const letters = [...word.children];
    document.querySelector(".hero").addEventListener("pointermove", (e) => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      letters.forEach((l, i) => {
        const k = (i - letters.length / 2) / letters.length;
        l.style.translate = `${x * 30 * (1 + k)}px ${y * 22 * (1 - k)}px`;
      });
    });
  }

  const year = document.querySelector("[data-year]");
  year && (year.textContent = new Date().getFullYear());
})();

// Language switcher: close on outside click / Escape
(() => {
  const d = document.querySelector("details.lang");
  if (!d) return;
  document.addEventListener("click", (e) => { if (d.open && !d.contains(e.target)) d.open = false; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") d.open = false; });
})();

// Card page: rotating sphere of service pills
(() => {
  const root = document.querySelector(".sphere");
  if (!root) return;
  const names = root.dataset.items.split("|");
  const n = names.length, golden = Math.PI * (3 - Math.sqrt(5));
  const pts = names.map((name, i) => {
    const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
    const el = document.createElement("span"); el.textContent = name; root.appendChild(el);
    return { el, x: Math.cos(th) * r, y, z: Math.sin(th) * r };
  });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ay = 0, ax = -0.28, vy = 0.0026, target = 0.0026, R = 300, RX = 300, running = false;
  const size = () => { const box = root.parentElement, w = root.clientWidth || box.clientWidth, h = root.clientHeight || box.clientHeight || 600; R = Math.min(h * 0.44, 380); RX = Math.min(w * 0.44, R * 1.45); };
  size(); addEventListener("resize", size);
  if ("ResizeObserver" in window) new ResizeObserver(() => { size(); draw(); }).observe(root);
  root.parentElement.addEventListener("pointermove", (e) => {
    const r = root.getBoundingClientRect();
    target = 0.0026 + ((e.clientX - r.left) / r.width - 0.5) * 0.012;
  });
  root.parentElement.addEventListener("pointerleave", () => { target = 0.0026; });
  const draw = () => {
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    for (const p of pts) {
      const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
      const y2 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;
      const d = (z2 + 1) / 2, s = 0.55 + d * 0.75;
      p.el.style.transform = `translate(-50%,-50%) translate3d(${x1 * RX}px,${y2 * R}px,0) scale(${s})`;
      p.el.style.opacity = (0.18 + d * 0.82).toFixed(3);
      p.el.style.filter = d < 0.45 ? `blur(${((0.45 - d) * 4).toFixed(2)}px)` : "none";
      p.el.style.zIndex = Math.round(d * 100);
    }
  };
  const tick = () => { if (!running) return; vy += (target - vy) * 0.04; ay += vy; draw(); requestAnimationFrame(tick); };
  draw();
  if (reduce) return;
  new IntersectionObserver(([e]) => { const was = running; running = e.isIntersecting; if (running && !was) requestAnimationFrame(tick); }).observe(root);
})();

// TON Connect demo "video": five scenes with chapters, play/pause and autoplay while visible.
(() => {
  const root = document.querySelector("[data-tcv]");
  if (!root) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SCENE = 5200, N = 5;
  const chapters = [...root.querySelectorAll(".tcv-chapters button")];
  const bars = chapters.map((b) => b.querySelector("u"));
  const time = root.querySelector(".tcv-time");
  const playBtn = root.querySelector(".tcv-play");
  let scene = 0, elapsed = 0, last = 0, playing = !reduce, visible = false, raf = 0;

  const fmt = (ms) => { const s = Math.floor(ms / 1000); return `00:${String(s).padStart(2, "0")}`; };
  const paint = () => {
    chapters.forEach((b, i) => {
      b.classList.toggle("on", i === scene);
      b.classList.toggle("done", i < scene);
      bars[i].style.width = i < scene ? "100%" : i === scene ? `${(elapsed / SCENE) * 100}%` : "0%";
    });
    time.textContent = fmt(scene * SCENE + elapsed);
  };
  const go = (i) => {
    scene = (i + N) % N; elapsed = 0;
    root.removeAttribute("data-scene");
    void root.offsetWidth; // restart the scene's CSS animations
    root.dataset.scene = scene;
    paint();
  };
  const tick = (t) => {
    raf = 0;
    if (!playing || !visible) return;
    elapsed += Math.min(100, t - (last || t)); last = t;
    if (elapsed >= SCENE) go(scene + 1); else paint();
    raf = requestAnimationFrame(tick);
  };
  const run = () => { if (playing && visible && !raf) { last = 0; raf = requestAnimationFrame(tick); } };
  const setPlaying = (p) => {
    playing = p;
    root.classList.toggle("paused", !p);
    playBtn.setAttribute("aria-label", p ? "Pause" : "Play");
    run();
  };

  playBtn.addEventListener("click", () => setPlaying(!playing));
  chapters.forEach((b, i) => b.addEventListener("click", () => { go(i); run(); }));
  root.querySelector(".tcv-screen").addEventListener("click", () => setPlaying(!playing));
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; run(); }, { threshold: 0.35 }).observe(root);
  setPlaying(playing);
  go(0);
})();

// Cursor FX v3 (2026-11-26): spotlight that reveals a dot grid around the pointer (dots swell and
// part like under a lens), a soft light that trails the pointer, a ring cursor that inverts what it
// hovers, and a light wave across the grid on click. Desktop only.
(() => {
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduce) return;

  const cv = document.createElement("canvas");
  cv.className = "cfx-canvas";
  cv.setAttribute("aria-hidden", "true");
  const ring = document.createElement("div");
  ring.className = "cfx-ring";
  ring.setAttribute("aria-hidden", "true");
  document.body.append(cv, ring);
  const ctx = cv.getContext("2d");

  const GAP = 24, R = 260;                // grid step and spotlight radius
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize);

  const P = { x: W / 2, y: H / 2, in: false };
  const S = { x: W / 2, y: H / 2, a: 0 };     // smoothed spotlight
  const G = { x: W / 2, y: H / 2 };           // slower glow
  const C = { x: W / 2, y: H / 2, s: 1, ts: 1 }; // ring
  const waves = [];
  let raf = 0, last = 0, hot = false;

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    P.x = e.clientX; P.y = e.clientY;
    if (!P.in) { P.in = true; S.x = G.x = C.x = P.x; S.y = G.y = C.y = P.y; ring.classList.add("on"); }
    const t = e.target.closest && e.target.closest("a, button, [role=button], input, select, textarea, label, summary");
    if (!!t !== hot) { hot = !!t; ring.classList.toggle("hot", hot); }
    C.ts = hot ? 1.9 : 1;
    wake();
  }, { passive: true });
  const leave = () => { P.in = false; ring.classList.remove("on"); wake(); };
  document.documentElement.addEventListener("pointerleave", leave);
  addEventListener("blur", leave);
  addEventListener("scroll", wake, { passive: true });

  addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    waves.push({ x: e.clientX, y: e.clientY, r: 0 });
    C.s *= .7;
    wake();
  }, { passive: true });

  function frame(t) {
    raf = 0;
    const dt = Math.min(3, (t - (last || t)) / 16.67); last = t;
    const ease = (k) => 1 - Math.pow(1 - k, dt);
    S.x += (P.x - S.x) * ease(.22); S.y += (P.y - S.y) * ease(.22);
    G.x += (P.x - G.x) * ease(.06); G.y += (P.y - G.y) * ease(.06);
    C.x += (P.x - C.x) * ease(.28); C.y += (P.y - C.y) * ease(.28);
    C.s += (C.ts - C.s) * ease(.2);
    S.a += ((P.in ? 1 : 0) - S.a) * ease(.08);
    ring.style.transform = `translate3d(${C.x}px,${C.y}px,0) translate(-50%,-50%) scale(${C.s})`;

    ctx.clearRect(0, 0, W, H);

    // soft trailing light
    if (S.a > .01) {
      const g = ctx.createRadialGradient(G.x, G.y, 0, G.x, G.y, 420);
      g.addColorStop(0, `rgba(255,255,255,${.12 * S.a})`);
      g.addColorStop(.45, `rgba(255,255,255,${.04 * S.a})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(G.x - 420, G.y - 420, 840, 840);
    }

    // waves advance
    for (let i = waves.length - 1; i >= 0; i--) {
      waves[i].r += 11 * dt;
      if (waves[i].r > Math.hypot(W, H)) waves.splice(i, 1);
    }

    // dot grid (scrolls with the page)
    const oy = -(scrollY % GAP), ox = (W % GAP) / 2;
    const full = waves.length > 0;
    const x0 = full ? 0 : Math.max(0, Math.floor((S.x - R - ox) / GAP)), x1 = full ? Math.ceil(W / GAP) : Math.ceil((S.x + R - ox) / GAP);
    const y0 = full ? 0 : Math.max(0, Math.floor((S.y - R - oy) / GAP)), y1 = full ? Math.ceil(H / GAP) + 1 : Math.ceil((S.y + R - oy) / GAP);
    ctx.fillStyle = "#fff";
    for (let gy = y0; gy <= y1; gy++) {
      const by = oy + gy * GAP;
      for (let gx = x0; gx <= x1; gx++) {
        const bx = ox + gx * GAP;
        let x = bx, y = by, a = 0, s = 0;
        // spotlight lens
        const dx = bx - S.x, dy = by - S.y, d = Math.hypot(dx, dy);
        if (d < R && S.a > .01) {
          const k = 1 - d / R, k2 = k * k * (3 - 2 * k);
          a += (.12 + k2 * .95) * S.a * Math.min(1, k * 4); s += k2 * 2 * S.a;
          const push = k2 * 12 * S.a / (d + 1);
          x += dx * push; y += dy * push;
        }
        // click waves
        for (const w of waves) {
          const wd = Math.hypot(bx - w.x, by - w.y), band = 1 - Math.abs(wd - w.r) / 60;
          if (band > 0) {
            const fade = Math.max(0, 1 - w.r / 1100), b = band * band * fade;
            a += b; s += b * 2.2;
            const push = b * 6 / (wd + 1);
            x += (bx - w.x) * push; y += (by - w.y) * push;
          }
        }
        if (a < .02) continue;
        ctx.globalAlpha = a > 1 ? 1 : a;
        const r = .8 + s;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // fine crosshair lines through the spotlight, fading out
    if (S.a > .01) {
      const lg = ctx.createRadialGradient(S.x, S.y, 0, S.x, S.y, R * 1.15);
      lg.addColorStop(0, `rgba(255,255,255,${.22 * S.a})`); lg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = lg; ctx.lineWidth = 1;
      ctx.beginPath();
      const gyN = Math.round((S.y - oy) / GAP) * GAP + oy, gxN = Math.round((S.x - ox) / GAP) * GAP + ox;
      ctx.moveTo(S.x - R, gyN + .5); ctx.lineTo(S.x + R, gyN + .5);
      ctx.moveTo(gxN + .5, S.y - R); ctx.lineTo(gxN + .5, S.y + R);
      ctx.stroke();
    }

    const busy = waves.length || Math.abs(P.x - G.x) + Math.abs(P.y - G.y) > .3 || Math.abs(C.ts - C.s) > .01 ||
      Math.abs((P.in ? 1 : 0) - S.a) > .01;
    if (busy) wake();
  }
  function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  document.addEventListener("visibilitychange", () => { last = 0; wake(); });
})();
