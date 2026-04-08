(() => {
  function setupHeroParallax(root = document) {
    root.querySelectorAll(".page-hero, .hero").forEach((hero) => {
      if (hero.dataset.parallaxReady === "true") return;

      const layer = hero.querySelector(".page-hero-parallax, .hero-parallax");
      if (!layer) return;

      hero.dataset.parallaxReady = "true";

      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let rafId = null;

      function animate() {
        currentX += (targetX - currentX) * 0.18;
        currentY += (targetY - currentY) * 0.18;

        layer.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(1.06)`;

        const settled =
          Math.abs(targetX - currentX) < 0.1 &&
          Math.abs(targetY - currentY) < 0.1 &&
          Math.abs(targetX) < 0.1 &&
          Math.abs(targetY) < 0.1;

        if (settled) {
          rafId = null;
          currentX = 0;
          currentY = 0;
          layer.style.transform = "translate3d(0, 0, 0) scale(1.06)";
          return;
        }

        rafId = window.requestAnimationFrame(animate);
      }

      hero.addEventListener("mousemove", (event) => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        targetX = (x - 0.5) * 28;
        targetY = (y - 0.5) * 28;

        if (!rafId) {
          rafId = window.requestAnimationFrame(animate);
        }
      });

      hero.addEventListener("mouseleave", () => {
        targetX = 0;
        targetY = 0;

        if (!rafId) {
          rafId = window.requestAnimationFrame(animate);
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setupHeroParallax(document), { once: true });
  } else {
    setupHeroParallax(document);
  }
})();
