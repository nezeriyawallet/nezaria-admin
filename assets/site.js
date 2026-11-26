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

// Cursor FX (2026-11-26): a dot grid revealed around the cursor that bulges outward like a lens, plus a
// short silver tail with sparks when the mouse moves. No ring. Desktop only.
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
  const GAP = 24, R = 170;
  const pts = [], sparks = [];
  let raf = 0, last = 0, px = 0, py = 0;
  const rand = (a, b) => a + Math.random() * (b - a);

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const now = performance.now();
    if (!P.in) { P.in = true; px = S.x = e.clientX; py = S.y = e.clientY; }
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

    // lens grid: dots appear around the cursor, swell and get pushed outward
    S.x += (P.x - S.x) * ease(.25); S.y += (P.y - S.y) * ease(.25);
    S.a += ((P.in ? 1 : 0) - S.a) * ease(.1);
    if (S.a > .01) {
      const oy = -(scrollY % GAP), ox = (W % GAP) / 2;
      const gx0 = Math.floor((S.x - R - ox) / GAP), gx1 = Math.ceil((S.x + R - ox) / GAP);
      const gy0 = Math.floor((S.y - R - oy) / GAP), gy1 = Math.ceil((S.y + R - oy) / GAP);
      ctx.fillStyle = "#fff";
      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) {
          const bx = ox + gx * GAP, by = oy + gy * GAP, dx = bx - S.x, dy = by - S.y, d = Math.hypot(dx, dy);
          if (d >= R) continue;
          const k = 1 - d / R, k2 = k * k * (3 - 2 * k);
          const push = k2 * 14 / (d + 1);
          ctx.globalAlpha = Math.min(1, (.1 + k2 * .95) * Math.min(1, k * 4)) * S.a;
          ctx.beginPath(); ctx.arc(bx + dx * push, by + dy * push, .8 + k2 * 2, 0, 6.2832); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // thin crosshair through the lens
      const lg = ctx.createRadialGradient(S.x, S.y, 0, S.x, S.y, R);
      lg.addColorStop(0, `rgba(255,255,255,${.22 * S.a})`); lg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = lg; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(S.x - R, Math.round(S.y) + .5); ctx.lineTo(S.x + R, Math.round(S.y) + .5);
      ctx.moveTo(Math.round(S.x) + .5, S.y - R); ctx.lineTo(Math.round(S.x) + .5, S.y + R);
      ctx.stroke();
    }
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

    if (pts.length > 1 || sparks.length || Math.abs(P.x - S.x) + Math.abs(P.y - S.y) > .2 || Math.abs((P.in ? 1 : 0) - S.a) > .01) wake();
  }
  function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  document.addEventListener("visibilitychange", () => { last = 0; wake(); });
})();
