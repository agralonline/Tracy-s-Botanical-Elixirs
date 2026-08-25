/**
 * TRACY USA — AI chatbot widget (storefront)
 * ---------------------------------------------------------------------
 * A small floating chat button + panel, injected on every page from
 * main.js's bootstrapPage(). Talks to POST /api/chat (see
 * functions/_lib/chatHandler.js), which proxies the Anthropic API
 * server-side. If the server reports chat isn't configured yet
 * (GEMINI_API_KEY missing), the widget still opens but shows a
 * friendly "temporarily unavailable" message instead of erroring.
 */

import { t, onLocaleChange } from "/assets/js/i18n.js";

const history = []; // [{role: "user"|"assistant", content: string}]
let chatUnavailable = false;

function escapeHtml(str = "") {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function injectChatbot() {
  if (document.getElementById("chatbot-toggle")) return;

  const TEAL = "#5EEAD4";

  const toggle = document.createElement("button");
  toggle.id = "chatbot-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Chat");
  toggle.style.cssText = `position:fixed;bottom:1.25rem;right:1.25rem;z-index:60;width:52px;height:52px;border-radius:50%;background:${TEAL};border:none;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#0a0f1d;`;
  // Friendly robot-face mark (per the reference icon) instead of a speech bubble —
  // dark silhouette on the teal button, with the eyes/mouth "punched through"
  // in the button's own color so they read as cutouts rather than a flat glyph.
  toggle.innerHTML = `<svg width="27" height="27" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <line x1="8.5" y1="3.6" x2="8.5" y2="6.2" stroke="#0a0f1d" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="15.5" y1="3.6" x2="15.5" y2="6.2" stroke="#0a0f1d" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="8.5" cy="2.9" r="1" fill="#0a0f1d"/>
    <circle cx="15.5" cy="2.9" r="1" fill="#0a0f1d"/>
    <rect x="4" y="6.2" width="16" height="13" rx="5" fill="#0a0f1d"/>
    <circle cx="9" cy="12.3" r="1.6" fill="${TEAL}"/>
    <circle cx="15" cy="12.3" r="1.6" fill="${TEAL}"/>
    <rect x="9.3" y="15.6" width="5.4" height="1.5" rx="0.75" fill="${TEAL}"/>
  </svg>`;

  const panel = document.createElement("div");
  panel.id = "chatbot-panel";
  panel.className = "chatbot-panel";
  // Visibility is controlled purely via style.display in JS below (see the
  // toggle/close handlers), never via a "hidden" class. An earlier version
  // toggled a "hidden" class while ALSO setting "display:flex" inline —
  // inline styles always beat a class regardless of order, so the panel
  // never actually hid and the X button appeared to do nothing. Setting
  // element.style.display directly (with no competing inline display of
  // its own) avoids that trap entirely.
  panel.style.display = "none";
  panel.innerHTML = `
    <div class="glass-panel" style="display:flex;flex-direction:column;height:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.9rem 1rem;border-bottom:1px solid rgba(255,255,255,.08);">
        <span id="chatbot-title" class="heading-serif" style="font-size:1.1rem;color:var(--gold-soft);">Chat with us</span>
        <button id="chatbot-close" type="button" aria-label="Close" style="background:none;border:none;color:var(--ink-500);cursor:pointer;font-size:1.1rem;line-height:1;padding:.25rem;">&times;</button>
      </div>
      <div id="chatbot-messages" style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.6rem;font-size:.85rem;"></div>
      <form id="chatbot-form" style="display:flex;gap:.5rem;padding:.75rem;border-top:1px solid rgba(255,255,255,.08);">
        <input id="chatbot-input" type="text" class="input-glass" style="flex:1;" autocomplete="off" />
        <button id="chatbot-send" type="submit" class="btn-gold" style="white-space:nowrap;padding:.6rem 1rem;font-size:.8rem;"></button>
      </form>
    </div>`;

  document.body.append(toggle, panel);

  function addBubble(role, text) {
    const messagesEl = document.getElementById("chatbot-messages");
    const bubble = document.createElement("div");
    const isUser = role === "user";
    bubble.style.cssText = `align-self:${isUser ? "flex-end" : "flex-start"};max-width:85%;padding:.5rem .75rem;border-radius:.75rem;line-height:1.4;${isUser ? "background:var(--gold-dim);color:#0a0f1d;" : "background:rgba(255,255,255,.06);color:var(--ink-100);"}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function applyLabels() {
    document.getElementById("chatbot-title").textContent = t("chat_widget_title");
    document.getElementById("chatbot-input").placeholder = t("chat_placeholder");
    document.getElementById("chatbot-send").textContent = t("chat_send");
  }
  applyLabels();
  onLocaleChange(applyLabels);

  function isOpen() {
    return panel.style.display !== "none";
  }
  function openPanel() {
    panel.style.display = "flex";
    if (!greeted) {
      greeted = true;
      addBubble("assistant", t("chat_greeting"));
    }
    document.getElementById("chatbot-input").focus();
  }
  function closePanel() {
    panel.style.display = "none";
  }

  let greeted = false;
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isOpen()) closePanel();
    else openPanel();
  });
  document.getElementById("chatbot-close").addEventListener("click", closePanel);

  // Tap/click anywhere outside the open panel (the backdrop) closes it —
  // same pattern as the mobile nav menu.
  document.addEventListener("click", (e) => {
    if (!isOpen()) return;
    if (panel.contains(e.target) || toggle.contains(e.target)) return;
    closePanel();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) closePanel();
  });

  document.getElementById("chatbot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (chatUnavailable) {
      addBubble("assistant", t("chat_unavailable"));
      return;
    }
    const input = document.getElementById("chatbot-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addBubble("user", text);
    history.push({ role: "user", content: text });

    const sendBtn = document.getElementById("chatbot-send");
    sendBtn.disabled = true;
    const typingBubble = addBubble("assistant", "…");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (res.status === 503) {
        chatUnavailable = true;
        typingBubble.textContent = t("chat_unavailable");
        return;
      }
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      typingBubble.textContent = data.reply;
      history.push({ role: "assistant", content: data.reply });
    } catch (err) {
      typingBubble.textContent = t("chat_unavailable");
      chatUnavailable = true;
    } finally {
      sendBtn.disabled = false;
    }
  });
}
