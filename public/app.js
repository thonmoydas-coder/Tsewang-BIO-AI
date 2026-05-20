// ============================================================
// CHAT FRONTEND
// ============================================================
// Sends each user message + the running history to /api/chat,
// reads the streamed Server-Sent Events response, and types
// the AI reply into the page chunk-by-chunk.
//
// You usually don't need to change this file. The look-and-feel
// lives in styles.css; the AI's personality lives in api/chat.js.
// ============================================================

const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("composer");
const inputEl = document.getElementById("composer-input");
const sendBtn = document.getElementById("composer-send");

// Running conversation history. Each entry: { role, text }.
const history = [];

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = inputEl.value.trim();
  await sendPrompt(text);
});

async function sendPrompt(text) {
  if (!text) return;
  inputEl.value = "";
  setBusy(true);

  appendMessage("user", text);
  history.push({ role: "user", text });

  const aiBubble = appendMessage("assistant", "", { streaming: true });

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => "");
      throw new Error(errText || `Request failed (${response.status})`);
    }

    let assistantText = "";
    for await (const event of readSseStream(response.body)) {
      if (event === "[DONE]") break;
      let payload;
      try {
        payload = JSON.parse(event);
      } catch {
        continue;
      }
      if (payload.error) throw new Error(payload.error);
      if (payload.text) {
        assistantText += payload.text;
        aiBubble.textContent = assistantText;
        scrollToBottom();
      }
    }

    history.push({ role: "assistant", text: assistantText });
  } catch (err) {
    aiBubble.textContent = `⚠️ ${err.message}`;
  } finally {
    aiBubble.parentElement.classList.remove("is-streaming");
    setBusy(false);
    inputEl.focus();
  }
}

function sendPreset(text) {
  inputEl.value = text;
  sendPrompt(text);
}

function setBusy(busy) {
  inputEl.disabled = busy;
  sendBtn.disabled = busy;
  sendBtn.textContent = busy ? "..." : "Send";
}

function appendMessage(role, text, { streaming = false } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = `message message-${role === "assistant" ? "ai" : "user"}`;
  if (streaming) wrapper.classList.add("is-streaming");

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;
  wrapper.appendChild(bubble);

  messagesEl.appendChild(wrapper);
  scrollToBottom();
  return bubble;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Async iterator that yields each `data:` payload from an SSE stream.
async function* readSseStream(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const dataLine = frame
        .split("\n")
        .find((l) => l.startsWith("data: "));
      if (dataLine) yield dataLine.slice(6);
    }
  }
}

// Function to clear splash screen and load the main view
function enterApp() {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('hidden');
  }
}

// Sakura Spawner
function createPetals() {
  const petalSymbols = ['🌸', '✨', '🌸', '💮'];
  setInterval(() => {
    const petal = document.createElement('div');
    petal.classList.add('petal');
    petal.innerText = petalSymbols[Math.floor(Math.random() * petalSymbols.length)];
    petal.style.left = Math.random() * 100 + 'vw';
    petal.style.animationDuration = Math.random() * 5 + 5 + 's'; // Between 5s and 10s
    petal.style.opacity = Math.random() * 0.6 + 0.2;
    petal.style.fontSize = Math.random() * 15 + 12 + 'px';
    document.body.appendChild(petal);
    // Clean up after it falls
    setTimeout(() => petal.remove(), 11000);
  }, 800);
}

// AP Bio Countdown Clock
// Initialization Progress Bar & EST Countdown Engine
function initBioBloomEngine() {
  const progress = document.getElementById('loading-progress');
  const statusText = document.getElementById('loading-status');
  const splash = document.getElementById('splash-screen');
  
  let width = 0;
  const phrases = [
    "Compiling Unit Weightings... 📈",
    "Calibrating BioBloom ✿... 🌸",
    "Generating practice cards... 🧬",
    "Syncing Gemini Brain... 🧠",
    "Ready to absolute ace this exam! ✨"
  ];

  // 1. Loading Bar Animation
  const loader = setInterval(() => {
    width += 2;
    if (progress) progress.style.width = width + '%';

    if (statusText) {
      if (width < 25) statusText.innerText = phrases[0];
      else if (width < 50) statusText.innerText = phrases[1];
      else if (width < 75) statusText.innerText = phrases[2];
      else if (width < 95) statusText.innerText = phrases[3];
      else statusText.innerText = phrases[4];
    }

    if (width >= 100) {
      clearInterval(loader);
      setTimeout(() => {
        if (splash) splash.classList.add('hidden');
      }, 350);
    }
  }, 35);

  // 2. Exact 8:00 AM EST Exam Countdown Timer
  function startExamTimer() {
    // Target: May 20, 2026 08:00:00 AM Eastern Daylight Time (UTC-4)
    const targetEST = new Date("2026-05-20T08:00:00-04:00").getTime();

    setInterval(() => {
      const now = new Date().getTime();
      const difference = targetEST - now;

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const display = document.getElementById('countdown-timer');
      if (display) {
        if (difference <= 0) {
          display.innerText = "🌸 THE EXAM HAS STARTED! YOU CHRUSHED THIS! 🌸";
        } else {
          display.innerText = `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        }
      }
    }, 1000);
  }
  startExamTimer();
}

// Boot up engines on load
window.addEventListener('DOMContentLoaded', () => {
  try { createPetals(); } catch (e) {}
  try { initBioBloomEngine(); } catch (e) {}
});
