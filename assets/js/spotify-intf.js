const PLAYER_CONFIG = {
  fallbackTrack: {
    id: "3ACgRmJStyjPbGyOeirKrA",
    title: "Dolori",
    artists: "Of The Trees",
    status: "Using the site fallback track.",
    url: "https://open.spotify.com/track/3ACgRmJStyjPbGyOeirKrA",
  },
};

const STORAGE_KEYS = {
  verifier: "ellie_spotify_pkce_verifier",
  state: "ellie_spotify_auth_state",
  returnPath: "ellie_spotify_return_path",
  tokens: "ellie_spotify_tokens",
  pinnedPlayer: "ellie_spotify_pinned_player",
  playerMenuCollapsed: "ellie_spotify_player_menu_collapsed",
};

let playerRoot = null;
let playerMode = "default";

function clearLegacySpotifyAuthState() {
  try {
    localStorage.removeItem(STORAGE_KEYS.tokens);
    sessionStorage.removeItem(STORAGE_KEYS.verifier);
    sessionStorage.removeItem(STORAGE_KEYS.state);
    sessionStorage.removeItem(STORAGE_KEYS.returnPath);
  } catch (_error) {
    // Ignore storage failures and keep the embed-only player usable.
  }
}

function getPinnedPlayer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.pinnedPlayer);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function storePinnedPlayer(state) {
  localStorage.setItem(STORAGE_KEYS.pinnedPlayer, JSON.stringify(state));
}

function clearPinnedPlayer() {
  localStorage.removeItem(STORAGE_KEYS.pinnedPlayer);
}

function emitPinnedPlayerChange(detail) {
  window.dispatchEvent(
    new CustomEvent("ellie:spotify-pinned-change", {
      detail,
    })
  );
}

function getStoredMenuCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEYS.playerMenuCollapsed) === "true";
  } catch (_error) {
    return false;
  }
}

function storeMenuCollapsed(isCollapsed) {
  try {
    localStorage.setItem(STORAGE_KEYS.playerMenuCollapsed, String(Boolean(isCollapsed)));
  } catch (_error) {
    // Ignore storage failures and keep the current session state only.
  }
}

function spotifyUriToOpenUrl(uri) {
  if (!uri || typeof uri !== "string") return "";
  const [scheme, type, id] = uri.split(":");
  if (scheme !== "spotify" || !type || !id) return "";
  return `https://open.spotify.com/${type}/${id}`;
}

function parseSpotifyUri(uri) {
  if (!uri || typeof uri !== "string") return null;
  const [scheme, type, id] = uri.split(":");
  if (scheme !== "spotify" || !type || !id) return null;
  return { provider: "spotify", type, id, uri };
}

function buildSoundCloudMiniPlayerUrl(trackUrl, apiTrackUrl = "") {
  const sourceUrl = apiTrackUrl || trackUrl;
  if (!sourceUrl) return "";

  const params = new URLSearchParams({
    url: sourceUrl,
    color: "#00ffff",
    inverse: "true",
    auto_play: "false",
    show_user: "true",
  });

  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

function defaultEmbedState() {
  return {
    provider: "spotify",
    type: "track",
    id: PLAYER_CONFIG.fallbackTrack.id,
  };
}

function normalizeEmbedState(state) {
  if (state?.provider === "soundcloud") {
    const url = state?.url || "";
    const apiTrackUrl = state?.apiTrackUrl || "";
    const customEmbedUrl = state?.customEmbedUrl || "";
    const isVisualEmbed = typeof state?.embedUrl === "string" && /(?:^|[?&])visual=true(?:&|$)/.test(state.embedUrl);
    return {
      provider: "soundcloud",
      id: state?.id || url || apiTrackUrl || customEmbedUrl || "soundcloud-track",
      embedUrl: customEmbedUrl || (!isVisualEmbed && state?.embedUrl ? state.embedUrl : buildSoundCloudMiniPlayerUrl(url, apiTrackUrl)),
      url,
      apiTrackUrl,
      customEmbedUrl,
    };
  }

  const type = state?.type === "playlist" ? "playlist" : "track";
  const id = state?.id || PLAYER_CONFIG.fallbackTrack.id;
  return {
    provider: "spotify",
    type,
    id,
  };
}

function embedUrlForState(state) {
  const embed = normalizeEmbedState(state);
  if (embed.provider === "soundcloud") {
    return embed.embedUrl || "";
  }

  return `https://open.spotify.com/embed/${embed.type}/${embed.id}?utm_source=generator&theme=0`;
}

function createPlayerIframe(className, src, options = {}) {
  const iframe = document.createElement("iframe");
  iframe.className = className;
  iframe.src = src;
  iframe.loading = "lazy";
  iframe.allow = options.allow || "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";

  if (options.width) iframe.width = options.width;
  if (options.height) iframe.height = String(options.height);
  if (options.scrolling) iframe.scrolling = options.scrolling;
  if (typeof options.frameBorder !== "undefined") iframe.frameBorder = String(options.frameBorder);

  return iframe;
}

function renderEmbedMount(mount, embed) {
  if (!mount) return;

  const desiredEmbedUrl = embedUrlForState(embed);
  const currentUrl = mount.dataset.embedSrc || "";
  const currentProvider = mount.dataset.embedProvider || "";
  const embedsAllowed = window.EllieEmbedConsent?.isAllowed?.() !== false;

  if (!embedsAllowed) {
    mount.dataset.embedSrc = desiredEmbedUrl;
    mount.dataset.embedProvider = embed.provider;
    mount.innerHTML = window.EllieEmbedConsent?.createPlaceholder?.({
      title: "Player embed disabled",
      body: "Accept third-party embeds to load Spotify or SoundCloud here.",
      compact: true,
    }) || "";
    return;
  }

  if (currentUrl === desiredEmbedUrl && currentProvider === embed.provider && mount.firstElementChild) {
    return;
  }

  mount.replaceChildren();
  mount.dataset.embedSrc = desiredEmbedUrl;
  mount.dataset.embedProvider = embed.provider;

  if (!desiredEmbedUrl) return;

  if (embed.provider === "soundcloud") {
    mount.appendChild(
      createPlayerIframe("site-player__embed site-player__embed--soundcloud", desiredEmbedUrl, {
        width: "100%",
        height: 80,
        scrolling: "no",
        frameBorder: 0,
        allow: "autoplay",
      })
    );
    return;
  }

  mount.appendChild(
    createPlayerIframe("site-player__embed", desiredEmbedUrl, {
      allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
    })
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusDuration(text) {
  const length = String(text || "").trim().length;
  return `${Math.max(12, length * 0.18)}s`;
}

function setStatusContent(node, text) {
  if (!node) return;

  const safeText = escapeHtml(text || PLAYER_CONFIG.fallbackTrack.status);
  const shouldScroll = safeText.length > 28;

  node.dataset.text = safeText;
  node.style.setProperty("--duration", statusDuration(safeText));
  node.classList.toggle("is-static", !shouldScroll);

  if (shouldScroll) {
    node.innerHTML = `
      <span class="scroll-segment">${safeText}</span>
      <span class="scroll-segment" aria-hidden="true">${safeText}</span>
    `;
  } else {
    node.innerHTML = `<span class="scroll-segment">${safeText}</span>`;
  }
}

function defaultState() {
  return {
    ...PLAYER_CONFIG.fallbackTrack,
    image: "",
    url: PLAYER_CONFIG.fallbackTrack.url,
    openLabel: "Open in Spotify",
    embed: defaultEmbedState(),
    mode: "default",
  };
}

function updatePlayer(state) {
  if (!playerRoot) return;

  const art = playerRoot.querySelector("[data-player-art]");
  const artImg = playerRoot.querySelector("[data-player-art-img]");
  const title = playerRoot.querySelector("[data-player-title]");
  const artist = playerRoot.querySelector("[data-player-artist]");
  const status = playerRoot.querySelector("[data-player-status]");
  const resume = playerRoot.querySelector("[data-player-resume]");
  const open = playerRoot.querySelector("[data-player-open]");
  const embedMount = playerRoot.querySelector("[data-player-embed]");
  const embed = normalizeEmbedState(state.embed);

  title.textContent = state.title || PLAYER_CONFIG.fallbackTrack.title;
  artist.textContent = state.artists || PLAYER_CONFIG.fallbackTrack.artists;
  setStatusContent(status, state.status || PLAYER_CONFIG.fallbackTrack.status);

  if (state.image) {
    artImg.src = state.image;
    artImg.alt = `${state.title} artwork`;
    artImg.hidden = false;
    art.classList.remove("site-player__art--empty");
    playerRoot.classList.remove("site-player--no-art");
  } else {
    artImg.removeAttribute("src");
    artImg.alt = "";
    artImg.hidden = true;
    art.classList.add("site-player__art--empty");
    playerRoot.classList.add("site-player--no-art");
  }

  open.href = state.url || PLAYER_CONFIG.fallbackTrack.url;
  open.textContent = state.openLabel || (embed.provider === "soundcloud" ? "Open in SoundCloud" : "Open in Spotify");
  playerRoot.classList.toggle("site-player--soundcloud", embed.provider === "soundcloud");

  if (embedMount) {
    renderEmbedMount(embedMount, embed);
  }

  resume.hidden = state.mode !== "manual";
}

function setPlayerMenuCollapsed(isCollapsed) {
  if (!playerRoot) return;

  playerRoot.classList.toggle("site-player--menu-collapsed", isCollapsed);
  const toggle = playerRoot.querySelector("[data-player-menu-toggle]");
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(!isCollapsed));
    toggle.textContent = isCollapsed ? "Player Menu" : "Hide";
  }

  storeMenuCollapsed(isCollapsed);
}

function togglePlayerMenu() {
  if (!playerRoot) return;
  setPlayerMenuCollapsed(!playerRoot.classList.contains("site-player--menu-collapsed"));
}

function refreshPlayer() {
  const pinnedPlayer = getPinnedPlayer();
  if (pinnedPlayer) {
    playerMode = "manual";
    updatePlayer({
      ...defaultState(),
      ...pinnedPlayer,
      embed: normalizeEmbedState(pinnedPlayer.embed),
      mode: "manual",
    });
    return;
  }

  playerMode = "default";
  updatePlayer({
    ...defaultState(),
    embed: defaultEmbedState(),
    mode: "default",
  });
}

function resumeDefaultPlayer() {
  clearPinnedPlayer();
  emitPinnedPlayerChange({ pinned: false });
  playerMode = "default";
  refreshPlayer();
}

function pinPersistentPlayer(state) {
  const pinnedState = {
    title: state?.title || PLAYER_CONFIG.fallbackTrack.title,
    artists: state?.artists || PLAYER_CONFIG.fallbackTrack.artists,
    status: state?.status || "Pinned from the music page.",
    url: state?.url || PLAYER_CONFIG.fallbackTrack.url,
    image: state?.image || "",
    openLabel: state?.openLabel || "Open in Spotify",
    embed: normalizeEmbedState(state?.embed),
  };

  storePinnedPlayer(pinnedState);
  emitPinnedPlayerChange({
    pinned: true,
    embed: pinnedState.embed,
  });
  playerMode = "manual";
  updatePlayer({
    ...defaultState(),
    ...pinnedState,
    mode: "manual",
  });
}

export function pinSpotifyPlayer(state) {
  pinPersistentPlayer({
    ...state,
    openLabel: state?.openLabel || "Open in Spotify",
    embed: {
      provider: "spotify",
      type: state?.embed?.type,
      id: state?.embed?.id,
    },
  });
}

export function pinSoundCloudPlayer(state) {
  pinPersistentPlayer({
    title: state?.title || "SoundCloud track",
    artists: state?.artists || "SoundCloud",
    status: state?.status || "Pinned from the Music page.",
    url: state?.url || "https://soundcloud.com",
    image: state?.image || "",
    openLabel: state?.openLabel || "Open in SoundCloud",
    embed: {
      provider: "soundcloud",
      id: state?.id || state?.url || state?.apiTrackUrl || state?.customEmbedUrl || "soundcloud-track",
      url: state?.url || "",
      apiTrackUrl: state?.apiTrackUrl || "",
      customEmbedUrl: state?.customEmbedUrl || "",
      embedUrl: state?.embedUrl || state?.customEmbedUrl || buildSoundCloudMiniPlayerUrl(state?.url || "", state?.apiTrackUrl || ""),
    },
  });
}

export async function syncSpotifyUriToPersistentPlayer(uri, options = {}) {
  const parsed = parseSpotifyUri(uri);
  if (!parsed) return;

  const fallbackLabel = parsed.type === "track" ? "Spotify track" : "Spotify playlist";

  pinSpotifyPlayer({
    title: options.title || fallbackLabel,
    artists: options.artists || fallbackLabel,
    status: options.status || "Following the active Spotify embed from the Music page.",
    url: spotifyUriToOpenUrl(uri) || options.url || PLAYER_CONFIG.fallbackTrack.url,
    image: options.image || "",
    embed: {
      type: parsed.type,
      id: parsed.id,
    },
  });
}

export function completeSpotifyAuthFlow() {
  clearLegacySpotifyAuthState();
  window.location.replace("./index.html");
  return Promise.resolve();
}

export function initSpotifyPlayer() {
  playerRoot = document.querySelector(".site-player");
  if (!playerRoot || playerRoot.dataset.spotifyReady === "true") return;

  clearLegacySpotifyAuthState();
  playerRoot.dataset.spotifyReady = "true";
  playerRoot.innerHTML = `
    <button class="site-player__menu-tab" type="button" data-player-menu-toggle aria-expanded="true">Hide</button>
    <div class="site-player__top">
      <div class="site-player__art site-player__art--empty" data-player-art>
        <img data-player-art-img alt="" hidden>
      </div>
      <div class="site-player__meta">
        <div class="site-player__eyebrow">Persistent Player</div>
        <div class="site-player__title" data-player-title>${PLAYER_CONFIG.fallbackTrack.title}</div>
        <div class="site-player__artist" data-player-artist>${PLAYER_CONFIG.fallbackTrack.artists}</div>
        <div class="scroll-container scroll-container--status">
          <div class="site-player__status scroll-track" data-player-status></div>
        </div>
      </div>
      <div class="site-player__actions">
        <button class="site-player__button" type="button" data-player-resume hidden>Default Track</button>
        <a class="site-player__link" data-player-open href="${PLAYER_CONFIG.fallbackTrack.url}" target="_blank" rel="noopener noreferrer">Open in Spotify</a>
      </div>
    </div>
    <div class="site-player__embed-host" data-player-embed></div>
  `;

  playerRoot
    .querySelector("[data-player-resume]")
    .addEventListener("click", () => resumeDefaultPlayer());
  playerRoot
    .querySelector("[data-player-menu-toggle]")
    .addEventListener("click", () => togglePlayerMenu());

  window.addEventListener("ellie:embed-consent-change", () => refreshPlayer());

  updatePlayer({ ...defaultState() });
  setPlayerMenuCollapsed(getStoredMenuCollapsed());
  refreshPlayer();
}
