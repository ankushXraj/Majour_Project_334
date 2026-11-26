/**
 * FlowerCycle Motion & Creative Interaction Engine
 * Inspired by modern creative interactive web experiences.
 * Fully vanilla JS, 60 FPS, touch-friendly, respects prefers-reduced-motion.
 */
(function initFlowerCycleMotion() {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchDevice = () => window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  /* ─────────────────────────────────────────────────────────────
     1. Scroll Progress Bar
  ───────────────────────────────────────────────────────────── */
  function initScrollProgress() {
    let bar = document.getElementById("scrollProgressBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "scrollProgressBar";
      bar.className = "scroll-progress-bar";
      document.body.prepend(bar);
    }

    const updateBar = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? (scrollY / totalHeight) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    };

    window.addEventListener("scroll", updateBar, { passive: true });
    updateBar();
  }

  /* ─────────────────────────────────────────────────────────────
     2. Custom Fluid Desktop Cursor with Glow & States
  ───────────────────────────────────────────────────────────── */
  function initCustomCursor() {
    if (prefersReduced || isTouchDevice()) return;

    let dot = document.querySelector(".custom-cursor-dot");
    let ring = document.querySelector(".custom-cursor-ring");

    if (!dot) {
      dot = document.createElement("div");
      dot.className = "custom-cursor-dot";
      document.body.appendChild(dot);
    }
    if (!ring) {
      ring = document.createElement("div");
      ring.className = "custom-cursor-ring";
      document.body.appendChild(ring);
    }

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let isVisible = false;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }

      // Inner dot tracks cursor directly with no latency
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    }, { passive: true });

    document.addEventListener("mouseleave", () => {
      isVisible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    });

    document.addEventListener("mouseenter", () => {
      isVisible = true;
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    });

    // Smooth outer ring interpolation (spring lag)
    function renderRing() {
      if (isVisible) {
        ringX += (mouseX - ringX) * 0.16;
        ringY += (mouseY - ringY) * 0.16;
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }
      requestAnimationFrame(renderRing);
    }
    renderRing();

    // Hover states for interactive elements
    const interactiveSelectors = [
      "a",
      "button",
      "input",
      "select",
      ".btn",
      ".process-card",
      ".product-card",
      ".drag-item",
      ".interactive-petal",
      ".journey-card",
      ".nav-actions a",
      ".filter-pill",
      ".action-btn",
      "[role='button']"
    ].join(",");

    document.addEventListener("mouseover", (e) => {
      const target = e.target.closest(interactiveSelectors);
      if (target) {
        document.body.classList.add("cursor-hover");
        if (target.closest(".drag-item, .interactive-petal")) {
          document.body.classList.add("cursor-drag");
        }
      }
    });

    document.addEventListener("mouseout", (e) => {
      const target = e.target.closest(interactiveSelectors);
      if (target) {
        document.body.classList.remove("cursor-hover");
        document.body.classList.remove("cursor-drag");
      }
    });

    document.addEventListener("mousedown", () => {
      document.body.classList.add("cursor-pressed");
    });

    document.addEventListener("mouseup", () => {
      document.body.classList.remove("cursor-pressed");
    });
  }

  /* ─────────────────────────────────────────────────────────────
     3. Magnetic Buttons Attraction
  ───────────────────────────────────────────────────────────── */
  function initMagneticButtons() {
    if (prefersReduced || isTouchDevice()) return;

    const magneticElements = document.querySelectorAll(
      ".btn, .magnetic, .nav-actions a, .filter-pill, .cart-nav-btn, .scroll-down-btn"
    );

    magneticElements.forEach((el) => {
      // Don't duplicate listeners
      if (el.dataset.magneticBound) return;
      el.dataset.magneticBound = "true";

      const maxDistance = 24; // maximum pull in px

      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * 0.28;
        const deltaY = (e.clientY - centerY) * 0.28;

        const distance = Math.hypot(deltaX, deltaY);
        const scale = distance > maxDistance ? maxDistance / distance : 1;

        el.style.transform = `translate3d(${deltaX * scale}px, ${deltaY * scale}px, 0)`;
      });

      el.addEventListener("mouseleave", () => {
        el.style.transform = "translate3d(0, 0, 0)";
        el.style.transition = "transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)";
        setTimeout(() => {
          el.style.transition = "";
        }, 460);
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     4. Interactive 3D Card Tilt with Gloss Spotlight
  ───────────────────────────────────────────────────────────── */
  function initTiltCards() {
    if (prefersReduced) return;

    const targets = document.querySelectorAll(
      ".process-card, .product-card, .feature-card, .stat-card, .journey-card, .eco-card, .module-stat, .waste-stat, .pricing-card"
    );

    targets.forEach((card) => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = "true";

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        const rotateY = (x - 0.5) * 12;
        const rotateX = (0.5 - y) * 12;

        card.style.setProperty("--mouse-x", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--mouse-y", `${(y * 100).toFixed(1)}%`);
        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     5. Draggable Momentum Physics (Vanilla Pointer Events)
     Enables smooth drag-and-toss on dedicated showcase elements
  ───────────────────────────────────────────────────────────── */
  function initDraggables() {
    if (prefersReduced) return;

    const draggables = document.querySelectorAll(".drag-item, .interactive-petal");

    draggables.forEach((el) => {
      if (el.dataset.dragBound) return;
      el.dataset.dragBound = "true";

      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let currentX = 0;
      let currentY = 0;
      let prevX = 0;
      let prevY = 0;
      let vx = 0;
      let vy = 0;
      let lastTime = 0;
      let animationFrame = null;
      let rotation = parseFloat(el.dataset.rotation || "0");

      el.style.touchAction = "none";
      el.style.userSelect = "none";
      el.style.cursor = "grab";

      const onPointerDown = (e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        isDragging = true;
        el.setPointerCapture(e.pointerId);
        el.style.cursor = "grabbing";
        el.style.zIndex = "100";
        el.classList.add("is-dragging");

        if (animationFrame) cancelAnimationFrame(animationFrame);

        startX = e.clientX - currentX;
        startY = e.clientY - currentY;
        prevX = e.clientX;
        prevY = e.clientY;
        lastTime = performance.now();
        vx = 0;
        vy = 0;
      };

      const onPointerMove = (e) => {
        if (!isDragging) return;

        const now = performance.now();
        const dt = Math.max(1, now - lastTime);

        currentX = e.clientX - startX;
        currentY = e.clientY - startY;

        vx = (e.clientX - prevX) / dt;
        vy = (e.clientY - prevY) / dt;

        prevX = e.clientX;
        prevY = e.clientY;
        lastTime = now;

        rotation += vx * 2.2;
        el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${rotation.toFixed(1)}deg) scale(1.05)`;
      };

      const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        try {
          el.releasePointerCapture(e.pointerId);
        } catch (_) {}
        el.style.cursor = "grab";
        el.style.zIndex = "";
        el.classList.remove("is-dragging");

        // Momentum / inertia release simulation with friction
        let momentumVx = Math.min(Math.max(vx * 16, -28), 28);
        let momentumVy = Math.min(Math.max(vy * 16, -28), 28);
        const friction = 0.92;

        function stepMomentum() {
          if (Math.abs(momentumVx) < 0.1 && Math.abs(momentumVy) < 0.1) {
            el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${rotation.toFixed(1)}deg)`;
            return;
          }

          currentX += momentumVx;
          currentY += momentumVy;
          momentumVx *= friction;
          momentumVy *= friction;
          rotation += momentumVx * 0.4;

          // Boundary bounce dampening inside container if parent has .drag-canvas
          const parent = el.closest(".drag-canvas");
          if (parent) {
            const rect = parent.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            if (elRect.left < rect.left || elRect.right > rect.right) {
              momentumVx = -momentumVx * 0.6;
            }
            if (elRect.top < rect.top || elRect.bottom > rect.bottom) {
              momentumVy = -momentumVy * 0.6;
            }
          }

          el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${rotation.toFixed(1)}deg)`;
          animationFrame = requestAnimationFrame(stepMomentum);
        }

        animationFrame = requestAnimationFrame(stepMomentum);
      };

      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp);
      el.addEventListener("pointercancel", onPointerUp);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     6. Hero Parallax Layers
  ───────────────────────────────────────────────────────────── */
  function initHeroParallax() {
    if (prefersReduced || isTouchDevice()) return;

    const hero = document.querySelector(".hero");
    if (!hero) return;

    const art = hero.querySelector(".hero-art");
    const floatingCards = hero.querySelectorAll(".floating-card");
    const petals = hero.querySelectorAll(".fp");

    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      if (art) {
        art.style.transform = `rotateY(${(x * 16).toFixed(2)}deg) rotateX(${(-y * 12).toFixed(2)}deg)`;
      }

      floatingCards.forEach((c, idx) => {
        const factor = (idx + 1) * 18;
        c.style.transform = `translate3d(${(x * factor).toFixed(1)}px, ${(y * factor).toFixed(1)}px, 0)`;
      });

      petals.forEach((p, idx) => {
        const factor = (idx + 1) * 24;
        p.style.transform = `translate3d(${(-x * factor).toFixed(1)}px, ${(-y * factor).toFixed(1)}px, 0)`;
      });
    });

    hero.addEventListener("mouseleave", () => {
      if (art) art.style.transform = "";
      floatingCards.forEach((c) => (c.style.transform = ""));
      petals.forEach((p) => (p.style.transform = ""));
    });
  }

  /* ─────────────────────────────────────────────────────────────
     7. Scroll Reveal & Storytelling Stages
  ───────────────────────────────────────────────────────────── */
  function initScrollReveals() {
    const revealTargets = document.querySelectorAll(
      ".reveal-on-scroll, .journey-stage, .section-heading, .about-grid, .impact-strip, .stat-card, .process-card, .product-card, .cta-banner"
    );

    if (!("IntersectionObserver" in window)) {
      revealTargets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            // If it has count-up numbers, trigger them
            const counters = entry.target.querySelectorAll("[data-count]");
            counters.forEach((c) => runCounter(c));
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealTargets.forEach((el, idx) => {
      el.classList.add("reveal-motion");
      if (!el.style.transitionDelay && (idx % 6) > 0) {
        el.style.transitionDelay = `${(idx % 6) * 60}ms`;
      }
      observer.observe(el);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     8. Number Counter Animation Helper
  ───────────────────────────────────────────────────────────── */
  function runCounter(el) {
    if (el.dataset.counted === "true") return;
    el.dataset.counted = "true";

    const targetVal = parseFloat(el.dataset.count || el.textContent.replace(/[^0-9.]/g, ""));
    if (isNaN(targetVal)) return;

    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const duration = 1200;
    const start = performance.now();

    function updateCount(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = targetVal * ease;

      el.textContent = `${prefix}${current.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    }

    requestAnimationFrame(updateCount);
  }

  /* ─────────────────────────────────────────────────────────────
     9. Initialize All Modules
  ───────────────────────────────────────────────────────────── */
  function initAll() {
    initScrollProgress();
    initCustomCursor();
    initMagneticButtons();
    initTiltCards();
    initDraggables();
    initHeroParallax();
    initScrollReveals();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  // Expose global helper for dynamically loaded items (like shop products)
  window.FlowerCycleMotion = {
    refresh: () => {
      initMagneticButtons();
      initTiltCards();
      initDraggables();
      initScrollReveals();
    },
    runCounter: runCounter
  };
})();
