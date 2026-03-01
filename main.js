document.addEventListener("DOMContentLoaded", () => {
  // Global "anim" elements (003 etc): re-enter retrigger
  const animEls = document.querySelectorAll(".anim");
  const animObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.classList.remove("is-on");
        void el.offsetWidth;
        el.classList.add("is-on");
      } else {
        el.classList.remove("is-on");
      }
    });
  }, { threshold: 0.3 });
  animEls.forEach((el) => animObserver.observe(el));

  // Highlight fill (001 + 003): re-enter retrigger
  const highlights = document.querySelectorAll(".hl-fill");
  const hlObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.classList.remove("is-on");
        void el.offsetWidth;
        el.classList.add("is-on");
      } else {
        el.classList.remove("is-on");
      }
    });
  }, { threshold: 0.7 });
  highlights.forEach((el) => hlObserver.observe(el));

  // 002 underline grow
  const underline = document.querySelector(".cost-underline");
  if (underline) {
    const lineObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          underline.classList.remove("is-on");
          void underline.offsetWidth;
          underline.classList.add("is-on");
        } else {
          underline.classList.remove("is-on");
        }
      });
    }, { threshold: 0.6 });
    lineObserver.observe(underline);
  }

  // 002 Count animation (0 -> 25), re-enter retrigger, cancel-safe
  const counter = document.querySelector(".percent-number");
  let rafId = null;

  function animateCount(el, target, durationMs) {
    const start = performance.now();
    const from = 0;

    if (rafId) cancelAnimationFrame(rafId);

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function step(now) {
      const p = Math.min(1, (now - start) / durationMs);
      const v = Math.round(from + (target - from) * easeOutCubic(p));
      el.textContent = String(v);
      if (p < 1) rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  if (counter) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          counter.textContent = "0";
          animateCount(counter, Number(counter.dataset.count || "25"), 1200);
        } else {
          if (rafId) cancelAnimationFrame(rafId);
          counter.textContent = "0";
        }
      });
    }, { threshold: 0.6 });

    countObserver.observe(counter);
  }
});


  // 010 Count animation (multiple counters), re-enter retrigger, cancel-safe
  const countEls = document.querySelectorAll(".count-num[data-count]");
  const rafMap = new WeakMap();

  function fmtNumber(v, format) {
    if (format === "comma") return v.toLocaleString("ko-KR");
    return String(v);
  }

  function animateCountGeneric(el, target, durationMs) {
    const start = performance.now();
    const from = 0;

    const prev = rafMap.get(el);
    if (prev) cancelAnimationFrame(prev);

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function step(now) {
      const p = Math.min(1, (now - start) / durationMs);
      const v = Math.round(from + (target - from) * easeOutCubic(p));
      el.textContent = fmtNumber(v, el.dataset.format || "plain");
      if (p < 1) rafMap.set(el, requestAnimationFrame(step));
    }
    rafMap.set(el, requestAnimationFrame(step));
  }

  if (countEls.length) {
    const multiCountObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const target = Number(el.dataset.count || "0");
        const dur = Number(el.dataset.duration || "1200");

        if (entry.isIntersecting) {
          el.textContent = "0";
          animateCountGeneric(el, target, dur);
        } else {
          const id = rafMap.get(el);
          if (id) cancelAnimationFrame(id);
          el.textContent = "0";
        }
      });
    }, { threshold: 0.6 });

    countEls.forEach((el) => multiCountObserver.observe(el));
  }
  
  // 015 Fixed CTA: hide on scroll-down, show on scroll-up (subtle)
(() => {
  const bar = document.querySelector(".fixed-cta");
  if (!bar) return;

  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;

    // 페이지 상단 근처에서는 항상 노출
    if (y < 60) {
      bar.classList.remove("is-hide");
      lastY = y;
      return;
    }

    const down = y > lastY + 6;
    const up = y < lastY - 6;

    if (down) bar.classList.add("is-hide");
    if (up) bar.classList.remove("is-hide");

    lastY = y;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();