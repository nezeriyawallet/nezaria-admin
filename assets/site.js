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
      if (word.classList.contains("is-sliced")) return;
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

// Cursor FX (2026-11-26): floating particles light up around the cursor and get blown away and swirled by
// it, plus a short silver tail with sparks when the mouse moves. No ring. Desktop only.
(() => {
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduce) return;

  const cv = document.createElement("canvas");
  cv.className = "cfx-canvas";
  cv.setAttribute("aria-hidden", "true");
  document.body.append(cv);
  const ctx = cv.getContext("2d");

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize);

  const TAIL = 140;                      // ms of movement kept in the tail
  const P = { x: -99, y: -99, in: false };
  const S = { x: -99, y: -99, a: 0 };          // smoothed lens position and visibility
  const R = 170;
  const motes = [], field = { w: 0, h: 0, sy: scrollY, lx: -99, ly: -99 };
  const seed = () => {
    field.w = W; field.h = H; motes.length = 0;
    const n = Math.min(1400, Math.round(W * H / 620));
    for (let i = 0; i < n; i++) {
      const hx = Math.random() * W, hy = Math.random() * H;
      motes.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, ph: Math.random() * 6.28, sp: .01 + Math.random() * .025,
        am: 4 + Math.random() * 10, r: .7 + Math.random() * 1.5, b: Math.random() });
    }
  };
  const pts = [], sparks = [];
  let raf = 0, last = 0, px = 0, py = 0;
  const rand = (a, b) => a + Math.random() * (b - a);

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const now = performance.now();
    if (!P.in) { P.in = true; px = S.x = field.lx = e.clientX; py = S.y = field.ly = e.clientY; }
    P.x = e.clientX; P.y = e.clientY;
    pts.push({ x: P.x, y: P.y, t: now });
    const sp = Math.hypot(P.x - px, P.y - py);
    if (sp > 14 && sparks.length < 30 && Math.random() < Math.min(.7, sp / 60)) {
      sparks.push({ x: P.x, y: P.y, vx: (px - P.x) * .05 + rand(-.6, .6), vy: (py - P.y) * .05 + rand(-.6, .6), life: 1, r: rand(.6, 1.4) });
    }
    px = P.x; py = P.y;
    wake();
  }, { passive: true });
  const leave = () => { P.in = false; };
  document.documentElement.addEventListener("pointerleave", leave);
  addEventListener("blur", leave);
  addEventListener("scroll", () => wake(), { passive: true });


  function frame(t) {
    raf = 0;
    const dt = Math.min(3, (t - (last || t)) / 16.67); last = t;
    const ease = (k) => 1 - Math.pow(1 - k, dt);

    ctx.clearRect(0, 0, W, H);
    const now = performance.now();

    // particles: a loose field of motes that drift on their own, light up near the cursor,
    // get blown away from it and swirled along its motion, then float back
    S.x += (P.x - S.x) * ease(.25); S.y += (P.y - S.y) * ease(.25);
    S.a += ((P.in ? 1 : 0) - S.a) * ease(.1);
    if (field.w !== W || field.h !== H) seed();
    const sx = scrollY - field.sy; field.sy = scrollY;
    const mvx = (S.x - field.lx) / dt, mvy = (S.y - field.ly) / dt; field.lx = S.x; field.ly = S.y;
    ctx.fillStyle = "#fff";
    for (const q of motes) {
      q.hy -= sx; if (q.hy < -30) q.hy += H + 60; else if (q.hy > H + 30) q.hy -= H + 60;
      q.ph += q.sp * dt;
      const tx = q.hx + Math.cos(q.ph) * q.am, ty = q.hy + Math.sin(q.ph * 1.3) * q.am;
      const dx = q.x - S.x, dy = q.y - S.y, d2 = dx * dx + dy * dy;
      if (d2 < R * R && S.a > .01) {
        const d = Math.sqrt(d2) + 1, k = 1 - d / R;
        const f = k * k * 2.2 * S.a;
        q.vx += (dx / d * f + mvx * k * .05 + -dy / d * k * .35) * dt;   // push out + drag along + slight swirl
        q.vy += (dy / d * f + mvy * k * .05 + dx / d * k * .35) * dt;
      }
      q.vx = (q.vx + (tx - q.x) * .012 * dt) * Math.pow(.9, dt);
      q.vy = (q.vy + (ty - q.y) * .012 * dt) * Math.pow(.9, dt);
      q.x += q.vx * dt; q.y += q.vy * dt;
      const ex = q.x - S.x, ey = q.y - S.y, e = Math.sqrt(ex * ex + ey * ey);
      if (e > R * 1.1) continue;
      const k = Math.max(0, 1 - e / (R * 1.1)), kk = k * k * (3 - 2 * k);
      const spd = Math.min(1, Math.hypot(q.vx, q.vy) / 4);
      ctx.globalAlpha = Math.min(1, kk * (.55 + q.b * .45) + spd * .4 * kk) * S.a;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (.6 + kk * .9), 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;

    while (pts.length && now - pts[0].t > TAIL) pts.shift();

    // tail: tapered silver ribbon, thin at the end, ~5px at the cursor
    if (pts.length > 1) {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const k = 1 - (now - b.t) / TAIL;            // 1 = newest
        if (k <= 0) continue;
        ctx.strokeStyle = `rgba(255,255,255,${.08 * k})`; ctx.lineWidth = 9 * k;   // soft glow
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = `rgba(240,242,248,${.85 * k})`; ctx.lineWidth = .5 + 3.5 * k;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    // sparks: tiny glints that fall off the tail
    ctx.fillStyle = "#fff";
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .94; s.vy *= .94;
      s.life -= .035 * dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = s.life;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (P.in || pts.length > 1 || sparks.length || S.a > .01) wake();   // motes keep drifting while the pointer is on the page
  }
  function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  document.addEventListener("visibilitychange", () => { last = 0; wake(); });
})();

// Hero slice (2026-11-28): swipe the cursor through "NEZERIYA" and the name is cut along the swipe; the pieces
// slide apart along the cut and then snap back together magnetically, so the name always stays readable.
// Each piece is an exact clone of the heading clipped to a convex polygon, so it renders pixel-identical.
(() => {
  const word = document.querySelector(".hero-word");
  const hero = word && word.closest(".hero");
  if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
  const PAD = 240, MAXP = 28, born = performance.now();
  let layer = null, cv = null, cx = null, motes = [], pieces = [], seams = [], raf = 0, last = 0, rect = null, prev = null, stroke = null;

  const box = () => { const h = hero.getBoundingClientRect(), r = word.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height, hx: h.left, hy: h.top }; };
  const poly = (pts) => "polygon(" + pts.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(",") + ")";
  const centroid = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
  // keep the part of a convex polygon where (p - a)·n >= 0
  const clip = (pts, a, n, sgn) => {
    const out = [], f = (p) => sgn * ((p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1]);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], fp = f(p), fq = f(q);
      if (fp >= 0) out.push(p);
      if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  };
  const area = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; } return Math.abs(s / 2); };

  const makeEl = () => {
    const el = word.cloneNode(true);
    el.removeAttribute("aria-label"); el.setAttribute("aria-hidden", "true"); el.className = "hero-word hero-slice-piece";
    layer.appendChild(el); return el;
  };
  const start = () => {
    rect = box();
    layer = document.createElement("div"); layer.className = "hero-slice"; layer.setAttribute("aria-hidden", "true");
    Object.assign(layer.style, { left: rect.x + "px", top: rect.y + "px", width: rect.w + "px", height: rect.h + "px" });
    hero.appendChild(layer);
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv = document.createElement("canvas"); cv.className = "hero-slice-motes";
    cv.width = (rect.w + 2 * PAD) * dpr; cv.height = (rect.h + 2 * PAD) * dpr;
    Object.assign(cv.style, { left: -PAD + "px", top: -PAD + "px", width: rect.w + 2 * PAD + "px", height: rect.h + 2 * PAD + "px" });
    cx = cv.getContext("2d"); cx.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);
    layer.appendChild(cv); motes = [];
    const pts = [[-PAD, -PAD], [rect.w + PAD, -PAD], [rect.w + PAD, rect.h + PAD], [-PAD, rect.h + PAD]];
    pieces = [{ el: makeEl(), pts, c: centroid(pts), ox: 0, oy: 0, vx: 0, vy: 0, r: 0, vr: 0, t0: 0 }];
    word.classList.add("is-sliced");
  };
  const stop = () => { layer && layer.remove(); layer = null; pieces = []; seams = []; motes = []; word.classList.remove("is-sliced"); };
  const draw = (p) => {
    p.el.style.clipPath = poly(p.pts);
    p.el.style.transformOrigin = `${p.c[0].toFixed(1)}px ${p.c[1].toFixed(1)}px`;
    p.el.style.transform = `translate(${p.ox.toFixed(2)}px,${p.oy.toFixed(2)}px) rotate(${p.r.toFixed(4)}rad)`;
  };

  // cut along the line through a and b (word-local, screen space), speed in px/ms
  const cut = (a, b, speed) => {
    if (!layer) start();
    if (pieces.length >= MAXP) return;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1) return;
    const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-d[1], d[0]];
    const k = Math.min(1, Math.max(0, (speed - 0.35) / 2.4));
    const N = 34 + 46 * k, T = 14 + 30 * k, Rv = 0.03 + 0.08 * k, now = performance.now();
    const next = [];
    for (const p of pieces) {
      // line into the piece's local (unmoved) frame
      const cs = Math.cos(-p.r), sn = Math.sin(-p.r);
      const loc = (q) => { const x = q[0] - p.c[0] - p.ox, y = q[1] - p.c[1] - p.oy; return [x * cs - y * sn + p.c[0], x * sn + y * cs + p.c[1]]; };
      const la = loc(a), lb = loc(b), lL = Math.hypot(lb[0] - la[0], lb[1] - la[1]);
      const ln = [-(lb[1] - la[1]) / lL, (lb[0] - la[0]) / lL];
      const A = clip(p.pts, la, ln, 1), B = clip(p.pts, la, ln, -1);
      if (A.length < 3 || B.length < 3 || area(A) < 600 || area(B) < 600) { next.push(p); continue; }
      p.el.remove();
      for (const [pts, s] of [[A, 1], [B, -1]]) {
        const q = { el: makeEl(), pts, c: centroid(pts), ox: p.ox, oy: p.oy, vx: p.vx, vy: p.vy, r: p.r, vr: p.vr, t0: now };
        // keep the visual position: the pivot moved from p.c to q.c, compensate the rotation offset
        const dx = q.c[0] - p.c[0], dy = q.c[1] - p.c[1], c0 = Math.cos(p.r), s0 = Math.sin(p.r);
        q.ox += dx * c0 - dy * s0 - dx; q.oy += dx * s0 + dy * c0 - dy;
        q.vx += s * (n[0] * N + d[0] * T); q.vy += s * (n[1] * N + d[1] * T); const xs = pts.map((v) => v[0]), wid = Math.max(60, Math.min(rect.w, Math.max(...xs)) - Math.max(0, Math.min(...xs)));
        q.vr += s * Rv * (Math.random() * 0.6 + 0.7) * Math.min(1, 260 / wid); // long pieces turn less, so their ends don't swing far
        draw(q); next.push(q);
      }
    }
    pieces = next;
    // debris: small silver shards burst out of the cut and drift in space before they are pulled home
    const span = [], steps = 90;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = a[0] + (b[0] - a[0]) * (t * 3 - 1), y = a[1] + (b[1] - a[1]) * (t * 3 - 1);
      if (x > rect.w * 0.01 && x < rect.w * 0.99 && y > rect.h * 0.12 && y < rect.h * 0.9) span.push([x, y]);
    }
    const cnt = Math.min(90, Math.round(span.length * (0.9 + k)));
    for (let i = 0; i < cnt && span.length && motes.length < 360; i++) {
      const h = span[(Math.random() * span.length) | 0], s = Math.random() < 0.5 ? 1 : -1;
      const sp = (25 + Math.random() * 110) * (0.6 + 0.6 * k), sp2 = (Math.random() - 0.5) * 2;
      motes.push({ hx: h[0], hy: h[1], x: h[0], y: h[1], vx: s * n[0] * sp + d[0] * sp2 * sp * 0.8, vy: s * n[1] * sp + d[1] * sp2 * sp * 0.8,
        a: Math.random() * 6.28, va: (Math.random() - 0.5) * 9, z: 1 + Math.random() * 2.6, t0: now + Math.random() * 250, life: 1 });
    }
    // the blade: a bright streak along the cut
    const sx = rect.w * 1.15 + PAD, mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const bl = document.createElement("i"); bl.className = "hero-slice-blade";
    Object.assign(bl.style, { left: mid[0] + "px", top: mid[1] + "px", width: sx + "px", rotate: Math.atan2(d[1], d[0]) + "rad" });
    layer.appendChild(bl);
    bl.animate([{ opacity: 0, scale: "0.2 1" }, { opacity: 1, scale: "1 1", offset: 0.25 }, { opacity: 0, scale: "1.05 0.4" }],
      { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => bl.remove();
    seams.push({ mid, ang: Math.atan2(d[1], d[0]) });
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  };

  // space physics: after the hit things drift with almost no drag, then a magnetic pull slowly fades in
  const ramp = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const tick = (now) => {
    const DT = Math.min(0.1, (now - last) / 1000); last = now;
    let busy = false;
    const n = Math.max(1, Math.ceil(DT / 0.008)), dt = DT / n; // fixed small steps so slow frames don't slow time
    for (let st = 0; st < n; st++) {
      const tn = now - (n - 1 - st) * dt * 1000;
      for (const p of pieces) {
        const dist = Math.hypot(p.ox, p.oy), pull = ramp(((tn - p.t0) / 1000 - 0.25) / 1.2);
        let k = 6 * pull, c = 0.6 + 2 * Math.sqrt(k) * 1.0;
        if (pull > 0.5 && dist < 12) { k += 140 * (1 - dist / 12); c = 2 * Math.sqrt(k) * 0.8; } // final magnetic click
        p.vx += (-k * p.ox - c * p.vx) * dt; p.vy += (-k * p.oy - c * p.vy) * dt;
        p.vr += (-k * 1.3 * p.r - c * p.vr) * dt;
        p.ox += p.vx * dt; p.oy += p.vy * dt; p.r += p.vr * dt;
      }
      for (const m of motes) {
        const age = (tn - m.t0) / 1000;
        if (age <= 0 || m.life <= 0) continue;
        const pull = ramp((age - 0.35) / 1.6), dx = m.hx - m.x, dy = m.hy - m.y, dist = Math.hypot(dx, dy);
        const k = 5 * pull + (pull > 0.6 && dist < 30 ? 40 : 0), c = 0.5 + 2 * Math.sqrt(k) * 0.9;
        m.vx += (k * dx - c * m.vx) * dt; m.vy += (k * dy - c * m.vy) * dt;
        m.x += m.vx * dt; m.y += m.vy * dt; m.a += m.va * dt;
        if ((pull > 0.6 && dist < 2.5) || age > 6) m.life -= dt * 5; // absorbed back into the letters
      }
    }
    for (const p of pieces) {
      if (Math.hypot(p.ox, p.oy) > 0.35 || Math.abs(p.r) > 0.0015 || Math.hypot(p.vx, p.vy) > 6) busy = true;
      draw(p);
    }
    if (cx) {
      cx.clearRect(-PAD, -PAD, rect.w + 2 * PAD, rect.h + 2 * PAD);
      cx.globalCompositeOperation = "lighter";
      for (const m of motes) {
        if (m.life <= 0 || now < m.t0) { if (m.life > 0) busy = true; continue; }
        busy = true;
        const al = Math.max(0, Math.min(1, m.life)), z = m.z;
        cx.save(); cx.translate(m.x, m.y); cx.rotate(m.a);
        cx.fillStyle = `rgba(235,238,245,${0.9 * al})`; cx.shadowColor = "rgba(255,255,255,.8)"; cx.shadowBlur = 6;
        cx.beginPath(); cx.moveTo(-z, -z * 0.6); cx.lineTo(z * 1.3, 0); cx.lineTo(-z * 0.4, z); cx.closePath(); cx.fill();
        cx.restore();
      }
      motes = motes.filter((m) => m.life > 0);
    }
    if (busy) { raf = requestAnimationFrame(tick); return; }
    raf = 0;
    // snapped together: a soft click-glint along each seam, then hand back to the real heading
    const L = layer;
    for (const s of seams) {
      const g = document.createElement("i"); g.className = "hero-slice-blade is-weld";
      Object.assign(g.style, { left: s.mid[0] + "px", top: s.mid[1] + "px", width: rect.w * 1.2 + "px", rotate: s.ang + "rad" });
      L.appendChild(g); g.animate([{ opacity: 0.7 }, { opacity: 0 }], { duration: 380, easing: "ease-out" });
    }
    for (const p of pieces) p.el.remove();
    cv && cv.remove(); cv = cx = null; motes = [];
    word.classList.remove("is-sliced"); pieces = []; seams = [];
    setTimeout(() => L.remove(), 400);
    layer = null;
  };

  const inside = (p, r) => p[0] >= r.x - 6 && p[0] <= r.x + r.w + 6 && p[1] >= r.y - 6 && p[1] <= r.y + r.h + 6;
  // does segment p→q cross rectangle r (Liang–Barsky)
  const hits = (p, q, r) => {
    let t0 = 0, t1 = 1; const dx = q[0] - p[0], dy = q[1] - p[1];
    for (const [pp, qq] of [[-dx, p[0] - r.x], [dx, r.x + r.w - p[0]], [-dy, p[1] - r.y], [dy, r.y + r.h - p[1]]]) {
      if (pp === 0) { if (qq < 0) return false; continue; }
      const t = qq / pp; if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  };
  const finish = (end, t) => {
    if (!stroke) return;
    const s = stroke; stroke = null;
    const L = Math.hypot(end[0] - s.p[0], end[1] - s.p[1]), ms = Math.max(8, t - s.t);
    if (L > rect.h * 0.55 && ms < 700) cut([s.p[0] - rect.x, s.p[1] - rect.y], [end[0] - rect.x, end[1] - rect.y], L / ms);
  };
  hero.addEventListener("pointermove", (e) => {
    const t = e.timeStamp, q = [e.clientX, e.clientY];
    if (t - born < 2200) return; // let the intro animation finish
    const r0 = box(), r = rect && layer ? rect : r0; rect = r;
    const p = [q[0] - r0.hx, q[1] - r0.hy];
    if (prev) {
      const pv = prev.p, isIn = inside(p, r);
      if (!stroke && (isIn || hits(pv, p, r))) stroke = { p: pv, t: prev.t };
      if (stroke) {
        if (!isIn) finish(p, t);
        else if (t - stroke.t > 700) stroke = { p: pv, t: prev.t };
        else if (Math.hypot(p[0] - stroke.p[0], p[1] - stroke.p[1]) > r.h * 1.6) { finish(p, t); stroke = { p, t }; }
      }
    }
    prev = { p, t };
  });
  hero.addEventListener("pointerleave", () => { prev = null; stroke = null; });
  addEventListener("resize", () => { if (!raf) stop(); });
})();
