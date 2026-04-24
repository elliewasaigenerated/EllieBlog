(() => {
  const loadedScriptSrcs = new Set(
    Array.from(document.scripts)
      .map((script) => script.src)
      .filter(Boolean)
  );

  let enterAnimationTimer = null;
  let navigationSequence = 0;
  let homuraLaunchLastTrigger = null;
  let pendingEmbedConsentOpen = false;

  const ANALYTICS_MEASUREMENT_ID = "G-R2EQQXDV2Y";
  const ANALYTICS_SCRIPT_SRC = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_MEASUREMENT_ID}`;
  const ANALYTICS_CONSENT_KEY = "ellie_analytics_consent";
  const ANALYTICS_CONSENT_VALUES = {
    accepted: "accepted",
    declined: "declined",
    dismissed: "dismissed",
  };
  const ANALYTICS_CONSENT_SESSION_SEEN_KEY = "ellie_analytics_consent_seen_this_session";

  const EMBED_CONSENT_KEY = "ellie_embed_consent";
  const EMBED_CONSENT_VALUES = {
    accepted: "accepted",
    declined: "declined",
    dismissed: "dismissed",
  };
  const EMBED_CONSENT_SESSION_SEEN_KEY = "ellie_embed_consent_seen_this_session";

  function getStoredAnalyticsConsent() {
    try {
      return localStorage.getItem(ANALYTICS_CONSENT_KEY) || "";
    } catch (_error) {
      return "";
    }
  }

  function analyticsAllowed() {
    return getStoredAnalyticsConsent() === ANALYTICS_CONSENT_VALUES.accepted;
  }

  function setStoredAnalyticsConsent(value) {
    try {
      if (!value) {
        localStorage.removeItem(ANALYTICS_CONSENT_KEY);
        return;
      }

      localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
    } catch (_error) {
      // Ignore storage failures and keep the page usable.
    }
  }

  function hasSeenAnalyticsConsentThisSession() {
    try {
      return sessionStorage.getItem(ANALYTICS_CONSENT_SESSION_SEEN_KEY) === "true";
    } catch (_error) {
      return false;
    }
  }

  function markAnalyticsConsentSeenThisSession() {
    try {
      sessionStorage.setItem(ANALYTICS_CONSENT_SESSION_SEEN_KEY, "true");
    } catch (_error) {
      // Ignore storage failures and keep the page usable.
    }
  }

  function loadAnalytics() {
    if (!analyticsAllowed()) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", ANALYTICS_MEASUREMENT_ID);

    if (loadedScriptSrcs.has(ANALYTICS_SCRIPT_SRC)) {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = ANALYTICS_SCRIPT_SRC;
    script.dataset.analyticsConsentScript = "true";
    document.head.appendChild(script);
    loadedScriptSrcs.add(ANALYTICS_SCRIPT_SRC);
  }

  function closeAnalyticsConsentDialog() {
    const modal = document.querySelector("[data-analytics-consent]");
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  function maybeContinueConsentFlow() {
    if (pendingEmbedConsentOpen) {
      pendingEmbedConsentOpen = false;
      openEmbedConsentDialog();
      return;
    }

    if (!hasSeenEmbedConsentThisSession()) {
      openEmbedConsentDialog();
    }
  }

  function dismissAnalyticsConsentDialog() {
    if (!getStoredAnalyticsConsent()) {
      setStoredAnalyticsConsent(ANALYTICS_CONSENT_VALUES.dismissed);
    }

    closeAnalyticsConsentDialog();
    maybeContinueConsentFlow();
  }

  function openAnalyticsConsentDialog() {
    const modal = document.querySelector("[data-analytics-consent]");
    if (!modal) return;

    markAnalyticsConsentSeenThisSession();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
  }

  function setAnalyticsConsent(value) {
    setStoredAnalyticsConsent(value);
    closeAnalyticsConsentDialog();

    if (value === ANALYTICS_CONSENT_VALUES.accepted) {
      loadAnalytics();
    }

    window.dispatchEvent(
      new CustomEvent("ellie:analytics-consent-change", {
        detail: {
          state: getStoredAnalyticsConsent(),
          allowed: analyticsAllowed(),
        },
      })
    );

    maybeContinueConsentFlow();
  }

  function ensureAnalyticsConsentUi() {
    if (document.querySelector("[data-analytics-consent]")) {
      return;
    }

    const modal = document.createElement("div");
    modal.className = "embed-consent";
    modal.dataset.analyticsConsent = "true";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.hidden = true;
    modal.innerHTML = `
      <div class="embed-consent__dialog">
        <p class="embed-consent__eyebrow">Privacy Notice</p>
        <h2 class="embed-consent__title">Google Analytics collects visit data</h2>
        <p class="embed-consent__copy">This site can use Google Analytics to measure page views and engagement. Accept to enable analytics collection. Otherwise, analytics stays off while the rest of the site remains usable.</p>
        <div class="embed-consent__actions">
          <button class="embed-consent__button embed-consent__button--primary" type="button" data-accept-analytics-consent>Accept analytics</button>
          <button class="embed-consent__button" type="button" data-decline-analytics-consent>Keep analytics off</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        dismissAnalyticsConsentDialog();
      }
    });

    modal.querySelector("[data-accept-analytics-consent]")
      .addEventListener("click", () => setAnalyticsConsent(ANALYTICS_CONSENT_VALUES.accepted));
    modal.querySelector("[data-decline-analytics-consent]")
      .addEventListener("click", () => setAnalyticsConsent(ANALYTICS_CONSENT_VALUES.declined));
  }

  function getStoredEmbedConsent() {
    try {
      return localStorage.getItem(EMBED_CONSENT_KEY) || "";
    } catch (_error) {
      return "";
    }
  }

  function embedsAllowed() {
    return getStoredEmbedConsent() === EMBED_CONSENT_VALUES.accepted;
  }

  function setStoredEmbedConsent(value) {
    try {
      if (!value) {
        localStorage.removeItem(EMBED_CONSENT_KEY);
        return;
      }

      localStorage.setItem(EMBED_CONSENT_KEY, value);
    } catch (_error) {
      // Ignore storage failures and keep the page usable.
    }
  }


  function hasSeenEmbedConsentThisSession() {
    try {
      return sessionStorage.getItem(EMBED_CONSENT_SESSION_SEEN_KEY) === "true";
    } catch (_error) {
      return false;
    }
  }

  function markEmbedConsentSeenThisSession() {
    try {
      sessionStorage.setItem(EMBED_CONSENT_SESSION_SEEN_KEY, "true");
    } catch (_error) {
      // Ignore storage failures and keep the page usable.
    }
  }

  function createEmbedPlaceholder({ title = "External media blocked", body = "Accept third-party embeds to load this media.", compact = false } = {}) {
    return `
      <div class="embed-placeholder ${compact ? "embed-placeholder--compact" : ""}">
        <div class="embed-placeholder__title">${title}</div>
        <p class="embed-placeholder__body">${body}</p>
        <button class="embed-placeholder__button" type="button" data-open-embed-consent>Enable embeds</button>
      </div>
    `;
  }

  function syncEmbedConsentApi() {
    window.EllieEmbedConsent = {
      isAllowed: embedsAllowed,
      getState: getStoredEmbedConsent,
      openDialog: requestEmbedConsentDialog,
      createPlaceholder: createEmbedPlaceholder,
    };
  }

  function syncEmbedConsentUiState() {
    const modal = document.querySelector("[data-embed-consent]");
    const trigger = document.querySelector("[data-embed-consent-trigger]");
    const state = getStoredEmbedConsent();

    document.body.classList.toggle("has-embed-consent-open", modal ? !modal.hidden : false);

    if (trigger) {
      trigger.hidden = false;
      trigger.textContent = state === EMBED_CONSENT_VALUES.accepted
        ? "Privacy & embeds"
        : state === EMBED_CONSENT_VALUES.declined
          ? "Embeds blocked"
          : "Privacy & embeds";
    }
  }

  function emitEmbedConsentChange() {
    syncEmbedConsentApi();
    syncEmbedConsentUiState();
    window.dispatchEvent(
      new CustomEvent("ellie:embed-consent-change", {
        detail: {
          state: getStoredEmbedConsent(),
          allowed: embedsAllowed(),
        },
      })
    );
  }

  function closeEmbedConsentDialog() {
    const modal = document.querySelector("[data-embed-consent]");
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    syncEmbedConsentUiState();
  }

  function dismissEmbedConsentDialog() {
    if (!getStoredEmbedConsent()) {
      setStoredEmbedConsent(EMBED_CONSENT_VALUES.dismissed);
    }
    closeEmbedConsentDialog();
    emitEmbedConsentChange();
  }

  function openEmbedConsentDialog() {
    const modal = document.querySelector("[data-embed-consent]");
    if (!modal) return;

    markEmbedConsentSeenThisSession();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    syncEmbedConsentUiState();
  }

  function requestEmbedConsentDialog() {
    if (!getStoredAnalyticsConsent()) {
      pendingEmbedConsentOpen = true;
      openAnalyticsConsentDialog();
      return;
    }

    openEmbedConsentDialog();
  }

  function setEmbedConsent(value, options = {}) {
    setStoredEmbedConsent(value);
    closeEmbedConsentDialog();
    emitEmbedConsentChange();

    if (options.reload && value === EMBED_CONSENT_VALUES.accepted) {
      window.location.reload();
    }
  }

  function ensureEmbedConsentUi() {
    if (document.querySelector("[data-embed-consent]")) {
      syncEmbedConsentApi();
      syncEmbedConsentUiState();
      return;
    }

    const modal = document.createElement("div");
    modal.className = "embed-consent";
    modal.dataset.embedConsent = "true";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.hidden = true;
    modal.innerHTML = `
      <div class="embed-consent__dialog">
        <p class="embed-consent__eyebrow">Privacy Notice</p>
        <h2 class="embed-consent__title">Third-party embeds can set cookies</h2>
        <p class="embed-consent__copy">This site can load embeds from Spotify, SoundCloud, and YouTube. These embeds will collect interaction data via cookies. Accept to enable the embeds. Otherwise, the site stays usable with embeds blocked.</p>
        <div class="embed-consent__actions">
          <button class="embed-consent__button embed-consent__button--primary" type="button" data-accept-embed-consent>Accept embeds</button>
          <button class="embed-consent__button" type="button" data-decline-embed-consent>Keep embeds blocked</button>
        </div>
      </div>
    `;

    const trigger = document.createElement("button");
    trigger.className = "embed-consent-trigger";
    trigger.type = "button";
    trigger.dataset.embedConsentTrigger = "true";
    trigger.textContent = "Privacy & embeds";
    trigger.hidden = true;

    document.body.appendChild(modal);
    document.body.appendChild(trigger);

    trigger.addEventListener("click", () => requestEmbedConsentDialog());

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-open-embed-consent]")) {
        event.preventDefault();
        requestEmbedConsentDialog();
      }
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        dismissEmbedConsentDialog();
      }
    });

    modal.querySelector("[data-accept-embed-consent]")
      .addEventListener("click", () => setEmbedConsent(EMBED_CONSENT_VALUES.accepted, { reload: true }));
    modal.querySelector("[data-decline-embed-consent]")
      .addEventListener("click", () => setEmbedConsent(EMBED_CONSENT_VALUES.declined));

    syncEmbedConsentApi();
    syncEmbedConsentUiState();
  }

  function closeHomuraLaunchDialog() {
    const modal = document.querySelector("[data-homura-launch]");
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-homura-launch-open");

    if (homuraLaunchLastTrigger && typeof homuraLaunchLastTrigger.focus === "function") {
      homuraLaunchLastTrigger.focus();
    }
  }

  function openHomuraLaunchDialog(trigger) {
    const modal = document.querySelector("[data-homura-launch]");
    if (!modal) return;

    homuraLaunchLastTrigger = trigger;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-homura-launch-open");

    const continueLink = modal.querySelector("[data-homura-launch-continue]");
    if (continueLink) {
      continueLink.href = trigger.href;
      continueLink.focus();
    }
  }

  function trapHomuraLaunchFocus(event) {
    const modal = document.querySelector("[data-homura-launch]");
    if (!modal || modal.hidden || event.key !== "Tab") return;

    const focusableElements = Array.from(
      modal.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hidden);

    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function ensureHomuraLaunchUi() {
    if (document.body.dataset.homuraLaunchReady === "true") return;
    document.body.dataset.homuraLaunchReady = "true";

    if (!document.querySelector("[data-homura-launch]")) {
      const modal = document.createElement("div");
      modal.className = "homura-launch";
      modal.dataset.homuraLaunch = "true";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "homuraLaunchTitle");
      modal.setAttribute("aria-describedby", "homuraLaunchCopy");
      modal.setAttribute("aria-hidden", "true");
      modal.hidden = true;
      modal.innerHTML = `
        <div class="homura-launch__dialog">
          <p class="homura-launch__eyebrow">Leaving The Main Site</p>
          <h2 class="homura-launch__title" id="homuraLaunchTitle">Continue to Homura or return to the main site?</h2>
          <p class="homura-launch__copy" id="homuraLaunchCopy">Homura opens as a dedicated chess app in a separate tab. If you leave this flow, the persistent player and other single-page site behavior stay behind on the main site tab.</p>
          <div class="homura-launch__actions">
            <button class="homura-launch__button" type="button" data-close-homura-launch>Return to site</button>
            <a class="homura-launch__button homura-launch__button--primary" href="https://homuraapp.elliewasaigenerated.workers.dev" target="_blank" rel="noopener noreferrer" data-homura-launch-continue>Continue to Homura</a>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          closeHomuraLaunchDialog();
        }
      });

      modal.querySelectorAll("[data-close-homura-launch]").forEach((button) => {
        button.addEventListener("click", () => closeHomuraLaunchDialog());
      });
    }

    document.addEventListener("keydown", (event) => {
      const modal = document.querySelector("[data-homura-launch]");
      if (!modal || modal.hidden) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeHomuraLaunchDialog();
        return;
      }

      trapHomuraLaunchFocus(event);
    });

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-homura-app-link]");
      if (!link) return;

      event.preventDefault();
      closeMobileNav();
      openHomuraLaunchDialog(link);
    });
  }

  function normalizePagePath(pathname) {
    if (!pathname || pathname === "/") return "/index.html";
    return pathname.endsWith("/") ? pathname + "index.html" : pathname;
  }

  function setPageCleanup(cleanup) {
    window.__ELLIE_PAGE_CLEANUP = typeof cleanup === "function" ? cleanup : null;
  }

  function runPageCleanup() {
    if (typeof window.__ELLIE_PAGE_CLEANUP === "function") {
      try {
        window.__ELLIE_PAGE_CLEANUP();
      } catch (error) {
        console.error("Page cleanup failed:", error);
      }
    }

    window.__ELLIE_PAGE_CLEANUP = null;
  }

  function ensurePersistentPlayer() {
    if (document.querySelector(".site-player")) return;

    const player = document.createElement("div");
    player.className = "site-player";
    player.setAttribute("aria-label", "Persistent music player");
    document.body.appendChild(player);
  }

  function closeMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (!toggle || !links) return;

    toggle.setAttribute("aria-expanded", "false");
    links.classList.remove("open");
  }

  function setupMobileNav() {
    if (document.body.dataset.mobileNavReady === "true") return;
    document.body.dataset.mobileNavReady = "true";

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest(".nav-toggle");
      if (!toggle) return;

      const links = document.querySelector(".nav-links");
      if (!links) return;

      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      links.classList.toggle("open");
    });
  }

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

      layer.style.transform = "translate3d(0, 0, 0) scale(1.06)";

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

        rafId = requestAnimationFrame(animate);
      }

      hero.addEventListener("mousemove", (event) => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        targetX = (x - 0.5) * 28;
        targetY = (y - 0.5) * 28;

        if (!rafId) {
          rafId = requestAnimationFrame(animate);
        }
      });

      hero.addEventListener("mouseleave", () => {
        targetX = 0;
        targetY = 0;

        if (!rafId) {
          rafId = requestAnimationFrame(animate);
        }
      });
    });
  }

  function updateActiveNav(pathname) {
    const currentPath = normalizePagePath(pathname);
    const currentOrigin = window.location.origin;

    document.querySelectorAll(".nav-links a").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      let targetPath = null;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== currentOrigin) {
          link.classList.remove("active");
          return;
        }

        targetPath = normalizePagePath(url.pathname);
      } catch (_error) {
        return;
      }

      link.classList.toggle("active", targetPath === currentPath);
    });
  }

  function syncHeadAssets(nextDocument, pageUrl) {
    document.head
      .querySelectorAll('link[rel="preconnect"], link[rel="stylesheet"], style[data-spa-head="true"], style:not([data-spa-static])')
      .forEach((node) => {
        if (node.matches('style[data-spa-static]')) return;
        node.remove();
      });

    Array.from(nextDocument.head.children).forEach((node) => {
      if (!node.matches('link[rel="preconnect"], link[rel="stylesheet"], style')) {
        return;
      }

      const clone = document.importNode(node, true);
      clone.dataset.spaHead = "true";

      if (clone.tagName === "LINK") {
        const href = clone.getAttribute("href");
        if (href) {
          clone.href = new URL(href, pageUrl).href;
        }
      }

      document.head.appendChild(clone);
    });
  }

  function applyPageMetadata(nextDocument) {
    if (nextDocument.title) {
      document.title = nextDocument.title;
    }

    if (nextDocument.documentElement.lang) {
      document.documentElement.lang = nextDocument.documentElement.lang;
    }

    const nextDescription = nextDocument.querySelector('meta[name="description"]');
    let currentDescription = document.querySelector('meta[name="description"]');

    if (nextDescription) {
      if (!currentDescription) {
        currentDescription = document.createElement("meta");
        currentDescription.name = "description";
        document.head.appendChild(currentDescription);
      }

      currentDescription.content = nextDescription.getAttribute("content") || "";
    } else if (currentDescription) {
      currentDescription.removeAttribute("content");
    }
  }

  function removeCurrentPageNodes() {
    const currentMain = document.body.querySelector("main");
    if (currentMain) currentMain.remove();

    Array.from(document.body.children)
      .filter((node) => node.matches && node.matches("footer.site-footer"))
      .forEach((footer) => footer.remove());
  }

  function removeDynamicInlineScripts() {
    document.querySelectorAll('script[data-spa-inline="true"]').forEach((script) => script.remove());
  }

  function swapPageContent(nextDocument) {
    const nextMain = nextDocument.querySelector("main");
    if (!nextMain) {
      throw new Error("Fetched page does not contain a <main> element.");
    }

    const insertionPoint = document.querySelector(".page-transition") || document.body.lastChild;

    removeCurrentPageNodes();

    const importedMain = document.importNode(nextMain, true);
    document.body.insertBefore(importedMain, insertionPoint);

    const topLevelFooter = Array.from(nextDocument.body.children).find(
      (node) => node.matches && node.matches("footer.site-footer")
    );

    if (topLevelFooter) {
      document.body.insertBefore(document.importNode(topLevelFooter, true), insertionPoint);
    }
  }

  function copyScriptAttributes(fromScript, toScript) {
    Array.from(fromScript.attributes).forEach((attribute) => {
      if (attribute.name === "src") return;
      toScript.setAttribute(attribute.name, attribute.value);
    });
  }

  async function runPageScripts(nextDocument, pageUrl) {
    setPageCleanup(null);
    removeDynamicInlineScripts();

    const scripts = Array.from(nextDocument.querySelectorAll("script"));

    for (const sourceScript of scripts) {
      const src = sourceScript.getAttribute("src");

      if (src) {
        const absoluteSrc = new URL(src, pageUrl).href;
        if (absoluteSrc.endsWith("/assets/js/main.js")) {
          continue;
        }

        if (loadedScriptSrcs.has(absoluteSrc)) {
          continue;
        }

        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          copyScriptAttributes(sourceScript, script);
          script.src = absoluteSrc;
          script.dataset.spaExternal = "true";
          script.addEventListener("load", resolve, { once: true });
          script.addEventListener("error", () => reject(new Error(`Failed to load ${absoluteSrc}`)), { once: true });
          document.body.appendChild(script);
        });

        loadedScriptSrcs.add(absoluteSrc);
        continue;
      }

      const inlineScript = document.createElement("script");
      copyScriptAttributes(sourceScript, inlineScript);
      inlineScript.dataset.spaInline = "true";

      if ((inlineScript.getAttribute("type") || "").toLowerCase() === "module") {
        inlineScript.textContent = sourceScript.textContent;
      } else {
        inlineScript.textContent = `(() => {
${sourceScript.textContent}
})();`;
      }

      document.body.appendChild(inlineScript);
    }
  }

  function playEnterAnimation() {
    document.body.classList.remove("is-transitioning");
    document.body.classList.add("is-entering");

    window.clearTimeout(enterAnimationTimer);
    enterAnimationTimer = window.setTimeout(() => {
      document.body.classList.remove("is-entering");
    }, 450);
  }

  function shouldHandleNavigation(link, event) {
    if (!link) return false;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return false;
    if (link.target === "_blank") return false;
    if (link.hasAttribute("download")) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.hash && normalizePagePath(url.pathname) === normalizePagePath(window.location.pathname)) return false;

    return /\.html?$/.test(url.pathname) || !url.pathname.split("/").pop().includes(".");
  }

  async function navigateTo(targetHref, options = {}) {
    const destination = new URL(targetHref, window.location.href);
    const sequence = ++navigationSequence;

    document.body.classList.add("is-transitioning");
    closeMobileNav();

    try {
      const response = await fetch(destination.href, { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(`Navigation failed with HTTP ${response.status}`);
      }

      const html = await response.text();
      if (sequence !== navigationSequence) return;

      const nextDocument = new DOMParser().parseFromString(html, "text/html");

      if (options.replaceState) {
        history.replaceState({ spa: true }, "", destination.href);
      } else {
        history.pushState({ spa: true }, "", destination.href);
      }

      runPageCleanup();
      syncHeadAssets(nextDocument, destination.href);
      swapPageContent(nextDocument);
      applyPageMetadata(nextDocument);
      updateActiveNav(destination.pathname);
      await runPageScripts(nextDocument, destination.href);

      if (sequence !== navigationSequence) return;

      if (options.scroll !== false) {
        window.scrollTo(0, 0);
      }

      setupHeroParallax(document);
      playEnterAnimation();
    } catch (error) {
      console.error("SPA navigation failed, falling back to full page load:", error);
      window.location.href = destination.href;
    } finally {
      if (sequence === navigationSequence) {
        document.body.classList.remove("is-transitioning");
      }
    }
  }

  function setupSpaNavigation() {
    if (document.body.dataset.spaReady === "true") return;
    document.body.dataset.spaReady = "true";

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!shouldHandleNavigation(link, event)) return;

      event.preventDefault();
      navigateTo(link.href);
    });

    window.addEventListener("popstate", () => {
      navigateTo(window.location.href, { replaceState: true, scroll: false });
    });
  }

  function boot() {
    ensurePersistentPlayer();
    ensureAnalyticsConsentUi();
    ensureEmbedConsentUi();
    ensureHomuraLaunchUi();
    setupMobileNav();
    setupSpaNavigation();
    setupHeroParallax(document);
    updateActiveNav(window.location.pathname);
    setPageCleanup(window.__ELLIE_PAGE_CLEANUP);
    history.replaceState({ spa: true }, "", window.location.href);
    playEnterAnimation();
    loadAnalytics();

    if (!hasSeenAnalyticsConsentThisSession()) {
      openAnalyticsConsentDialog();
    } else if (!hasSeenEmbedConsentThisSession()) {
      openEmbedConsentDialog();
    }

    import(new URL("assets/js/spotify-intf.js", window.location.href).toString())
      .then((module) => {
        module.initSpotifyPlayer();
      })
      .catch((error) => {
        console.error("Spotify player module failed to load:", error);
      });
  }

  boot();
})();
