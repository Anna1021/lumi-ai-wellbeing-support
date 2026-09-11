(function () {
  const user = window.SanaAuth && SanaAuth.currentUser();
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const HISTORY_LIMIT = 8;
  const MAX_CHARS = 2000;
  const historyKey = "sana_chat_history_" + user.username.toLowerCase();
  const trustedRoutes = new Set([
    "get-support.html#breathing",
    "get-support.html#grounding",
    "get-support.html#journal",
    "get-support.html#human-support",
    "emergency.html"
  ]);
  const chatWindow = document.getElementById("chatWindow");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const status = document.getElementById("chatStatus");
  const chips = document.getElementById("actionChips");
  const crisisCard = document.getElementById("crisisCard");
  let history = loadHistory();
  let sending = false;

  renderGreeting();
  history.forEach((item) => appendMessage(item.role, item.content));
  renderMoodContext();

  form.addEventListener("submit", sendMessage);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener("input", function () {
    document.getElementById("characterCount").textContent = input.value.length + " / " + MAX_CHARS;
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 132) + "px";
  });
  document.getElementById("newConversation").addEventListener("click", function () {
    history = [];
    sessionStorage.removeItem(historyKey);
    chatWindow.replaceChildren();
    chips.replaceChildren();
    status.textContent = "";
    crisisCard.classList.remove("is-visible");
    renderGreeting();
    input.focus();
  });

  async function sendMessage(event) {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || sending) return;
    if (message.length > MAX_CHARS) {
      showStatus("Please shorten your message to 2,000 characters.", "error");
      return;
    }

    const priorHistory = history.slice(-HISTORY_LIMIT);
    appendMessage("user", message);
    history.push({ role: "user", content: message });
    saveHistory();
    input.value = "";
    input.dispatchEvent(new Event("input"));
    chips.replaceChildren();
    showStatus("", "");

    const localSafety = assessSafety(message);
    if (localSafety !== "normal") {
      const reply = localCrisisResponse(localSafety);
      appendMessage("assistant", reply, true);
      history.push({ role: "assistant", content: reply });
      saveHistory();
      crisisCard.classList.add("is-visible");
      renderActions([{ label: "Emergency Resources", route: "emergency.html" }, { label: "Human Support", route: "get-support.html#human-support" }]);
      return;
    }

    setSending(true);
    const typing = appendTyping();
    const wakeTimer = window.setTimeout(() => {
      status.textContent = "Just a moment — SANA is waking up.";
    }, 1600);

    try {
      const payload = {
        message,
        history: priorHistory,
        user: { username: user.username, nickname: user.nickname },
        context: { recent_mood: getRecentMood() }
      };
      const result = await requestAI(payload);
      if (!result || !result.ok || !result.reply) throw new Error("invalid response");
      typing.remove();
      appendMessage("assistant", String(result.reply), result.safety !== "normal");
      history.push({ role: "assistant", content: String(result.reply) });
      history = history.slice(-HISTORY_LIMIT);
      saveHistory();
      renderActions(Array.isArray(result.actions) ? result.actions : []);
      if (result.safety && result.safety !== "normal") crisisCard.classList.add("is-visible");
    } catch (error) {
      typing.remove();
      appendMessage("assistant", "SANA is having trouble responding right now. Please try again in a moment.");
      showStatus("The AI service may be sleeping or unavailable. Emergency resources remain available.", "error");
    } finally {
      window.clearTimeout(wakeTimer);
      setSending(false);
    }
  }

  async function requestAI(payload) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 90000);
    try {
      const endpoint = window.SANA_AI_CONFIG && SANA_AI_CONFIG.endpoint || "/api/chat";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!response.ok) throw new Error("AI proxy unavailable");
      return response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function renderGreeting() {
    appendMessage("assistant", "Hello, " + user.nickname + " 👋\nHow are you feeling today?");
  }

  function appendMessage(role, content, safety) {
    const row = document.createElement("div");
    row.className = "message-row " + role;
    const avatar = document.createElement("div");
    if (role === "assistant") {
      avatar.className = "sana-mascot";
      avatar.setAttribute("aria-label", "SANA");
      avatar.appendChild(document.createElement("span"));
    } else {
      avatar.className = "user-chat-avatar";
      avatar.style.backgroundImage = "url('./image/lego.png')";
      avatar.setAttribute("aria-label", user.nickname);
    }
    const bubble = document.createElement("div");
    bubble.className = "message-bubble" + (safety ? " safety-message" : "");
    bubble.textContent = content;
    row.append(avatar, bubble);
    chatWindow.appendChild(row);
    scrollToLatest();
    return row;
  }

  function appendTyping() {
    const row = document.createElement("div");
    row.className = "message-row assistant typing-row";
    const avatar = document.createElement("div");
    avatar.className = "sana-mascot";
    avatar.appendChild(document.createElement("span"));
    const bubble = document.createElement("div");
    bubble.className = "message-bubble typing";
    bubble.setAttribute("aria-label", "SANA is responding");
    for (let index = 0; index < 3; index++) bubble.appendChild(document.createElement("i"));
    row.append(avatar, bubble);
    chatWindow.appendChild(row);
    scrollToLatest();
    return row;
  }

  function renderActions(actions) {
    chips.replaceChildren();
    actions.forEach((action) => {
      if (!action || !trustedRoutes.has(action.route)) return;
      const link = document.createElement("a");
      link.className = "action-chip";
      link.href = action.route;
      link.textContent = action.label;
      chips.appendChild(link);
    });
  }

  function renderMoodContext() {
    const mood = getRecentMood();
    const labels = {
      "very-low": ["😢", "Very low"],
      low: ["☹️", "Low"],
      neutral: ["😐", "Neutral"],
      good: ["🙂", "Good"],
      great: ["😄", "Great"]
    };
    if (!mood || !labels[mood]) return;
    document.getElementById("moodEmoji").textContent = labels[mood][0];
    document.getElementById("moodText").textContent = labels[mood][1] + " — selected in your latest check-in.";
  }

  function getRecentMood() {
    try { return localStorage.getItem("sana_recent_mood") || ""; } catch (error) { return ""; }
  }

  function assessSafety(message) {
    const text = message.toLowerCase().replace(/\s+/g, " ");
    const historical = /\b(used to|years? ago|in the past|historically|research|essay|assignment|my friend|a character)\b/.test(text);
    if (/\b(i am going to|i'm going to|i will|i plan to|about to) (kill myself|end my life|die|overdose)\b/.test(text) || /\b(can't|cannot) (stay|keep myself) safe\b/.test(text)) return "imminent";
    if (!historical && /\b(want to die|wish i were dead|suicidal|suicide|self[- ]?harm|hurt myself|better off dead)\b/.test(text)) return "concern";
    return "normal";
  }

  function localCrisisResponse(level) {
    return level === "imminent"
      ? "I’m really concerned that you may be in immediate danger. Please contact emergency services now, or go to a trusted person nearby and tell them you need help staying safe. Open SANA’s emergency resources below for verified options in your area—please don’t stay alone with this right now."
      : "Thank you for telling me. Your safety matters more than continuing an ordinary chat right now. Please reach out to someone you trust or a qualified support service and open SANA’s emergency resources below. If you might act soon or cannot stay safe, contact emergency services immediately.";
  }

  function setSending(value) {
    sending = value;
    sendButton.disabled = value;
    input.disabled = value;
  }
  function showStatus(text, type) { status.textContent = text; status.className = "chat-status " + (type || ""); }
  function scrollToLatest() { chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: "smooth" }); }
  function loadHistory() {
    try {
      const value = JSON.parse(sessionStorage.getItem(historyKey) || "[]");
      return Array.isArray(value) ? value.slice(-HISTORY_LIMIT).filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string") : [];
    } catch (error) { return []; }
  }
  function saveHistory() {
    try { sessionStorage.setItem(historyKey, JSON.stringify(history.slice(-HISTORY_LIMIT))); } catch (error) { /* session memory is optional */ }
  }
})();
