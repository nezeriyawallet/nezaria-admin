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

// Hero slice (2026-11-28): the cursor cuts "NEZERIYA" exactly along the path the user draws through it (curves,
// zigzags). The pieces drift apart a little, silver shards float out of the cut, then everything is slowly pulled
// back together magnetically, so the name always stays readable. A piece is a clone of the heading inside a chain
// of nested clip-path polygons (one per cut it went through), so it renders pixel-identical to the real heading.
(() => {
  const word = document.querySelector(".hero-word");
  const hero = word && word.closest(".hero");
  if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
  const PAD = 240, MAXP = 24, born = performance.now();
  let layer = null, cv = null, cx = null, motes = [], trails = [], pieces = [], grid = [], raf = 0, last = 0, rect = null, prev = null, stroke = null;

  const box = () => { const h = hero.getBoundingClientRect(), r = word.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height, hx: h.left, hy: h.top }; };
  const poly = (pts) => "polygon(" + pts.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(",") + ")";
  const inPoly = (x, y, P) => { let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[i], b = P[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c; };
  const ramp = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

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
    layer.appendChild(cv); motes = []; trails = [];
    // sample points over the word: a piece "owns" the points inside its clip chain (to skip empty pieces, find pivots)
    grid = []; const st = Math.max(8, rect.h / 11);
    for (let y = st / 2; y < rect.h; y += st) for (let x = st / 2; x < rect.w; x += st) grid.push([x, y]);
    pieces = [mk([], grid.map((_, i) => i), null)];
    word.classList.add("is-sliced");
  };
  // piece = outer (moves) > clip > clip > ... > heading clone
  function mk(clips, idx, from) {
    const outer = document.createElement("div"); outer.className = "hero-slice-piece";
    let host = outer;
    for (const c of clips) { const d = document.createElement("div"); d.className = "hero-slice-clip"; d.style.clipPath = poly(c); host.appendChild(d); host = d; }
    const el = word.cloneNode(true);
    el.removeAttribute("aria-label"); el.setAttribute("aria-hidden", "true"); el.className = "hero-word hero-slice-word";
    host.appendChild(el); layer.insertBefore(outer, cv);
    let sx = 0, sy = 0; for (const i of idx) { sx += grid[i][0]; sy += grid[i][1]; }
    const p = { outer, clips, idx, c: [sx / idx.length, sy / idx.length], ox: 0, oy: 0, vx: 0, vy: 0, r: 0, vr: 0, t0: 0 };
    if (from) {
      Object.assign(p, { ox: from.ox, oy: from.oy, vx: from.vx, vy: from.vy, r: from.r, vr: from.vr });
      // keep the visual position when the pivot moves from from.c to p.c
      const dx = p.c[0] - from.c[0], dy = p.c[1] - from.c[1], c0 = Math.cos(from.r), s0 = Math.sin(from.r);
      p.ox += dx * c0 - dy * s0 - dx; p.oy += dx * s0 + dy * c0 - dy;
    }
    return p;
  }
  const draw = (p) => {
    p.outer.style.transformOrigin = `${p.c[0].toFixed(1)}px ${p.c[1].toFixed(1)}px`;
    p.outer.style.transform = `translate(${p.ox.toFixed(2)}px,${p.oy.toFixed(2)}px) rotate(${p.r.toFixed(4)}rad)`;
  };

  // cut along the drawn path (word-local points, from outside the word to outside the word); speed in px/ms
  const cut = (path, speed) => {
    if (!layer) start();
    const a = path[0], b = path[path.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1) return;
    const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-d[1], d[0]];
    const k = Math.min(1, Math.max(0, (speed - 0.35) / 2.4));
    const N = 34 + 46 * k, T = 14 + 30 * k, Rv = 0.03 + 0.08 * k, now = performance.now();
    const C = [rect.w / 2, rect.h / 2], R = Math.hypot(rect.w, rect.h) / 2 + PAD + 60;
    const next = [];
    for (const p of pieces) {
      if (next.length >= MAXP) { next.push(p); continue; }
      // path into the piece's local (unmoved) frame
      const cs = Math.cos(-p.r), sn = Math.sin(-p.r);
      const loc = (q) => { const x = q[0] - p.c[0] - p.ox, y = q[1] - p.c[1] - p.oy; return [x * cs - y * sn + p.c[0], x * sn + y * cs + p.c[1]]; };
      const lp = path.map(loc);
      // push both ends out to the big circle, then close each side with an arc of that circle
      const ext = (q, dir) => { const ang = Math.atan2(q[1] - C[1], q[0] - C[0]); return [C[0] + Math.cos(ang) * R, C[1] + Math.sin(ang) * R, ang]; };
      const e0 = ext(lp[0]), e1 = ext(lp[lp.length - 1]);
      const side = (sgn) => {
        const pts = [[e0[0], e0[1]], ...lp, [e1[0], e1[1]]];
        let span = e0[2] - e1[2]; // go from end angle back to start angle
        if (sgn > 0) { while (span <= 0) span += Math.PI * 2; } else { while (span >= 0) span -= Math.PI * 2; }
        const steps = 24;
        for (let i = 1; i < steps; i++) { const t = e1[2] + (span * i) / steps; pts.push([C[0] + Math.cos(t) * R, C[1] + Math.sin(t) * R]); }
        return pts;
      };
      const A = side(1), B = side(-1);
      const ia = [], ib = [];
      for (const i of p.idx) (inPoly(grid[i][0], grid[i][1], A) ? ia : ib).push(i);
      if (ia.length < 2 || ib.length < 2 || next.length + 2 > MAXP + 1) { next.push(p); continue; }
      p.outer.remove();
      for (const [P, idx] of [[A, ia], [B, ib]]) {
        const q = mk([...p.clips, P], idx, p); q.t0 = now;
        // which side of the chord is this piece on (in screen space)
        const s = Math.sign((q.c[0] + q.ox - a[0]) * n[0] + (q.c[1] + q.oy - a[1]) * n[1]) || 1;
        let x0 = Infinity, x1 = -Infinity; for (const i of idx) { x0 = Math.min(x0, grid[i][0]); x1 = Math.max(x1, grid[i][0]); }
        q.vx += s * (n[0] * N + d[0] * T); q.vy += s * (n[1] * N + d[1] * T);
        q.vr += s * Rv * (Math.random() * 0.6 + 0.7) * Math.min(1, 260 / Math.max(60, x1 - x0));
        draw(q); next.push(q);
      }
    }
    pieces = next;
    // the blade glints along the exact path; shards burst out of it
    trails.push({ path, t0: now });
    const inside = path.filter((q) => q[0] > 0 && q[0] < rect.w && q[1] > rect.h * 0.1 && q[1] < rect.h * 0.92);
    let len = 0; for (let i = 1; i < inside.length; i++) len += Math.hypot(inside[i][0] - inside[i - 1][0], inside[i][1] - inside[i - 1][1]);
    const cnt = Math.min(90, Math.round(len / 9 * (0.8 + k)));
    for (let i = 0; i < cnt && inside.length > 1 && motes.length < 360; i++) {
      const j = (Math.random() * (inside.length - 1)) | 0, t = Math.random(), u = inside[j], v = inside[j + 1];
      const h = [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
      const tl = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1, tn = [-(v[1] - u[1]) / tl, (v[0] - u[0]) / tl];
      const s = Math.random() < 0.5 ? 1 : -1, sp = (25 + Math.random() * 110) * (0.6 + 0.6 * k), sp2 = (Math.random() - 0.5) * 1.6;
      motes.push({ hx: h[0], hy: h[1], x: h[0], y: h[1], vx: s * tn[0] * sp - tn[1] * sp2 * sp * 0.6, vy: s * tn[1] * sp + tn[0] * sp2 * sp * 0.6,
        a: Math.random() * 6.28, va: (Math.random() - 0.5) * 9, z: 1 + Math.random() * 2.6, t0: now + Math.random() * 200, life: 1 });
    }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  };

  // space physics: the hit makes things drift with little drag, then a magnetic pull slowly fades in and snaps them home
  const tick = (now) => {
    const DT = Math.min(0.1, (now - last) / 1000); last = now;
    let busy = false;
    const ns = Math.max(1, Math.ceil(DT / 0.008)), dt = DT / ns; // fixed small steps so slow frames don't slow time
    for (let st = 0; st < ns; st++) {
      const tn = now - (ns - 1 - st) * dt * 1000;
      for (const p of pieces) {
        const dist = Math.hypot(p.ox, p.oy), pull = ramp(((tn - p.t0) / 1000 - 0.25) / 1.2);
        let k = 6 * pull, c = 0.6 + 2 * Math.sqrt(k);
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
    cx.clearRect(-PAD, -PAD, rect.w + 2 * PAD, rect.h + 2 * PAD);
    cx.globalCompositeOperation = "lighter";
    trails = trails.filter((t) => now - t.t0 < 520);
    for (const t of trails) {
      const f = (now - t.t0) / 520, al = f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85;
      cx.save(); cx.lineJoin = cx.lineCap = "round";
      cx.beginPath(); t.path.forEach((q, i) => (i ? cx.lineTo(q[0], q[1]) : cx.moveTo(q[0], q[1])));
      cx.strokeStyle = `rgba(210,215,225,${0.35 * al})`; cx.lineWidth = 7; cx.shadowColor = "rgba(255,255,255,.7)"; cx.shadowBlur = 18; cx.stroke();
      cx.strokeStyle = `rgba(255,255,255,${0.95 * al})`; cx.lineWidth = 1.6; cx.shadowBlur = 6; cx.stroke();
      cx.restore(); busy = true;
    }
    for (const m of motes) {
      if (m.life <= 0) continue;
      busy = true;
      if (now < m.t0) continue;
      const al = Math.max(0, Math.min(1, m.life)), z = m.z;
      cx.save(); cx.translate(m.x, m.y); cx.rotate(m.a);
      cx.fillStyle = `rgba(235,238,245,${0.9 * al})`; cx.shadowColor = "rgba(255,255,255,.8)"; cx.shadowBlur = 6;
      cx.beginPath(); cx.moveTo(-z, -z * 0.6); cx.lineTo(z * 1.3, 0); cx.lineTo(-z * 0.4, z); cx.closePath(); cx.fill();
      cx.restore();
    }
    motes = motes.filter((m) => m.life > 0);
    if (busy) { raf = requestAnimationFrame(tick); return; }
    raf = 0; stop();
  };
  const stop = () => { layer && layer.remove(); layer = cv = cx = null; pieces = []; motes = []; trails = []; word.classList.remove("is-sliced"); };

  const inside = (p, r) => p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h;
  const hits = (p, q, r) => { // does segment p→q cross rectangle r (Liang–Barsky)
    let t0 = 0, t1 = 1; const dx = q[0] - p[0], dy = q[1] - p[1];
    for (const [pp, qq] of [[-dx, p[0] - r.x], [dx, r.x + r.w - p[0]], [-dy, p[1] - r.y], [dy, r.y + r.h - p[1]]]) {
      if (pp === 0) { if (qq < 0) return false; continue; }
      const t = qq / pp; if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  };
  // the stroke records every pointer position from just before it enters the word until it leaves it
  const add = (q) => { const l = stroke.pts[stroke.pts.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) >= 3 && stroke.pts.length < 400) stroke.pts.push(q); };
  const finish = (r, t) => {
    const s = stroke; stroke = null;
    const P = s.pts, ms = Math.max(8, t - s.t);
    let len = 0; for (let i = 1; i < P.length; i++) len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    if (P.length < 2 || len < r.h * 0.5 || ms > 2500) return;
    cut(P.map((q) => [q[0] - r.x, q[1] - r.y]), len / ms);
  };
  hero.addEventListener("pointermove", (e) => {
    if (e.timeStamp - born < 2200) return; // let the intro animation finish
    const r0 = box(), r = layer ? rect : r0; if (!layer) rect = r0;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of evs.length ? evs : [e]) {
      const p = [ev.clientX - r0.hx, ev.clientY - r0.hy], t = ev.timeStamp;
      if (prev) {
        const isIn = inside(p, r);
        if (!stroke && (isIn || hits(prev.p, p, r))) stroke = { pts: [prev.p], t: prev.t };
        if (stroke) { add(p); if (!isIn) finish(r, t); }
      }
      prev = { p, t };
    }
  });
  hero.addEventListener("pointerleave", () => { prev = null; stroke = null; });
  addEventListener("resize", () => { if (!raf) stop(); });
})();
