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
