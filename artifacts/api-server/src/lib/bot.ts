import mineflayer from "mineflayer";
import { logger } from "./logger";

const HOST = "FriendsMasterHub.aternos.me";
const PORT = 19276;
const BOT_USERNAME = "ChorwaAadmi";
const MC_VERSION = "1.21.1";

// Movement: change direction every 4s, jump every 12s, sneak every 20s
const MOVE_CHANGE_MS   = 4_000;
const JUMP_INTERVAL_MS = 12_000;
const SNEAK_INTERVAL_MS = 20_000;
const CHAT_INTERVAL_MS  = 4 * 60 * 1000;  // 4 minutes

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

// Movement timers
let moveTimer:  NodeJS.Timeout | null = null;
let jumpTimer:  NodeJS.Timeout | null = null;
let sneakTimer: NodeJS.Timeout | null = null;
let chatTimer:  NodeJS.Timeout | null = null;
let posTimer:   NodeJS.Timeout | null = null;

// Guard: prevent kicked + end both scheduling a reconnect
let reconnectScheduled = false;

const DIRS: Array<"forward" | "back" | "left" | "right"> = ["forward", "back", "left", "right"];
let dirIdx = 0;

const CHAT_MESSAGES = [
  "Having fun building today?",
  "Check out our website for build submissions!",
  "Nice builds everyone! Keep it up!",
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

function clearMovementTimers() {
  if (moveTimer)  { clearInterval(moveTimer);  moveTimer  = null; }
  if (jumpTimer)  { clearInterval(jumpTimer);  jumpTimer  = null; }
  if (sneakTimer) { clearInterval(sneakTimer); sneakTimer = null; }
  if (chatTimer)  { clearInterval(chatTimer);  chatTimer  = null; }
  if (posTimer)   { clearInterval(posTimer);   posTimer   = null; }

  // Release all control states so the bot doesn't get stuck walking
  if (bot) {
    try {
      for (const s of DIRS) bot.setControlState(s, false);
      bot.setControlState("jump",  false);
      bot.setControlState("sneak", false);
    } catch {}
  }
}

function scheduleReconnect(delayMs: number) {
  if (reconnectScheduled) return;
  reconnectScheduled = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectScheduled = false;
    createBot();
  }, delayMs);
}

// ── Constant WASD movement loop ───────────────────────────────────────────────
function startMovement() {
  clearMovementTimers();
  dirIdx = 0;

  // Start walking in the first direction immediately
  function applyDir() {
    if (!bot || !state.connected) return;
    try {
      // Release old direction
      for (const d of DIRS) bot.setControlState(d, false);
      // Cycle through: forward → right → back → left → repeat
      const dir = DIRS[dirIdx % DIRS.length];
      dirIdx++;
      bot.setControlState(dir, true);
      // Look in the movement direction for realism
      const yaw = (dirIdx % 4) * (Math.PI / 2);
      bot.look(yaw, 0, false).catch(() => {});
      addLog(`Moving ${dir}`);
    } catch {}
  }

  applyDir();
  moveTimer = setInterval(applyDir, MOVE_CHANGE_MS);

  // Jump every 12 seconds
  jumpTimer = setInterval(() => {
    if (!bot || !state.connected) return;
    try {
      bot.setControlState("jump", true);
      setTimeout(() => bot?.setControlState("jump", false), 500);
      addLog("Jumped");
    } catch {}
  }, JUMP_INTERVAL_MS);

  // Sneak briefly every 20 seconds
  sneakTimer = setInterval(() => {
    if (!bot || !state.connected) return;
    try {
      bot.setControlState("sneak", true);
      setTimeout(() => bot?.setControlState("sneak", false), 800);
      addLog("Sneaked");
    } catch {}
  }, SNEAK_INTERVAL_MS);

  // Chat every 4 minutes
  let chatIdx = 0;
  chatTimer = setInterval(() => {
    if (!bot || !state.connected) return;
    try {
      const msg = CHAT_MESSAGES[chatIdx % CHAT_MESSAGES.length];
      bot.chat(msg);
      addLog(`Said: "${msg}"`);
      chatIdx++;
    } catch {}
  }, CHAT_INTERVAL_MS);

  // Position + stats every 5s
  posTimer = setInterval(() => {
    if (!bot?.entity) return;
    const pos = bot.entity.position;
    state.position = {
      x: Math.round(pos.x * 10) / 10,
      y: Math.round(pos.y * 10) / 10,
      z: Math.round(pos.z * 10) / 10,
    };
    state.health = bot.health ?? null;
    state.food   = bot.food   ?? null;
  }, 5000);
}

function isDuplicateLogin(reason: string) {
  return reason.includes("duplicate_login");
}

function isServerOffline(reason: string) {
  const r = reason.toLowerCase();
  return r.includes("econnrefused") || r.includes("getaddrinfo") || r.includes("enotfound");
}

// ── Create / destroy bot ──────────────────────────────────────────────────────
function createBot() {
  // Fully destroy old instance — remove ALL listeners first to prevent
  // stale event handlers firing and scheduling a second reconnect
  if (bot) {
    try { bot.removeAllListeners(); } catch {}
    try { bot.quit(); }               catch {}
    bot = null;
  }
  clearMovementTimers();

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
      keepAlive: true,
    });

    // ── Spawn ──────────────────────────────────────────────────────────────
    bot.once("spawn", () => {
      state.connected = true;
      state.startTime = Date.now();
      addLog("Connected and spawned! Starting movement...");
      startMovement();
    });

    // ── Players ────────────────────────────────────────────────────────────
    bot.on("playerJoined", (player) => {
      state.onlinePlayers.add(player.username);
    });
    bot.on("playerLeft", (player) => {
      state.onlinePlayers.delete(player.username);
    });

    // ── Chat ───────────────────────────────────────────────────────────────
    bot.on("chat", (username, message) => {
      if (username !== BOT_USERNAME) addLog(`<${username}> ${message}`);
    });

    // ── Health ─────────────────────────────────────────────────────────────
    bot.on("health", () => {
      state.health = bot?.health ?? null;
      state.food   = bot?.food   ?? null;
    });

    // ── Death: respawn immediately ─────────────────────────────────────────
    bot.on("death", () => {
      addLog("Died — respawning...");
      try { bot?.respawn(); } catch {}
    });

    // ── Kicked ─────────────────────────────────────────────────────────────
    // NOTE: 'end' always fires after 'kicked', so we handle reconnect ONLY
    // here and set reconnectScheduled=true so 'end' is a no-op for reconnect.
    bot.on("kicked", (reason) => {
      state.connected = false;
      clearMovementTimers();

      const raw = typeof reason === "string" ? reason : JSON.stringify(reason);
      addLog(`Kicked: ${raw.slice(0, 140)}`);

      let delay: number;
      if (isDuplicateLogin(raw)) {
        // Another instance (e.g. production) is already connected.
        // Back off 90s to let it stabilise; we'll replace it cleanly.
        delay = 90_000;
        addLog("Duplicate login — waiting 90s before reconnecting...");
      } else {
        delay = 20_000;
      }
      scheduleReconnect(delay);
    });

    // ── End ────────────────────────────────────────────────────────────────
    bot.on("end", (reason) => {
      state.connected = false;
      clearMovementTimers();
      addLog(`Connection ended (${reason ?? "unknown"})`);
      // Only schedule if kicked didn't already do it
      scheduleReconnect(15_000);
    });

    // ── Error ──────────────────────────────────────────────────────────────
    bot.on("error", (err) => {
      const msg = (err as Error).message || String(err);
      // Don't log ECONNRESET noise when already handling a kick/end
      if (!state.connected && msg.includes("ECONNRESET")) return;
      state.connected = false;
      clearMovementTimers();
      const delay = isServerOffline(msg) ? 60_000 : 20_000;
      addLog(`Error: ${msg.slice(0, 100)}. Reconnecting in ${delay / 1000}s...`);
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
