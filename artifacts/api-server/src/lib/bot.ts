import mineflayer from "mineflayer";
import { logger } from "./logger";

const HOST = "FriendsMasterHub.aternos.me";
const PORT = 19276;
const BOT_USERNAME = "FMH_Bot";
const MC_VERSION = "1.21.1";

interface PendingAward {
  player: string;
  item: string;
  quantity: number;
  resolve: (val: { success: boolean; message: string }) => void;
}

interface BotState {
  connected: boolean;
  username: string;
  health: number | null;
  food: number | null;
  position: { x: number; y: number; z: number } | null;
  pingMs: number | null;
  startTime: number | null;
  activityLog: string[];
  pendingAwards: PendingAward[];
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
  pendingAwards: [],
  onlinePlayers: new Set(),
};

let bot: ReturnType<typeof mineflayer.createBot> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let actionTimer: NodeJS.Timeout | null = null;
let awardCheckTimer: NodeJS.Timeout | null = null;

const CHAT_MESSAGES = [
  "Hello everyone! 👋",
  "Having fun building today?",
  "FriendsMasterHub is the best server! 🏠",
  "Check out our website for build submissions!",
  "Nice builds everyone! Keep it up! 💪",
  "Who wants to explore together?",
  "This server is amazing! 🌟",
  "Building is life! 🧱",
  "FriendsMasterHub — where friends build together!",
  "Don't forget to submit your builds on the website!",
  "Anyone need help with their build?",
  "The community here is awesome! ❤️",
];

function addLog(msg: string) {
  const time = new Date().toLocaleTimeString();
  state.activityLog.unshift(`[${time}] ${msg}`);
  if (state.activityLog.length > 50) {
    state.activityLog = state.activityLog.slice(0, 50);
  }
  logger.info({ botActivity: msg }, "Bot activity");
}

function scheduleReconnect(delayMs = 15000) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    addLog("Attempting to reconnect...");
    createBot();
  }, delayMs);
}

function startActions() {
  if (actionTimer) clearInterval(actionTimer);

  let chatIdx = 0;
  let tick = 0;

  actionTimer = setInterval(() => {
    if (!bot || !state.connected) return;

    tick++;

    // Chat every ~3 minutes (36 ticks of 5s each)
    if (tick % 36 === 0) {
      const msg = CHAT_MESSAGES[chatIdx % CHAT_MESSAGES.length];
      chatIdx++;
      try {
        bot.chat(msg);
        addLog(`Said: "${msg}"`);
      } catch {}
    }

    // Random movement every 10-20 ticks
    if (tick % (10 + Math.floor(Math.random() * 10)) === 0) {
      try {
        const actions = ["jump", "sneak", "look", "move"];
        const action = actions[Math.floor(Math.random() * actions.length)];

        if (action === "jump" && bot.entity) {
          bot.setControlState("jump", true);
          setTimeout(() => bot?.setControlState("jump", false), 500);
          addLog("Jumped!");
        } else if (action === "sneak") {
          bot.setControlState("sneak", true);
          setTimeout(() => bot?.setControlState("sneak", false), 1000);
          addLog("Sneaked!");
        } else if (action === "look" && bot.entity) {
          const yaw = Math.random() * Math.PI * 2;
          const pitch = (Math.random() - 0.5) * Math.PI * 0.5;
          bot.look(yaw, pitch, false).catch(() => {});
          addLog("Looked around");
        } else if (action === "move") {
          const dirs: Array<"forward" | "back" | "left" | "right"> = [
            "forward",
            "back",
            "left",
            "right",
          ];
          const dir = dirs[Math.floor(Math.random() * dirs.length)];
          bot.setControlState(dir, true);
          setTimeout(() => bot?.setControlState(dir, false), 1500);
          addLog(`Moved ${dir}`);
        }
      } catch {}
    }

    // Update position
    if (bot.entity) {
      const pos = bot.entity.position;
      state.position = {
        x: Math.round(pos.x * 10) / 10,
        y: Math.round(pos.y * 10) / 10,
        z: Math.round(pos.z * 10) / 10,
      };
    }

    // Update health / food
    state.health = bot.health ?? null;
    state.food = bot.food ?? null;
  }, 5000);
}

function startAwardChecker() {
  if (awardCheckTimer) clearInterval(awardCheckTimer);

  awardCheckTimer = setInterval(() => {
    if (!bot || !state.connected || state.pendingAwards.length === 0) return;

    const award = state.pendingAwards[0];
    if (state.onlinePlayers.has(award.player)) {
      state.pendingAwards.shift();
      const cmd = `/give ${award.player} ${award.item} ${award.quantity}`;
      try {
        bot.chat(cmd);
        addLog(`Awarded ${award.player}: ${award.item} x${award.quantity}`);
        award.resolve({ success: true, message: `Gave ${award.item} x${award.quantity} to ${award.player}` });
      } catch (err) {
        award.resolve({ success: false, message: `Failed to give item` });
      }
    } else {
      addLog(`Waiting for ${award.player} to come online...`);
    }
  }, 10000);
}

export function queueAward(
  player: string,
  item: string,
  quantity: number
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    // If bot is not connected, wait for server to come online first
    state.pendingAwards.push({ player, item, quantity, resolve });
    addLog(`Queued award for ${player}: ${item} x${quantity}`);
  });
}

function createBot() {
  if (bot) {
    try {
      bot.quit();
    } catch {}
    bot = null;
  }

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
    });

    bot.once("spawn", () => {
      state.connected = true;
      state.startTime = Date.now();
      addLog("Connected to server!");
      startActions();
      startAwardChecker();
    });

    bot.on("playerJoined", (player) => {
      state.onlinePlayers.add(player.username);
      addLog(`${player.username} joined`);
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

    bot.on("kicked", (reason) => {
      state.connected = false;
      addLog(`Kicked: ${reason}. Reconnecting in 15s...`);
      if (actionTimer) clearInterval(actionTimer);
      scheduleReconnect(15000);
    });

    bot.on("end", (reason) => {
      state.connected = false;
      addLog(`Disconnected: ${reason}. Reconnecting in 15s...`);
      if (actionTimer) clearInterval(actionTimer);
      scheduleReconnect(15000);
    });

    bot.on("error", (err) => {
      state.connected = false;
      const msg = (err as Error).message || String(err);
      addLog(`Error: ${msg}. Reconnecting in 20s...`);
      if (actionTimer) clearInterval(actionTimer);
      scheduleReconnect(20000);
    });
  } catch (err) {
    addLog(`Failed to create bot: ${(err as Error).message}. Retrying in 20s...`);
    scheduleReconnect(20000);
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
    pendingAwards: state.pendingAwards.length,
  };
}

export function startBot() {
  addLog("Bot service starting...");
  createBot();
}
