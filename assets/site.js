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

// Cursor FX (2026-11-26): silver comet trail + "blockchain" nodes that link up and dissolve,
// a glass lens that follows the pointer and a hex shockwave on click. Desktop only.
(() => {
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduce) return;

  const cv = document.createElement("canvas");
  cv.className = "cfx-canvas";
  cv.setAttribute("aria-hidden", "true");
  const lens = document.createElement("div");
  lens.className = "cfx-lens";
  lens.setAttribute("aria-hidden", "true");
  lens.innerHTML = "<i></i>";
  document.body.append(cv, lens);
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

  const P = { x: -999, y: -999, lx: -999, ly: -999, in: false };
  const L = { x: -999, y: -999, s: 1, ts: 1 };
  const trail = [];           // {x,y,t}
  const nodes = [];           // blockchain dots
  const sparks = [];          // little glints and burst shards
  const rings = [];           // click shockwaves
  const GLYPHS = ["₮", "◆", "+", "·", "⬡", "$"];
  let dist = 0, raf = 0, last = 0, hue = 0;

  const rand = (a, b) => a + Math.random() * (b - a);

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    P.x = e.clientX; P.y = e.clientY;
    if (!P.in) { P.in = true; P.lx = P.x; P.ly = P.y; L.x = P.x; L.y = P.y; lens.classList.add("on"); }
    const dx = P.x - P.lx, dy = P.y - P.ly, d = Math.hypot(dx, dy);
    dist = Math.min(dist + d, 26 * 4);
    const now = performance.now();
    trail.push({ x: P.x, y: P.y, t: now });
    while (dist > 26) {
      dist -= 26;
      nodes.push({ x: P.x + rand(-6, 6), y: P.y + rand(-6, 6), vx: dx * .02 + rand(-.25, .25), vy: dy * .02 + rand(-.25, .25),
        life: 1, r: rand(1.2, 2.6), sq: Math.random() < .35, rot: rand(0, Math.PI) });
      if (nodes.length > 70) nodes.shift();
      if (Math.random() < .28) sparks.push({ x: P.x, y: P.y, vx: rand(-.6, .6) - dx * .01, vy: rand(-1.1, -.3), life: 1,
        g: GLYPHS[(Math.random() * GLYPHS.length) | 0], s: rand(9, 14), spin: rand(-.04, .04), a: 0 });
    }
    P.lx = P.x; P.ly = P.y;
    const t = e.target.closest && e.target.closest("a, button, [role=button], input, select, textarea, label, .tile, .btn");
    L.ts = t ? 1.9 : 1;
    lens.classList.toggle("hot", !!t);
    wake();
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", () => { P.in = false; lens.classList.remove("on"); });
  addEventListener("blur", () => { P.in = false; lens.classList.remove("on"); });

  addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    rings.push({ x: e.clientX, y: e.clientY, life: 1 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rand(-.2, .2), v = rand(1.6, 3.6);
      sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, g: null, s: rand(1, 2.2), spin: 0, a });
    }
    lens.classList.add("press");
    setTimeout(() => lens.classList.remove("press"), 160);
    wake();
  }, { passive: true });

  const hex = (x, y, r, rot) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rot + i * Math.PI / 3;
      i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  };

  function frame(t) {
    raf = 0;
    const dt = Math.min(3, (t - (last || t)) / 16.67); last = t;
    hue += dt;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    // Comet trail: tapered ribbon of the last ~380 ms of movement
    while (trail.length && t - trail[0].t > 380) trail.shift();
    if (trail.length > 2) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i], k = i / trail.length;
        const fade = 1 - (t - b.t) / 380;
        ctx.strokeStyle = `rgba(235,238,245,${.55 * k * fade})`;
        ctx.lineWidth = 0.6 + k * 3.2;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      const h = trail[trail.length - 1];
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 26);
      g.addColorStop(0, "rgba(255,255,255,.22)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, 26, 0, 7); ctx.fill();
    }

    // Blockchain nodes + links
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      n.x += n.vx * dt; n.y += n.vy * dt; n.vx *= .97; n.vy *= .97;
      n.life -= .011 * dt; n.rot += .01 * dt;
      if (n.life <= 0) nodes.splice(i, 1);
    }
    ctx.lineWidth = .7;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 > 8100) continue;
        const al = (1 - Math.sqrt(d2) / 90) * Math.min(a.life, b.life) * .45;
        ctx.strokeStyle = `rgba(200,205,215,${al})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for (const n of nodes) {
      const al = Math.min(1, n.life * 1.4);
      if (n.sq) {
        ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.rot);
        ctx.strokeStyle = `rgba(255,255,255,${al * .8})`; ctx.lineWidth = .9;
        ctx.strokeRect(-n.r * 1.6, -n.r * 1.6, n.r * 3.2, n.r * 3.2); ctx.restore();
      } else {
        ctx.fillStyle = `rgba(255,255,255,${al * .85})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7); ctx.fill();
      }
    }

    // Sparks: floating glyphs and click shards
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.g) { s.vy -= .004 * dt; s.a += s.spin * dt; s.life -= .014 * dt; }
      else { s.vx *= .93; s.vy *= .93; s.life -= .03 * dt; }
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      if (s.g) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
        ctx.font = `600 ${s.s}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.fillStyle = `rgba(225,228,236,${s.life * .7})`;
        ctx.fillText(s.g, 0, 0); ctx.restore();
      } else {
        ctx.strokeStyle = `rgba(255,255,255,${s.life})`; ctx.lineWidth = s.s;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3); ctx.stroke();
      }
    }

    // Click shockwaves: double hex ring
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life -= .025 * dt;
      if (r.life <= 0) { rings.splice(i, 1); continue; }
      const p = 1 - r.life, e = 1 - Math.pow(1 - p, 3);
      ctx.lineWidth = 1.4 * r.life + .3;
      ctx.strokeStyle = `rgba(255,255,255,${r.life * .8})`;
      hex(r.x, r.y, 8 + e * 54, p * .8); ctx.stroke();
      ctx.strokeStyle = `rgba(200,205,215,${r.life * .4})`;
      hex(r.x, r.y, 4 + e * 30, -p * .8 + Math.PI / 6); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    // Glass lens follows with a soft spring
    L.x += (P.x - L.x) * Math.min(1, .2 * dt);
    L.y += (P.y - L.y) * Math.min(1, .2 * dt);
    L.s += (L.ts - L.s) * Math.min(1, .18 * dt);
    lens.style.transform = `translate3d(${L.x}px,${L.y}px,0) translate(-50%,-50%) scale(${L.s})`;

    const moving = Math.abs(P.x - L.x) + Math.abs(P.y - L.y) + Math.abs(L.ts - L.s) > .3;
    if (trail.length || nodes.length || sparks.length || rings.length || moving) wake();
  }
  function wake() { if (!raf && !document.hidden) { raf = requestAnimationFrame(frame); } }
  document.addEventListener("visibilitychange", () => { last = 0; wake(); });
})();
