import mineflayer from "mineflayer";
import { logger } from "./logger";

const HOST = "FriendsMasterHub.aternos.me";
const PORT = 19276;
const BOT_USERNAME = "ChorwaAadmi";
const MC_VERSION = "1.21.1";

// AFK kick threshold: Aternos default is ~5 min; we move every 45s to stay safe
const ANTI_AFK_INTERVAL_MS = 45_000;
// Chat interval: every 4 minutes
const CHAT_INTERVAL_MS = 4 * 60 * 1000;

interface BotState {
  connected: boolean;
  username: string;
  health: number | null;
  food: number | null;
  position: { x: number; y: number; z: number } | null;
  pingMs: number | null;
  startTime: number | null;
  activityLog: string[];
  onlinePlayers: Set<string>;
}

const state: BotState = {
  connected: false,
  username: BOT_USERNAME,
  health: null,
  food: null,
  position: null,
  pingMs: null,
  startTime: null,
  activityLog: [],
  onlinePlayers: new Set(),
};

let bot: ReturnType<typeof mineflayer.createBot> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let afkTimer: NodeJS.Timeout | null = null;
let chatTimer: NodeJS.Timeout | null = null;
let posTimer: NodeJS.Timeout | null = null;

const CHAT_MESSAGES = [
  "Having fun building today?",
  "Check out our website for build submissions!",
  "Nice builds everyone! Keep it up!",
  "Who wants to explore together?",
  "FriendsMasterHub — where friends build together!",
  "Don't forget to submit your builds on the website!",
  "Anyone need help with their build?",
  "The community here is awesome!",
];

function addLog(msg: string) {
  const time = new Date().toLocaleTimeString();
  state.activityLog.unshift(`[${time}] ${msg}`);
  if (state.activityLog.length > 50) state.activityLog.length = 50;
  logger.info({ botActivity: msg }, "Bot activity");
}

function clearTimers() {
  if (afkTimer) { clearInterval(afkTimer); afkTimer = null; }
  if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
  if (posTimer) { clearInterval(posTimer); posTimer = null; }
}

function scheduleReconnect(delayMs = 15_000) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => createBot(), delayMs);
}

// ── Anti-AFK: runs every 45 seconds, always does something ───────────────────
let afkTick = 0;
function doAntiAfk() {
  if (!bot || !state.connected) return;
  afkTick++;

  const phase = afkTick % 4;
  try {
    if (phase === 0) {
      // Walk forward then stop
      bot.setControlState("forward", true);
      setTimeout(() => bot?.setControlState("forward", false), 1200);
      addLog("Anti-AFK: walked forward");
    } else if (phase === 1) {
      // Jump
      bot.setControlState("jump", true);
      setTimeout(() => bot?.setControlState("jump", false), 600);
      addLog("Anti-AFK: jumped");
    } else if (phase === 2) {
      // Look in a random direction
      const yaw = (Math.random() * Math.PI * 2) - Math.PI;
      const pitch = (Math.random() - 0.5) * 0.8;
      bot.look(yaw, pitch, false).catch(() => {});
      addLog("Anti-AFK: looked around");
    } else {
      // Sneak briefly
      bot.setControlState("sneak", true);
      setTimeout(() => bot?.setControlState("sneak", false), 800);
      addLog("Anti-AFK: crouched");
    }
  } catch {
    // silently ignore if bot can't act right now
  }
}

function startActions() {
  clearTimers();
  afkTick = 0;

  // Anti-AFK: fire immediately then every 45 seconds
  doAntiAfk();
  afkTimer = setInterval(doAntiAfk, ANTI_AFK_INTERVAL_MS);

  // Chat: every 4 minutes, random message
  let chatIdx = Math.floor(Math.random() * CHAT_MESSAGES.length);
  chatTimer = setInterval(() => {
    if (!bot || !state.connected) return;
    try {
      bot.chat(CHAT_MESSAGES[chatIdx % CHAT_MESSAGES.length]);
      addLog(`Said: "${CHAT_MESSAGES[chatIdx % CHAT_MESSAGES.length]}"`);
      chatIdx++;
    } catch {}
  }, CHAT_INTERVAL_MS);

  // Position tracker
  posTimer = setInterval(() => {
    if (!bot?.entity) return;
    const pos = bot.entity.position;
    state.position = {
      x: Math.round(pos.x * 10) / 10,
      y: Math.round(pos.y * 10) / 10,
      z: Math.round(pos.z * 10) / 10,
    };
    state.health = bot.health ?? null;
    state.food = bot.food ?? null;
  }, 5000);
}

function isAfkKick(reason: string): boolean {
  const lower = reason.toLowerCase();
  return (
    lower.includes("afk") ||
    lower.includes("idle") ||
    lower.includes("inactiv") ||
    lower.includes("too long") ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  );
}

function createBot() {
  if (bot) {
    try { bot.quit(); } catch {}
    bot = null;
  }
  clearTimers();
  state.connected = false;
  state.onlinePlayers.clear();

  addLog(`Connecting to ${HOST}:${PORT}...`);

  try {
    bot = mineflayer.createBot({
      host: HOST,
      port: PORT,
      username: BOT_USERNAME,
      version: MC_VERSION,
      auth: "offline",
      checkTimeoutInterval: 60_000,
      // keep-alive so connection doesn't drop silently
      keepAlive: true,
    });

    bot.once("spawn", () => {
      state.connected = true;
      state.startTime = Date.now();
      addLog("Connected and spawned!");
      startActions();
    });

    bot.on("playerJoined", (player) => {
      state.onlinePlayers.add(player.username);
    });

    bot.on("playerLeft", (player) => {
      state.onlinePlayers.delete(player.username);
    });

    bot.on("chat", (username, message) => {
      if (username !== BOT_USERNAME) {
        addLog(`<${username}> ${message}`);
      }
    });

    bot.on("health", () => {
      state.health = bot?.health ?? null;
      state.food = bot?.food ?? null;
    });

    // Respect respawn so bot doesn't stay dead (dead bots look inactive)
    bot.on("death", () => {
      addLog("Died — respawning...");
      try { bot?.respawn(); } catch {}
    });

    bot.on("kicked", (reason) => {
      state.connected = false;
      clearTimers();
      const raw = typeof reason === "string" ? reason : JSON.stringify(reason);
      const delay = isAfkKick(raw) ? 5_000 : 20_000;
      addLog(`Kicked: ${raw.slice(0, 120)}. Reconnecting in ${delay / 1000}s...`);
      scheduleReconnect(delay);
    });

    bot.on("end", (reason) => {
      state.connected = false;
      clearTimers();
      addLog(`Connection ended (${reason ?? "unknown"}). Reconnecting in 15s...`);
      scheduleReconnect(15_000);
    });

    bot.on("error", (err) => {
      state.connected = false;
      clearTimers();
      const msg = (err as Error).message || String(err);
      // ECONNRESET / ETIMEDOUT → server offline, wait longer
      const delay = msg.includes("ECONNREFUSED") || msg.includes("getaddrinfo") ? 60_000 : 20_000;
      addLog(`Error: ${msg}. Reconnecting in ${delay / 1000}s...`);
      scheduleReconnect(delay);
    });
  } catch (err) {
    addLog(`Failed to create bot: ${(err as Error).message}. Retrying in 30s...`);
    scheduleReconnect(30_000);
  }
}

export function getBotStatus() {
  const uptime = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : null;
  return {
    connected: state.connected,
    username: state.username,
    health: state.health,
    food: state.food,
    position: state.position,
    pingMs: state.pingMs,
    uptime,
    activityLog: state.activityLog.slice(0, 20),
  };
}

export function startBot() {
  addLog("Bot service starting...");
  createBot();
}
