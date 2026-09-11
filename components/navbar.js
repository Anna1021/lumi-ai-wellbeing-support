(function () {
  const icons = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></svg>',
    mood: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h3l2-7 4 14 3-9 2 2h4"/></svg>',
    community: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    support: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5M4.9 4.9l2.2 2.2m9.8 0 2.2-2.2"/></svg>'
  };
  const links = [["home", "Home", "SANA.html"], ["mood", "Mood", "mood.html"], ["community", "Community", "community.html"], ["support", "Support", "get-support.html"]];
  function createNavbar(activePage = "") {
    const pageClass = activePage === "home" ? " home-nav" : activePage === "community" ? " community-nav" : "";
    const items = links.map(([id, label, href]) => `<a class="sana-nav-link ${id === activePage ? "is-active" : ""}" ${id === activePage ? "aria-current=\"page\"" : ""} href="${href}">${icons[id]}<span>${label}</span></a>`).join("");
    const logo = '<span class="sana-brand-mark sana-brand-symbol" aria-hidden="true"><svg viewBox="0 0 48 48"><defs><linearGradient id="sanaLogoGradient" x1="8" y1="6" x2="39" y2="42" gradientUnits="userSpaceOnUse"><stop stop-color="#78c9ff"/><stop offset=".55" stop-color="#b7b8ff"/><stop offset="1" stop-color="#ffb6d1"/></linearGradient></defs><path fill="url(#sanaLogoGradient)" d="M24 8c7.5 0 13.7 5.9 13.7 13.2S31.5 39 24 39 10.3 28.5 10.3 21.2 16.5 8 24 8Z"/><circle cx="30.7" cy="16.4" r="5.3" fill="#fff" fill-opacity=".78"/></svg></span>';
    return `<header class="sana-nav sana-shared-nav${pageClass}"><a class="sana-brand" href="SANA.html">${logo}<span class="sana-brand-name">SANA</span></a><nav class="sana-nav-links" aria-label="Primary navigation">${items}</nav><a href="profile.html" aria-label="Open profile"><img src="./image/lego.png" class="sana-avatar" alt="Open profile"></a></header>`;
  }
  window.SanaComponents = { createNavbar };
  document.querySelectorAll("[data-sana-navbar]").forEach((node) => { node.innerHTML = createNavbar(node.dataset.activePage || ""); });
})();
