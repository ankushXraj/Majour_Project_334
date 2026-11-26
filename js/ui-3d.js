// ── FlowerCycle Interactive 3D Motion & Tilt ────────────────
(function init3DUI() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  // Interactive 3D perspective tilt on cards & tiles
  const tiltTargets = document.querySelectorAll(
    ".process-card, .product-tile, .feature-card, .stat-card, .waste-stat, .module-stat"
  );

  tiltTargets.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * 9;
      const rotateX = (0.5 - y) * 9;

      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  });

  // Hero 3D stage mouse parallax
  const hero = document.querySelector(".hero");
  const heroArt = document.querySelector(".hero-art");
  if (hero && heroArt) {
    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      heroArt.style.transform = `rotateY(${(x * 18).toFixed(2)}deg) rotateX(${(-y * 14).toFixed(2)}deg)`;
    });

    hero.addEventListener("mouseleave", () => {
      heroArt.style.transform = "";
    });
  }

  // Smooth fade-in and slide-up reveal when sections enter viewport
  const revealEls = document.querySelectorAll(
    ".impact-strip, .about-image-card, .about-point, .process-card, .eco-card, .feature-card, .impact-card, .cta-banner"
  );
  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    revealEls.forEach((el, idx) => {
      el.classList.add("reveal-3d");
      el.style.transitionDelay = `${Math.min((idx % 4) * 55, 220)}ms`;
      observer.observe(el);
    });
  }
})();
