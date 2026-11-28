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

// Hero grains (2026-11-28): after the intro, "NEZERIYA" is made of thousands of small shaded grains that are always
// alive (each one floats a little around its place, a slow light wave runs through them). Wherever the cursor
// passes, the grains are blown apart along its path, drift like in space, then slowly snap back into place.
(() => {
  const word = document.querySelector(".hero-word");
  const hero = word && word.closest(".hero");
  if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
  const PAD = 200, STEP = 4, born = performance.now();
  let cv = null, cx = null, grains = [], sprites = [], raf = 0, last = 0, rect = null, dpr = 1, prev = null, seen = true;

  const box = () => { const h = hero.getBoundingClientRect(), r = word.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height, hx: h.left, hy: h.top, sx: r.left, sy: r.top }; };
  const ramp = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  // shaded ball sprites in a few brightness levels
  const makeSprites = () => {
    sprites = []; const S = Math.ceil(8 * dpr);
    for (let i = 0; i < 8; i++) {
      const b = 0.5 + (i / 7) * 0.5, c = document.createElement("canvas"); c.width = c.height = S;
      const g = c.getContext("2d"), gr = g.createRadialGradient(S * 0.36, S * 0.32, S * 0.04, S * 0.5, S * 0.5, S * 0.5);
      const v = (f) => Math.round(255 * b * f);
      gr.addColorStop(0, `rgb(${v(1.05)},${v(1.05)},${Math.min(255, v(1.1))})`); gr.addColorStop(0.45, `rgb(${v(0.82)},${v(0.83)},${v(0.88)})`);
      gr.addColorStop(0.85, `rgb(${v(0.45)},${v(0.46)},${v(0.52)})`); gr.addColorStop(1, `rgba(${v(0.3)},${v(0.3)},${v(0.36)},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
      sprites.push(c);
    }
  };

  // sample the heading (drawn exactly where the DOM letters are) into grains
  const start = () => {
    rect = box(); dpr = Math.min(2, devicePixelRatio || 1); makeSprites();
    const W = rect.w + 2 * PAD, H = rect.h + 2 * PAD;
    const t = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    t.canvas.width = Math.ceil(rect.w); t.canvas.height = Math.ceil(rect.h);
    for (const s of word.children) {
      const r = s.getBoundingClientRect(), cs = getComputedStyle(s);
      t.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; t.textBaseline = "alphabetic";
      const m = t.measureText(s.textContent), asc = m.fontBoundingBoxAscent, des = m.fontBoundingBoxDescent;
      const x = r.left - rect.sx, top = r.top - rect.sy, y = top + (r.height - (asc + des)) / 2 + asc;
      const g = t.createLinearGradient(0, top, 0, top + r.height); g.addColorStop(0.25, "#fff"); g.addColorStop(1, "#9c9c9c");
      t.fillStyle = g; t.fillText(s.textContent, x, y);
    }
    const d = t.getImageData(0, 0, t.canvas.width, t.canvas.height).data, w = t.canvas.width;
    grains = [];
    for (let y = STEP / 2; y < rect.h; y += STEP * 0.87) {
      const off = (Math.round(y / (STEP * 0.87)) % 2) * STEP / 2; // hex packing
      for (let x = STEP / 2 + off; x < rect.w; x += STEP) {
        const jx = x + (Math.random() - 0.5) * 1.6, jy = y + (Math.random() - 0.5) * 1.6;
        const i = (Math.round(jy) * w + Math.round(jx)) * 4;
        if (d[i + 3] < 120) continue;
        const br = d[i] / 255, lv = Math.max(0, Math.min(7, Math.round(((br - 0.55) / 0.45) * 7 + (Math.random() - 0.5) * 2.5)));
        grains.push({ hx: jx, hy: jy, x: jx, y: jy, vx: 0, vy: 0, r: (STEP * 0.62) * (0.8 + Math.random() * 0.45), lv, loose: false, t0: 0, dl: 0,
          p1: Math.random() * 6.28, p2: Math.random() * 6.28, w1: 0.6 + Math.random() * 0.9, w2: 0.5 + Math.random() * 0.9 });
      }
    }
    cv = document.createElement("canvas"); cv.className = "hero-grains"; cv.setAttribute("aria-hidden", "true");
    cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr);
    Object.assign(cv.style, { left: rect.x - PAD + "px", top: rect.y - PAD + "px", width: W + "px", height: H + "px" });
    cx = cv.getContext("2d"); hero.appendChild(cv);
    requestAnimationFrame(() => cv && cv.classList.add("on"));
    setTimeout(() => cv && word.classList.add("is-sliced"), 360); // grains fade in over the crisp name, then it hides
  };
  const stop = () => { cv && cv.remove(); cv = cx = null; grains = []; word.classList.remove("is-sliced"); };
  const run = () => { if (!raf && cv) { last = performance.now(); raf = requestAnimationFrame(tick); } };

  // blow grains apart along the cursor segment a→b (word-local), speed in px/ms
  const blow = (a, b, speed) => {
    const now = performance.now(), k = Math.min(1, Math.max(0, (speed - 0.2) / 2.2)), R = 16 + 22 * k;
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, l = Math.sqrt(l2) || 1, tx = dx / l, ty = dy / l;
    const x0 = Math.min(a[0], b[0]) - R, x1 = Math.max(a[0], b[0]) + R, y0 = Math.min(a[1], b[1]) - R, y1 = Math.max(a[1], b[1]) + R;
    for (const g of grains) {
      if (g.x < x0 || g.x > x1 || g.y < y0 || g.y > y1) continue;
      const t = l2 ? Math.max(0, Math.min(1, ((g.x - a[0]) * dx + (g.y - a[1]) * dy) / l2)) : 0;
      const px = g.x - a[0] - dx * t, py = g.y - a[1] - dy * t, dist = Math.hypot(px, py);
      if (dist > R) continue;
      const f = 1 - dist / R, side = Math.sign(px * -ty + py * tx) || (Math.random() < 0.5 ? 1 : -1);
      const sp = (22 + 80 * k) * (0.4 + f) * (0.6 + Math.random() * 0.8);
      const nx = dist > 0.01 ? px / dist : -ty * side, ny = dist > 0.01 ? py / dist : tx * side;
      g.vx += nx * sp + tx * sp * 0.6 * Math.random() + (Math.random() - 0.5) * 20;
      g.vy += ny * sp + ty * sp * 0.6 * Math.random() + (Math.random() - 0.5) * 20;
      g.loose = true; g.t0 = now; g.dl = 0.2 + Math.random() * 0.5; // each grain starts heading home at its own moment
    }
  };

  const tick = (now) => {
    const DT = Math.min(0.1, (now - last) / 1000); last = now;
    const ns = Math.max(1, Math.ceil(DT / 0.012)), dt = DT / ns;
    let loose = 0;
    for (const g of grains) {
      if (!g.loose) continue;
      for (let s = 0; s < ns; s++) {
        const age = (now - g.t0) / 1000 - (ns - 1 - s) * dt, pull = ramp((age - g.dl) / 1.1);
        const dx = g.hx - g.x, dy = g.hy - g.y, dist = Math.hypot(dx, dy);
        let k = 6.5 * pull, c = 0.45 + 2 * Math.sqrt(k) * 0.95;
        if (pull > 0.6 && dist < 8) { k += 50 * (1 - dist / 8); c = 2 * Math.sqrt(k) * 0.9; } // magnetic snap
        g.vx += (k * dx - c * g.vx) * dt; g.vy += (k * dy - c * g.vy) * dt;
        g.x += g.vx * dt; g.y += g.vy * dt;
        if (pull > 0.9 && dist < 0.5 && Math.hypot(g.vx, g.vy) < 6) { g.loose = false; g.x = g.hx; g.y = g.hy; g.vx = g.vy = 0; break; }
      }
      if (g.loose) loose++;
    }
    if (!seen && !loose) { raf = 0; return; } // hero scrolled away: rest
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    cx.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);
    const T = now / 1000, A = 1.1;
    for (const g of grains) {
      // alive at rest: a small float around home + a slow diagonal light wave across the word
      const fx = Math.sin(T * g.w1 + g.p1) * A, fy = Math.cos(T * g.w2 + g.p2) * A;
      const wave = Math.sin((g.hx + g.hy * 0.6) * 0.012 - T * 1.6);
      const x = g.loose ? g.x + fx * 0.5 : g.hx + fx, y = g.loose ? g.y + fy * 0.5 : g.hy + fy;
      const lv = Math.max(0, Math.min(7, g.lv + Math.round(wave * 1.6 + 0.3))), r = g.r * (1 + wave * 0.07);
      cx.drawImage(sprites[lv], x - r, y - r, r * 2, r * 2);
    }
    raf = requestAnimationFrame(tick);
  };

  const near = (p, r, m) => p[0] >= r.x - m && p[0] <= r.x + r.w + m && p[1] >= r.y - m && p[1] <= r.y + r.h + m;
  hero.addEventListener("pointermove", (e) => {
    if (e.timeStamp - born < 2200) return; // let the intro animation finish
    const r0 = box(), r = cv ? rect : r0;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of evs.length ? evs : [e]) {
      const p = [ev.clientX - r0.hx, ev.clientY - r0.hy], t = ev.timeStamp;
      if (cv && near(p, r, 40)) {
        run();
        if (prev) {
          const ms = Math.max(4, t - prev.t), len = Math.hypot(p[0] - prev.p[0], p[1] - prev.p[1]);
          if (len > 0.5) blow([prev.p[0] - rect.x, prev.p[1] - rect.y], [p[0] - rect.x, p[1] - rect.y], len / ms);
        }
      }
      prev = { p, t };
    }
  });
  hero.addEventListener("pointerleave", () => { prev = null; });
  let rz = 0;
  addEventListener("resize", () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } stop(); clearTimeout(rz); rz = setTimeout(() => { start(); run(); }, 250); });
  new IntersectionObserver((es) => { seen = es[0].isIntersecting; if (seen) run(); }).observe(hero);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) run(); });
  // hand the heading over to the grains once the letters have flown in
  const go = () => { start(); run(); };
  document.fonts && document.fonts.ready ? document.fonts.ready.then(() => setTimeout(go, Math.max(0, 2300 - (performance.now() - born)))) : setTimeout(go, 2300);
})();
