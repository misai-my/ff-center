(() => {
  "use strict";

  const GAME_URL = "minigames/gloo-rush/index.html";

  function buildLauncher() {
    if (document.getElementById("glooRushLauncher")) return;

    const launcher = document.createElement("button");
    launcher.id = "glooRushLauncher";
    launcher.className = "gloo-rush-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open Gloo Rush mini-game");
    launcher.setAttribute("title", "Open Gloo Rush");
    launcher.innerHTML = `
      <span class="gloo-rush-launcher-dot" aria-hidden="true"></span>
      <svg viewBox="0 0 32 44" fill="none" aria-hidden="true">
        <rect x="4" y="1.5" width="24" height="41" rx="6" stroke="currentColor" stroke-width="2.2"/>
        <path d="M12 5h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".7"/>
        <rect x="8" y="9" width="16" height="23" rx="3" fill="rgba(91,223,255,.12)" stroke="currentColor" stroke-width="1.5"/>
        <path d="M11 22h4m-2-2v4M19.5 20.5h.01M22 23h.01" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M14 36h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".75"/>
      </svg>`;

    const overlay = document.createElement("div");
    overlay.id = "glooRushOverlay";
    overlay.className = "gloo-rush-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Gloo Rush mini-game");
    overlay.innerHTML = `
      <section class="gloo-rush-shell">
        <button class="gloo-rush-close" id="glooRushClose" type="button" aria-label="Exit Gloo Rush and return to Data Center" title="Exit to Data Center">×</button>
        <iframe class="gloo-rush-frame" id="glooRushFrame" title="Gloo Rush mini-game" allow="fullscreen; autoplay" loading="lazy"></iframe>
      </section>`;

    document.body.append(launcher, overlay);

    const closeButton = overlay.querySelector("#glooRushClose");
    const frame = overlay.querySelector("#glooRushFrame");
    let previousFocus = null;

    const openGame = () => {
      previousFocus = document.activeElement;
      if (!frame.src || frame.src === "about:blank") frame.src = GAME_URL;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("gloo-rush-open");
      closeButton.focus({ preventScroll: true });
    };

    const closeGame = () => {
      if (!overlay.classList.contains("is-open")) return;
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("gloo-rush-open");
      frame.src = "about:blank";
      if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus({ preventScroll: true });
      else launcher.focus({ preventScroll: true });
    };

    launcher.addEventListener("click", openGame);
    closeButton.addEventListener("click", closeGame);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeGame();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) {
        event.preventDefault();
        closeGame();
      }
    });
    window.addEventListener("message", event => {
      if (event.source !== frame.contentWindow) return;
      if (event.data && event.data.type === "gloo-rush-exit") closeGame();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildLauncher, { once: true });
  else buildLauncher();
})();
