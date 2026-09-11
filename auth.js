(function () {
  const USERS_KEY = "sana_users";
  const SESSION_KEY = "sana_current_user";
  const DEV_AUTO_LOGIN_DISABLED_KEY = "sana_dev_auto_login_disabled";
  const DEV_USERNAME_KEY = "sana_dev_username";


  function getUsers() {
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      return Array.isArray(users)
        ? users.filter((user) => user && typeof user.username === "string")
        : [];
    } catch (error) {
      return [];
    }
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return true;
    } catch (error) {
      return false;
    }
  }

  function ensureAdmin() { /* Static demo accounts are created through Sign Up. */ }

  function findUser(username) {
    return getUsers().find(
      (user) => user.username.toLowerCase() === username.trim().toLowerCase()
    );
  }

  function isLocalDevelopmentHost() {
    return typeof window !== "undefined" && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  }

  function createSession(user) {
    const session = { username: user.username, nickname: user.nickname, role: user.role };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    } catch (error) {
      return null;
    }
  }

  function restoreDevelopmentSession() {
    if (!isLocalDevelopmentHost()) return null;
    try {
      if (localStorage.getItem(DEV_AUTO_LOGIN_DISABLED_KEY) === "true") return null;
      const configuredUsername = localStorage.getItem(DEV_USERNAME_KEY);
      if (!configuredUsername) return null;
      const user = findUser(configuredUsername);
      return user ? createSession(user) : null;
    } catch (error) {
      return null;
    }
  }

  function register(user) {
    if (findUser(user.username)) {
      return { ok: false, message: "This username is already registered." };
    }
    const users = getUsers();
    users.push({ ...user, role: "user" });
    if (!saveUsers(users)) {
      return { ok: false, message: "Your browser could not save this account. Please allow site storage and try again." };
    }
    return { ok: true };
  }

  function login(username, password) {
    const user = findUser(username);
    if (!user || user.password !== password) return null;
    try {
      localStorage.removeItem(DEV_AUTO_LOGIN_DISABLED_KEY);
    } catch (error) { /* Optional development preference. */ }
    return createSession(user);
  }

  function currentUser() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (session && findUser(session.username)) return session;
      sessionStorage.removeItem(SESSION_KEY);
      return restoreDevelopmentSession();
    } catch (error) {
      return restoreDevelopmentSession();
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    if (isLocalDevelopmentHost()) {
      try { localStorage.setItem(DEV_AUTO_LOGIN_DISABLED_KEY, "true"); } catch (error) { /* Storage is optional. */ }
    }
  }

  function replaceHomeNavbarWithSharedComponent() {
    const existing = document.querySelector(".home-refined .home-nav");
    if (!existing) return;
    const mount = () => {
      if (!window.SanaComponents || !existing.isConnected) return;
      const host = document.createElement("div");
      host.dataset.sanaNavbar = "";
      host.dataset.activePage = "home";
      host.innerHTML = window.SanaComponents.createNavbar("home");
      existing.replaceWith(host);
    };
    if (window.SanaComponents) return mount();
    const script = document.createElement("script");
    script.src = "components/navbar.js";
    script.onload = mount;
    document.head.appendChild(script);
  }

  ensureAdmin();
  replaceHomeNavbarWithSharedComponent();
  window.SanaAuth = { register, login, currentUser, logout, isLocalDevelopmentHost };
})();
