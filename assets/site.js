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

// Cursor FX v2 (2026-11-26): "liquid chrome". A drop of mercury follows the pointer on a spring,
// stretches into a tail when you move, throws off droplets that merge back, splashes on click.
// Rendered as metaballs at 1/3 resolution only around the drop. Desktop only.
(() => {
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduce) return;

  const cv = document.createElement("canvas");
  cv.className = "cfx-canvas";
  cv.setAttribute("aria-hidden", "true");
  document.body.append(cv);
  const ctx = cv.getContext("2d");
  const off = document.createElement("canvas");
  const octx = off.getContext("2d");
  const S = 1.5;                       // field resolution in CSS px

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize);

  const P = { x: -999, y: -999, in: false, hot: 0, th: 0 };
  const N = 9;                                  // spine of the drop
  const spine = Array.from({ length: N }, (_, i) => ({ x: -999, y: -999, vx: 0, vy: 0, r: 13 - i * 1.05 }));
  const drops = [];                              // loose droplets {x,y,vx,vy,r,life}
  const waves = [];                              // click ripples
  let raf = 0, last = 0, energy = 0;
  const rand = (a, b) => a + Math.random() * (b - a);

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!P.in) { P.in = true; spine.forEach((s) => { s.x = e.clientX; s.y = e.clientY; s.vx = s.vy = 0; }); }
    const dx = e.clientX - P.x, dy = e.clientY - P.y, sp = Math.hypot(dx, dy);
    P.x = e.clientX; P.y = e.clientY;
    if (sp > 28 && sp < 400 && drops.length < 40 && Math.random() < .5) {
      const t = spine[N - 2 - ((Math.random() * 3) | 0)];
      drops.push({ x: t.x, y: t.y, vx: -dx * .06 + rand(-1.5, 1.5), vy: -dy * .06 + rand(-1.5, 1.5), r: rand(3, 6.5), life: 1 });
    }
    const t = e.target.closest && e.target.closest("a, button, [role=button], input, select, textarea, label, .btn");
    P.th = t ? 1 : 0;
    energy = 1;
    wake();
  }, { passive: true });

  const leave = () => { P.in = false; };
  document.documentElement.addEventListener("pointerleave", leave);
  addEventListener("blur", leave);

  addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + rand(-.25, .25), v = rand(3, 7);
      drops.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rand(2.5, 6), life: 1 });
    }
    waves.push({ x: e.clientX, y: e.clientY, life: 1 });
    spine[0].r = 6;  // the head "squishes" and refills
    energy = 1;
    wake();
  }, { passive: true });

  // chrome palette: reflection of a dark studio with a bright horizon
  const shade = (nx, ny, nz) => {
    // reflect the view ray (0,0,-1) about the normal; ry > 0 looks at the floor, ry < 0 at the sky
    const up = -2 * nz * ny;                                            // reflected ray height: sky > 0 > floor
    const k = Math.min(1, Math.max(0, (up + .06) / .3)), sm = k * k * (3 - 2 * k);
    let c = 14 + 225 * sm * (.75 + .25 * Math.min(1, up + .5));
    c += 45 * Math.exp(-Math.pow((up - .5) * 3, 2));                    // soft horizon glow
    const spec = Math.pow(Math.max(0, -nx * .5 - ny * .55 + nz * .67), 60) * 255;  // key light, top-left
    c = c * (.6 + .4 * nz) + spec + (1 - nz) * 25;                       // a little rim light
    return c > 255 ? 255 : c;
  };

  let img = null, hf = null, ff = null, tf = null;
  function render() {
    const balls = [];
    for (let i = 0; i < N; i++) {          // spine plus midpoints, so the tail is a smooth tube, not beads
      const s = spine[i];
      if (s.r > .5) balls.push(s);
      const t = spine[i + 1];
      if (t && t.r > .5) balls.push({ x: (s.x + t.x) / 2, y: (s.y + t.y) / 2, r: (s.r + t.r) / 2 });
    }
    for (const d of drops) balls.push({ x: d.x, y: d.y, r: d.r * Math.min(1, d.life * 2) });
    if (!balls.length || !P.in && !drops.length && energy < .02) return;

    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const b of balls) {
      x0 = Math.min(x0, b.x - b.r * 1.5); y0 = Math.min(y0, b.y - b.r * 1.5);
      x1 = Math.max(x1, b.x + b.r * 1.5); y1 = Math.max(y1, b.y + b.r * 1.5);
    }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
    const gw = Math.ceil((x1 - x0) / S), gh = Math.ceil((y1 - y0) / S);
    if (gw <= 0 || gh <= 0 || gw * gh > 160000) return;
    if (off.width !== gw || off.height !== gh) { off.width = gw; off.height = gh; img = octx.createImageData(gw, gh); }
    const data = img.data;
    const n = balls.length, bx = new Float32Array(n), by = new Float32Array(n), br = new Float32Array(n);
    for (let i = 0; i < n; i++) { bx[i] = balls[i].x; by[i] = balls[i].y; br[i] = 1 / (2 * balls[i].r * balls[i].r + 1e-3); }

    // pass 1: field -> height. For one ball h = sqrt(1 - d²/r²), i.e. an exact hemisphere; blends smoothly when balls merge
    if (!hf || hf.length < gw * gh) { hf = new Float32Array(gw * gh); ff = new Float32Array(gw * gh); }
    for (let j = 0, q = 0; j < gh; j++) {
      const y = y0 + j * S + S / 2;
      for (let i = 0; i < gw; i++, q++) {
        const x = x0 + i * S + S / 2;
        let f = 0;
        for (let k = 0; k < n; k++) { const dx = x - bx[k], dy = y - by[k], u = 1 - (dx * dx + dy * dy) * br[k]; if (u > 0) f += u * u; }
        ff[q] = f; const hh = 2 * Math.sqrt(f) - 1; hf[q] = hh > 0 ? Math.sqrt(hh > 1 ? 1 + (hh - 1) * .15 : hh) : 0;
      }
    }
    // soften the height map (separable 1-2-1 blur) to iron out bumps between merged balls
    if (!tf || tf.length < gw * gh) tf = new Float32Array(gw * gh);
    for (let j = 0, q = 0; j < gh; j++) for (let i = 0; i < gw; i++, q++)
      tf[q] = ((i > 0 ? hf[q - 1] : 0) + 2 * hf[q] + (i < gw - 1 ? hf[q + 1] : 0)) * .25;
    for (let j = 0, q = 0; j < gh; j++) for (let i = 0; i < gw; i++, q++)
      hf[q] = ((j > 0 ? tf[q - gw] : 0) + 2 * tf[q] + (j < gh - 1 ? tf[q + gw] : 0)) * .25;
    // pass 2: normals from height differences, then chrome shading
    const R = 12 / S;
    for (let j = 0, q = 0, p = 0; j < gh; j++) {
      for (let i = 0; i < gw; i++, q++, p += 4) {
        const f = ff[q];
        if (f < .12) { data[p + 3] = 0; continue; }
        const hl = i > 0 ? hf[q - 1] : 0, hr = i < gw - 1 ? hf[q + 1] : 0;
        const hu = j > 0 ? hf[q - gw] : 0, hd = j < gh - 1 ? hf[q + gw] : 0;
        let nx = (hl - hr) * R * .5, ny = (hu - hd) * R * .5, nz = 1;
        const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
        const c = shade(nx, ny, nz);
        data[p] = c; data[p + 1] = c; data[p + 2] = c * 1.03 > 255 ? 255 : c * 1.03;
        const ea = (f - .12) / .16; data[p + 3] = ea >= 1 ? 255 : ea * ea * (3 - 2 * ea) * 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(off, x0, y0, gw * S, gh * S);
  }

  function frame(t) {
    raf = 0;
    const dt = Math.min(2.5, (t - (last || t)) / 16.67); last = t;
    ctx.clearRect(0, 0, W, H);

    // spine physics: head springs to pointer, each link springs to the one before it
    P.hot += (P.th - P.hot) * .15 * dt;
    const headR = 14 + P.hot * 9;
    for (let i = 0; i < N; i++) {
      const s = spine[i], tx = i ? spine[i - 1].x : P.x, ty = i ? spine[i - 1].y : P.y;
      const k = i ? .34 : .24, damp = i ? .55 : .62;
      s.vx = (s.vx + (tx - s.x) * k * dt) * Math.pow(damp, dt);
      s.vy = (s.vy + (ty - s.y) * k * dt) * Math.pow(damp, dt);
      s.x += s.vx * dt; s.y += s.vy * dt;
      const target = P.in ? (i ? (headR - i * 1.05 * (1 + P.hot * .4)) : headR) : 0;
      s.r += (Math.max(0, target) - s.r) * (i ? .2 : .12) * dt;
    }
    // droplets: fly, slow down, get pulled back to the drop and shrink
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      const h = spine[0], dx = h.x - d.x, dy = h.y - d.y, dist = Math.hypot(dx, dy) + 1;
      if (P.in) { d.vx += dx / dist * .18 * dt; d.vy += dy / dist * .18 * dt; }
      d.vx *= Math.pow(.92, dt); d.vy *= Math.pow(.92, dt);
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.life -= (P.in && dist < h.r * 1.2 ? .08 : .012) * dt;
      if (d.life <= 0) drops.splice(i, 1);
    }

    // click ripples: thin silver rings under the drop
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.life -= .022 * dt;
      if (w.life <= 0) { waves.splice(i, 1); continue; }
      const e = 1 - Math.pow(w.life, 3);
      for (let k = 0; k < 2; k++) {
        const r = 10 + e * (70 - k * 26);
        ctx.strokeStyle = `rgba(230,233,240,${w.life * (k ? .25 : .55)})`;
        ctx.lineWidth = 1.2 * w.life + .4;
        ctx.beginPath(); ctx.arc(w.x, w.y, r, 0, 7); ctx.stroke();
      }
    }

    render();

    let motion = Math.abs(P.x - spine[N - 1].x) + Math.abs(P.y - spine[N - 1].y);
    for (const s of spine) motion += Math.abs(s.vx) + Math.abs(s.vy);
    energy = Math.min(1, motion / 4);
    const settling = spine.some((s, i) => Math.abs(s.r - (P.in ? Math.max(0, (i ? headR - i * 1.05 * (1 + P.hot * .4) : headR)) : 0)) > .05);
    if (drops.length || waves.length || energy > .01 || settling) wake();
  }
  function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  document.addEventListener("visibilitychange", () => { last = 0; wake(); });
})();
