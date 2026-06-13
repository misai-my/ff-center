(() => {
  "use strict";

  const GAME_URL = "minigames/card-arena/index.html";

  function getCurrentDataCenterUser() {
    try {
      if (window.FFDC_CURRENT_USER) return window.FFDC_CURRENT_USER;
      if (window.currentUser) return window.currentUser;
      for (const key of Object.keys(localStorage)) {
        if (!key.includes("auth-token") && !key.includes("supabase")) continue;
        const raw = localStorage.getItem(key);
        if (!raw || !raw.includes("access_token")) continue;
        const parsed = JSON.parse(raw);
        const user = parsed?.user || parsed?.currentSession?.user || parsed?.session?.user;
        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.full_name || user.email
          };
        }
      }
    } catch {}
    return null;
  }

  function buildLauncher() {
    if (document.getElementById("cardArenaLauncher")) return;

    const launcher = document.createElement("button");
    launcher.id = "cardArenaLauncher";
    launcher.className = "card-arena-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open Card Arena mini-game");
    launcher.setAttribute("title", "Open Card Arena");
    launcher.innerHTML = `
      <span class="card-arena-launcher-dot" aria-hidden="true"></span>
      <span class="card-arena-launcher-icon" aria-hidden="true"></span>`;

    const overlay = document.createElement("div");
    overlay.id = "cardArenaOverlay";
    overlay.className = "card-arena-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Card Arena mini-game");
    overlay.innerHTML = `
      <section class="card-arena-shell">
        <button class="card-arena-close" id="cardArenaClose" type="button" aria-label="Exit Card Arena and return to Data Center" title="Exit to Data Center">×</button>
        <iframe class="card-arena-frame" id="cardArenaFrame" title="Card Arena mini-game" allow="fullscreen; autoplay" loading="lazy"></iframe>
      </section>`;

    document.body.append(launcher, overlay);

    const closeButton = overlay.querySelector("#cardArenaClose");
    const frame = overlay.querySelector("#cardArenaFrame");
    let previousFocus = null;

    const postUserToFrame = () => {
      const user = getCurrentDataCenterUser();
      if (!user || !frame.contentWindow) return;
      frame.contentWindow.postMessage({ type: "ffdc-user", user }, "*");
    };

    const openGame = () => {
      previousFocus = document.activeElement;
      if (!frame.src || frame.src === "about:blank") frame.src = GAME_URL;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("card-arena-open");
      closeButton.focus({ preventScroll: true });
      window.setTimeout(postUserToFrame, 400);
    };

    const closeGame = () => {
      if (!overlay.classList.contains("is-open")) return;
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("card-arena-open");
      frame.src = "about:blank";
      if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus({ preventScroll: true });
      else launcher.focus({ preventScroll: true });
    };

    launcher.addEventListener("click", openGame);
    closeButton.addEventListener("click", closeGame);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeGame();
    });
    frame.addEventListener("load", postUserToFrame);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) {
        event.preventDefault();
        closeGame();
      }
    });
    window.addEventListener("message", event => {
      if (event.source !== frame.contentWindow) return;
      if (event.data && event.data.type === "card-arena-exit") closeGame();
      if (event.data && event.data.type === "card-arena-ready") postUserToFrame();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildLauncher, { once: true });
  else buildLauncher();
})();
