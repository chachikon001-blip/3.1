import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

interface Boss {
  id: string;
  name: string;
  server: 'main' | 'sub';
  serverTag?: string;
  location: string;
  respawnMinutes: number;
  level?: number;
  lastKilledAt: string | null;
  nextSpawnAt: string | null;
  killedBy?: string;
  notifiedStages: number[];
  notes?: string;
  dropItems?: string[];
  pinned?: boolean;
  bossNumber?: number;
}

interface NotificationSettings {
  enabled: boolean;
  notifyAtMinutes: number[];
  soundType: string;
  soundVolume: number;
  ttsLanguage?: 'thai_only' | 'english_only' | 'all';
  ttsSpeed?: number;
  customSoundUrl?: string;
  discordWebhookUrl: string;
  discordEnabled: boolean;
  lineWebhookUrl: string;
  lineEnabled: boolean;
  browserPushEnabled: boolean;
  mainServerTag?: string;
  subServerTag?: string;
}

interface SheetConfig {
  sheetId: string;
  gid: string;
  mainGid: string;
  subGid: string;
  autoSync: boolean;
  syncIntervalSeconds: number;
  lastSyncedAt: string | null;
}

interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  createdAt: string;
  lastLoginAt?: string;
  active: boolean;
  passwordHash?: string;
}

const DEFAULT_SHEET_CONFIG: SheetConfig = {
  sheetId: '1v9JBi82XouNyp9VotX9n4Kix4JX5EfXFrIJoXU-fCuc',
  gid: '1587945636',
  mainGid: '1587945636',
  subGid: '82332950',
  autoSync: true,
  syncIntervalSeconds: 60,
  lastSyncedAt: null,
};

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  notifyAtMinutes: [10, 5, 3, 1],
  soundType: 'synth_chime',
  soundVolume: 0.8,
  ttsLanguage: 'thai_only',
  ttsSpeed: 1.05,
  discordWebhookUrl: '',
  discordEnabled: true,
  lineWebhookUrl: '',
  lineEnabled: true,
  browserPushEnabled: true,
  mainServerTag: 'T3',
  subServerTag: 'S1',
};

const INITIAL_ADMIN_USER: UserAccount = {
  id: 'admin-master',
  username: 'admin',
  displayName: 'หัวหน้ากิลด์ (Admin)',
  role: 'admin',
  createdAt: new Date().toISOString(),
  active: true,
};

const INITIAL_GUEST_USER: UserAccount = {
  id: 'guest-user',
  username: 'guest',
  displayName: 'สมาชิกกิลด์',
  role: 'member',
  createdAt: new Date().toISOString(),
  active: true,
};

function createInitialBossList(): Boss[] {
  const now = Date.now();
  const rawList = [
    { num: 3, name: 'คอร์ซัสเซปเตอร์ - Core', location: 'หอคอยครูม่า ชั้น 7', respawn: 600, level: 55, drops: ['แหวนคอร์', 'แกนวิญญาณ'], pinned: true },
    { num: 31, name: 'ออร์เฟน - Orfen', location: 'ทะเลแห่งสปอร์', respawn: 1440, level: 60, drops: ['ต่างหูออร์เฟน', 'ผลึกโบราณ'], pinned: true },
    { num: 29, name: 'บัลโบ - BalBo', location: 'หุบเขาการ์ดอน', respawn: 720, level: 58, drops: ['ดาบบัลโบ', 'หินวิญญาณ'], pinned: true },
    { num: 7, name: 'ครูม่าหนองน้ำ - Mutated Cruma', location: 'หนองน้ำครูม่า', respawn: 480, level: 50, drops: ['เกราะหนองน้ำ', 'คัมภีร์'], pinned: true },
    { num: 26, name: 'ดราก้อนบีสต์ - DB', location: 'หุบเขามังกร', respawn: 720, level: 62, drops: ['เขี้ยวมังกร', 'แหวนมังกร'], pinned: true },
    { num: 1, name: 'ควีนแอนท์ - Queen Ant', location: 'ถ้ำมด ชั้น 3', respawn: 360, level: 50, drops: ['แหวนควีนแอนท์', 'คัมภีร์เสริมพลัง'], pinned: false },
    { num: 2, name: 'เฟลินอร์ - Feligor', location: 'รังปีศาจดินแดนใต้', respawn: 480, level: 48, drops: ['เกราะหนักเฟลินอร์', 'หินวิญญาณ'], pinned: false },
    { num: 4, name: 'เมดูซ่า - Medusa', location: 'สวนแห่งความสิ้นหวัง', respawn: 240, level: 42, drops: ['เกราะเบาเมดูซ่า', 'ดาบสั้น'], pinned: false },
    { num: 5, name: 'แบล็คลิลลี่ - Black Lily', location: 'สุสานทรราช', respawn: 240, level: 45, drops: ['คทาลิลลี่', 'แหวนเวท'], pinned: false },
    { num: 8, name: 'เบฮีมอธ - Behemoth', location: 'บึงแห่งความมืด', respawn: 360, level: 52, drops: ['โล่เบฮีมอธ', 'ขวานยักษ์'], pinned: false },
  ];

  const bosses: Boss[] = [];
  rawList.forEach((b, idx) => {
    const offset = idx < 5 ? -(idx * 2 + 10) : (idx - 4) * 35;
    bosses.push({
      id: `main-${b.num}-${idx + 1}`,
      name: b.name,
      bossNumber: b.num,
      server: 'main',
      serverTag: 'T3',
      location: b.location,
      respawnMinutes: b.respawn,
      level: b.level,
      lastKilledAt: new Date(now + (offset - b.respawn) * 60000).toISOString(),
      nextSpawnAt: new Date(now + offset * 60000).toISOString(),
      killedBy: 'Admin',
      notifiedStages: [],
      dropItems: b.drops,
      pinned: b.pinned,
    });
  });

  rawList.forEach((b, idx) => {
    const offset = idx * 40 - 15;
    bosses.push({
      id: `sub-${b.num}-${idx + 1}`,
      name: b.name,
      bossNumber: b.num,
      server: 'sub',
      serverTag: 'S1',
      location: b.location,
      respawnMinutes: b.respawn,
      level: b.level,
      lastKilledAt: new Date(now + (offset - b.respawn) * 60000).toISOString(),
      nextSpawnAt: new Date(now + offset * 60000).toISOString(),
      killedBy: 'GuildSub',
      notifiedStages: [],
      dropItems: b.drops,
      pinned: idx < 2,
    });
  });

  return bosses;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();

app.use(express.json({ limit: '10mb' }));

// Data file paths
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'boss_db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

interface ServerState {
  bosses: Boss[];
  users: UserAccount[];
  settings: NotificationSettings;
  sheetConfig: SheetConfig;
  lastUpdated: string;
}

// In-Memory state with disk persistence
let state: ServerState = {
  bosses: createInitialBossList(),
  users: [
    { ...INITIAL_ADMIN_USER, passwordHash: 'admin123' },
    { ...INITIAL_GUEST_USER, passwordHash: '123456' }
  ],
  settings: DEFAULT_SETTINGS,
  sheetConfig: DEFAULT_SHEET_CONFIG,
  lastUpdated: new Date().toISOString(),
};

// Load saved data if available
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.bosses && parsed.bosses.length > 0) {
      state = { ...state, ...parsed };
      console.log(`Loaded ${state.bosses.length} bosses from disk database.`);
    }
  }
} catch (e) {
  console.error('Failed to load database, using defaults:', e);
}

function persistState() {
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save state to disk:', err);
  }
}

// Auto Backup every 6 hours
function performAutoBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(state, null, 2), 'utf-8');
    
    // Keep max 10 backups
    const files = fs.readdirSync(BACKUP_DIR).sort();
    if (files.length > 10) {
      for (let i = 0; i < files.length - 10; i++) {
        fs.unlinkSync(path.join(BACKUP_DIR, files[i]));
      }
    }
  } catch (e) {
    console.error('Auto backup failed:', e);
  }
}
setInterval(performAutoBackup, 6 * 60 * 60 * 1000);

// SSE Client Connections for Realtime Push
const sseClients = new Set<Response>();

function broadcastSSE(type: string, data: unknown) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Discord Webhook Dispatcher
async function sendDiscordNotification(boss: Boss, stage: number) {
  if (!state.settings.discordEnabled || !state.settings.discordWebhookUrl) return;

  const serverLabel = boss.serverTag || (boss.server === 'main' ? (state.settings.mainServerTag || 'เซิร์ฟหลัก') : (state.settings.subServerTag || 'เซิร์ฟรอง'));
  const spawnTime = boss.nextSpawnAt ? new Date(boss.nextSpawnAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'เร็วๆ นี้';
  
  const colors: Record<number, number> = {
    10: 0x3b82f6, // Blue
    5: 0xf59e0b,  // Amber
    3: 0xf97316,  // Orange
    1: 0xef4444,  // Red
  };

  const color = colors[stage] || 0xe11d48;

  const embed = {
    title: `⚔️ [แจ้งเตือนบอสเกิด] ${boss.name} ${serverLabel}`,
    description: `บอสจะเกิดในอีก **${stage} นาที** กรุณาเตรียมพร้อม!`,
    color,
    fields: [
      { name: '🌐 เซิร์ฟเวอร์', value: serverLabel, inline: true },
      { name: '⏰ เวลาเกิด', value: spawnTime, inline: true },
      { name: '📍 สถานที่', value: boss.location || 'ไม่ระบุ', inline: true },
      { name: '🔄 รอบเกิด', value: `${(boss.respawnMinutes / 60).toFixed(1)} ชั่วโมง`, inline: true },
    ],
    footer: {
      text: 'Boss Timer Pro • ระบบกิลด์อัจฉริยะ',
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(state.settings.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **แจ้งเตือนบอสใกล้เกิด (${stage} นาที)**: **${boss.name} ${serverLabel}** กำลังจะเกิด`,
        embeds: [embed],
      }),
    });
  } catch (err) {
    console.error('Failed to send Discord webhook:', err);
  }
}

// LINE Webhook / Notification Dispatcher
async function sendLineNotification(boss: Boss, stage: number) {
  if (!state.settings.lineEnabled || !state.settings.lineWebhookUrl) return;

  const serverLabel = boss.serverTag || (boss.server === 'main' ? (state.settings.mainServerTag || 'เซิร์ฟหลัก') : (state.settings.subServerTag || 'เซิร์ฟรอง'));
  const spawnTime = boss.nextSpawnAt ? new Date(boss.nextSpawnAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'เร็วๆ นี้';
  const message = `\n🚨 [แจ้งเตือนบอสเกิด]\nบอส: ${boss.name} ${serverLabel}\nสถานะ: จะเกิดในอีก ${stage} นาที\nเวลา: ${spawnTime}\nสถานที่: ${boss.location || '-'}`;

  try {
    const url = state.settings.lineWebhookUrl;
    // Check if it's LINE Notify token or full webhook URL
    if (url.startsWith('https://notify-api.line.me/api/notify')) {
      // standard notify endpoint
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ message }),
      });
    } else if (url.startsWith('http')) {
      // Custom webhook / Line messaging endpoint
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          bossName: boss.name,
          server: boss.server,
          serverTag: serverLabel,
          stageMinutes: stage,
          location: boss.location,
        }),
      });
    }
  } catch (err) {
    console.error('Failed to send LINE notification:', err);
  }
}

// Background Boss Timer Worker (Runs every 10 seconds)
setInterval(() => {
  const now = Date.now();
  let updated = false;

  for (const boss of state.bosses) {
    if (!boss.nextSpawnAt) continue;

    const spawnTime = new Date(boss.nextSpawnAt).getTime();
    const diffMs = spawnTime - now;
    const diffMins = diffMs / 60000;

    // Allowed stages: 10, 5, 3, 1
    const stages = state.settings.notifyAtMinutes || [10, 5, 3, 1];

    for (const stage of stages) {
      // If within 25 seconds of the stage mark and not yet notified
      if (diffMins > stage - 0.4 && diffMins <= stage && !boss.notifiedStages.includes(stage)) {
        boss.notifiedStages.push(stage);
        updated = true;

        const serverLabel = boss.serverTag || (boss.server === 'main' ? (state.settings.mainServerTag || 'เซิร์ฟหลัก') : (state.settings.subServerTag || 'เซิร์ฟรอง'));

        // Trigger notifications
        broadcastSSE('boss_alert', {
          boss: { ...boss, serverTag: serverLabel },
          stage,
          message: `${boss.name} ${serverLabel} กำลังจะเกิดในอีก ${stage} นาที!`,
        });

        sendDiscordNotification(boss, stage);
        sendLineNotification(boss, stage);
      }
    }

    // Reset notified stages if boss has spawned or respawned
    if (diffMs < -60000 && boss.notifiedStages.length > 0 && !boss.notifiedStages.includes(0)) {
      boss.notifiedStages.push(0);
      updated = true;
    }
  }

  if (updated) {
    persistState();
    broadcastSSE('state_update', state);
  }
}, 10000);

// API Endpoints

// 1. Get entire app state
app.get('/api/state', (_req: Request, res: Response) => {
  res.json(state);
});

// 2. Realtime SSE stream
app.get('/api/realtime/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);
  res.write(`event: initial_state\ndata: ${JSON.stringify(state)}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 3. Boss Actions
// Record Kill (Boss Dead Now / Update Time: takes current spawn time + respawnMinutes)
app.post('/api/bosses/kill', (req: Request, res: Response) => {
  const { bossId, killedBy, killedAt, nextSpawnAt } = req.body;
  const boss = state.bosses.find(b => b.id === bossId);
  if (!boss) {
    return res.status(404).json({ error: 'ไม่พบบอสที่ระบุ' });
  }

  const now = Date.now();
  if (nextSpawnAt) {
    boss.nextSpawnAt = nextSpawnAt;
    boss.lastKilledAt = killedAt || new Date().toISOString();
  } else if (boss.nextSpawnAt) {
    const baseSpawn = new Date(boss.nextSpawnAt).getTime();
    let calculated = baseSpawn + boss.respawnMinutes * 60 * 1000;
    if (calculated <= now) {
      calculated = now + boss.respawnMinutes * 60 * 1000;
      boss.lastKilledAt = new Date().toISOString();
    } else {
      boss.lastKilledAt = boss.nextSpawnAt;
    }
    boss.nextSpawnAt = new Date(calculated).toISOString();
  } else {
    const killDate = killedAt ? new Date(killedAt) : new Date();
    boss.lastKilledAt = killDate.toISOString();
    boss.nextSpawnAt = new Date(killDate.getTime() + boss.respawnMinutes * 60 * 1000).toISOString();
  }

  boss.killedBy = killedBy || 'สมาชิกกิลด์';
  boss.notifiedStages = []; // reset notification stages for next cycle

  persistState();
  broadcastSSE('state_update', state);
  broadcastSSE('boss_killed', { boss, killedBy: boss.killedBy });

  res.json({ success: true, boss });
});

// Update Boss (manual time, notes, location, respawn cycle)
app.post('/api/bosses/update', (req: Request, res: Response) => {
  const updatedBoss: Partial<Boss> & { id: string } = req.body;
  const index = state.bosses.findIndex(b => b.id === updatedBoss.id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบบอสที่ระบุ' });
  }

  state.bosses[index] = {
    ...state.bosses[index],
    ...updatedBoss,
    notifiedStages: updatedBoss.nextSpawnAt !== state.bosses[index].nextSpawnAt ? [] : state.bosses[index].notifiedStages,
  };

  persistState();
  broadcastSSE('state_update', state);
  res.json({ success: true, boss: state.bosses[index] });
});

// Add New Boss
app.post('/api/bosses', (req: Request, res: Response) => {
  const { name, server, location, respawnMinutes, level, notes, dropItems } = req.body;
  if (!name || !server || !respawnMinutes) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }

  const newBoss: Boss = {
    id: `${server}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name,
    server: server === 'sub' ? 'sub' : 'main',
    location: location || 'ยังไม่ระบุ',
    respawnMinutes: Number(respawnMinutes) || 240,
    level: level ? Number(level) : undefined,
    lastKilledAt: null,
    nextSpawnAt: null,
    notifiedStages: [],
    notes,
    dropItems: Array.isArray(dropItems) ? dropItems : [],
    pinned: false,
  };

  state.bosses.unshift(newBoss);
  persistState();
  broadcastSSE('state_update', state);
  res.json({ success: true, boss: newBoss });
});

// Delete Boss
app.delete('/api/bosses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const prevCount = state.bosses.length;
  state.bosses = state.bosses.filter(b => b.id !== id);

  if (state.bosses.length === prevCount) {
    return res.status(404).json({ error: 'ไม่พบบอส' });
  }

  persistState();
  broadcastSSE('state_update', state);
  res.json({ success: true });
});

// Sync Batch from Offline Queue or Google Sheet Import
app.post('/api/bosses/sync-batch', (req: Request, res: Response) => {
  const { bosses, override } = req.body;
  if (!Array.isArray(bosses)) {
    return res.status(400).json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' });
  }

  if (override) {
    state.bosses = bosses;
  } else {
    // Merge by id or name+server
    for (const incoming of bosses) {
      const existingIdx = state.bosses.findIndex(b => b.id === incoming.id || (b.name === incoming.name && b.server === incoming.server));
      if (existingIdx !== -1) {
        state.bosses[existingIdx] = { ...state.bosses[existingIdx], ...incoming };
      } else {
        state.bosses.push(incoming);
      }
    }
  }

  persistState();
  broadcastSSE('state_update', state);
  res.json({ success: true, count: state.bosses.length });
});

// Reset spawn times to null (--:--) for single boss or whole server
app.post('/api/bosses/reset-times', (req: Request, res: Response) => {
  const { server = 'all', bossId, resetBy } = req.body;
  let resetCount = 0;

  if (bossId) {
    const boss = state.bosses.find(b => b.id === bossId);
    if (boss) {
      boss.nextSpawnAt = null;
      boss.lastKilledAt = null;
      boss.notifiedStages = [];
      resetCount = 1;
    }
  } else {
    state.bosses.forEach(b => {
      if (server === 'all' || b.server === server) {
        b.nextSpawnAt = null;
        b.lastKilledAt = null;
        b.notifiedStages = [];
        resetCount++;
      }
    });
  }

  persistState();
  broadcastSSE('state_update', state);

  const serverLabel = server === 'all' ? 'ทั้งหมด' : server === 'main' ? (state.settings.mainServerTag || 'T3') : (state.settings.subServerTag || 'S1');

  broadcastSSE('boss_times_reset', {
    server,
    bossId,
    resetCount,
    resetBy: resetBy || 'สมาชิก',
    message: bossId 
      ? `รีเซ็ตเวลาเกิดบอสกลับเป็น --:-- เรียบร้อยแล้ว` 
      : `รีเซ็ตเวลาเกิดบอส ${serverLabel} ทั้งหมด (${resetCount} ตัว) เป็น --:-- เรียบร้อยแล้ว`,
    bosses: state.bosses,
  });

  res.json({ success: true, resetCount, bosses: state.bosses });
});

// Helper to send Discord reboot alert
async function sendDiscordRebootNotification(url: string, serverLabel: string, date: string, time: string, rebootedBy?: string) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `⚡ **[เซิร์ฟเวอร์รีบูท]** ${serverLabel} รีเซ็ตเวลาเกิดบอสทุกตัวแล้ว!`,
        embeds: [
          {
            title: `⚡ เซิร์ฟเวอร์ ${serverLabel} รีบูทเสร็จสิ้น`,
            description: `เวลารีบูท: วันที่ **${date}** เวลา **${time} น.**\nรีเซ็ตเวลาเกิดของบอสทุกตัวตามตารางเวลาหลังรีบูท (ช่อง P) เรียบร้อยแล้ว`,
            color: 0xf59e0b,
            fields: [
              { name: 'เซิร์ฟเวอร์', value: serverLabel, inline: true },
              { name: 'เวลารีบูทเสร็จ', value: `${time} น.`, inline: true },
              { name: 'ผู้ดำเนินการ', value: rebootedBy || 'หัวหน้ากิลด์ (Admin)', inline: true },
            ],
            footer: { text: 'Boss Timer Pro • ระบบคำนวณเวลารีบูท' },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    console.warn('Discord reboot webhook error:', err);
  }
}

// Helper to send LINE reboot alert
async function sendLineRebootNotification(url: string, serverLabel: string, date: string, time: string, rebootedBy?: string) {
  try {
    const textMsg = `\n⚡ [เซิร์ฟเวอร์รีบูท]\nเซิร์ฟเวอร์: ${serverLabel}\nเวลารีบูท: ${date} ${time} น.\nรีเซ็ตเวลาเกิดบอสทุกตัวตามตารางเวลาหลังรีบูทเรียบร้อยแล้ว!\nโดย: ${rebootedBy || 'สมาชิก'}`;
    if (url.startsWith('https://notify-api.line.me/api/notify')) {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ message: textMsg }),
      });
    } else {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textMsg }),
      });
    }
  } catch (err) {
    console.warn('LINE reboot webhook error:', err);
  }
}

// Server Reboot & Batch Time Reset based on Column P
app.post('/api/server/reboot', (req: Request, res: Response) => {
  const {
    server = 'all',
    rebootTime,
    rebootDateFormatted = '',
    rebootTimeFormatted = '',
    rebootedBy,
    bosses: incomingBosses,
  } = req.body;

  if (Array.isArray(incomingBosses) && incomingBosses.length > 0) {
    if (server === 'all') {
      state.bosses = incomingBosses;
    } else {
      // Merge by ID to guarantee no duplicates
      const bossMap = new Map<string, Boss>();
      state.bosses.forEach(b => bossMap.set(b.id, b));
      incomingBosses.forEach(b => bossMap.set(b.id, b));
      state.bosses = Array.from(bossMap.values());
    }
  }

  persistState();

  const serverLabel = server === 'all' 
    ? 'ทุกเซิร์ฟเวอร์' 
    : server === 'main' 
      ? (state.settings.mainServerTag || 'T3') 
      : (state.settings.subServerTag || 'S1');

  const alertMsg = `⚡ เซิร์ฟเวอร์ ${serverLabel} รีบูทเสร็จสิ้น ณ วันที่ ${rebootDateFormatted} เวลา ${rebootTimeFormatted} น. รีเซ็ตเวลาเกิดบอสทุกตัวเรียบร้อยแล้ว`;

  broadcastSSE('server_reboot', {
    server,
    rebootTime,
    rebootDateFormatted,
    rebootTimeFormatted,
    rebootedBy: rebootedBy || 'สมาชิก',
    message: alertMsg,
    bosses: state.bosses,
  });

  broadcastSSE('state_update', state);

  if (state.settings.discordEnabled && state.settings.discordWebhookUrl) {
    sendDiscordRebootNotification(state.settings.discordWebhookUrl, serverLabel, rebootDateFormatted, rebootTimeFormatted, rebootedBy);
  }
  if (state.settings.lineEnabled && state.settings.lineWebhookUrl) {
    sendLineRebootNotification(state.settings.lineWebhookUrl, serverLabel, rebootDateFormatted, rebootTimeFormatted, rebootedBy);
  }

  res.json({ success: true, count: state.bosses.length, bosses: state.bosses });
});

// Update Settings
app.post('/api/settings', (req: Request, res: Response) => {
  state.settings = { ...state.settings, ...req.body };
  persistState();
  broadcastSSE('settings_update', state.settings);
  res.json({ success: true, settings: state.settings });
});

// Update Server Tag (e.g. Main -> T3, Sub -> B9) and propagate to all bosses
app.post('/api/settings/server-tag', (req: Request, res: Response) => {
  const { server, newTag } = req.body;
  if (!server || !newTag) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }

  const cleanTag = String(newTag).trim().toUpperCase();

  if (server === 'main') {
    state.settings.mainServerTag = cleanTag;
    state.bosses.forEach((b) => {
      if (b.server === 'main') {
        b.serverTag = cleanTag;
      }
    });
  } else if (server === 'sub') {
    state.settings.subServerTag = cleanTag;
    state.bosses.forEach((b) => {
      if (b.server === 'sub') {
        b.serverTag = cleanTag;
      }
    });
  }

  persistState();
  broadcastSSE('settings_update', state.settings);
  broadcastSSE('state_update', state);
  res.json({ success: true, settings: state.settings, bosses: state.bosses });
});

// Update Sheet Config
app.post('/api/sheet-config', (req: Request, res: Response) => {
  state.sheetConfig = { ...state.sheetConfig, ...req.body, lastSyncedAt: new Date().toISOString() };
  persistState();
  broadcastSSE('sheet_config_update', state.sheetConfig);
  res.json({ success: true, sheetConfig: state.sheetConfig });
});

// Test Webhook Dispatch
app.post('/api/test-webhook', async (req: Request, res: Response) => {
  const { type, url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL ไม่ถูกต้อง' });
  }

  try {
    if (type === 'discord') {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '✅ **[ทดสอบการแจ้งเตือน Discord]** ระบบเชื่อมต่อเรียบร้อยแล้ว!',
          embeds: [
            {
              title: '⚔️ ทดสอบระบบ Boss Timer Pro',
              description: 'ระบบแจ้งเตือน Discord ทำงานได้อย่างสมบูรณ์แบบ',
              color: 0x10b981,
              fields: [
                { name: 'สถานะ', value: 'ออนไลน์ (Online)', inline: true },
                { name: 'เวลาทดสอบ', value: new Date().toLocaleString('th-TH'), inline: true },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        return res.status(400).json({ error: `Discord ตอบกลับรหัส ${response.status}` });
      }
    } else if (type === 'line') {
      const testMsg = '\n✅ [ทดสอบการแจ้งเตือน LINE]\nระบบเชื่อมต่อ Boss Timer Pro สำเร็จแล้ว!';
      if (url.startsWith('https://notify-api.line.me/api/notify')) {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ message: testMsg }),
        });
      } else {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: testMsg }),
        });
      }
    }

    res.json({ success: true, message: 'ส่งข้อความทดสอบสำเร็จ' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
    res.status(500).json({ error: errorMsg });
  }
});

// Helper to parse date parts
function parseSheetDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase().includes('ไม่ทราบ')) return null;

  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }

    if (year > 2400) year -= 543;
    if (year < 100) year += 2000;

    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }
  return null;
}

function parseSheetCSVLines(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.map(line => {
    const row: string[] = [];
    let inQuotes = false;
    let curVal = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(curVal.trim().replace(/^"|"$/g, ''));
        curVal = '';
      } else {
        curVal += char;
      }
    }
    row.push(curVal.trim().replace(/^"|"$/g, ''));
    return row;
  });
}

function parseSheetCSVToBosses(text: string, defaultServer: 'main' | 'sub'): Boss[] {
  const rows = parseSheetCSVLines(text);
  if (!rows || rows.length === 0) return [];

  const pad = (n: number) => String(n).padStart(2, '0');

  // Filter out header rows and empty rows
  const cleanRows = rows.filter(r => {
    if (!r || r.length < 2) return false;
    const col0 = (r[0] || '').trim().toLowerCase();
    const col1 = (r[1] || '').trim().toLowerCase();
    if (col0 === 'name' || col0.includes('ชื่อบอส') || col1 === 'name' || col1.includes('ชื่อบอส')) {
      return false;
    }
    // Row must have either index or name
    return (r[0] && r[0].trim().length > 0) || (r[1] && r[1].trim().length > 0);
  });

  const bossesList: Boss[] = [];

  cleanRows.forEach((r, index) => {
    // Check if Column B (index 1) is Name (Column A is Index number or empty)
    const col0Trimmed = (r[0] || '').trim();
    const col1Trimmed = (r[1] || '').trim();

    const col0IsIndex = !col0Trimmed || /^\d+$/.test(col0Trimmed);
    const col1HasText = /[a-zA-Z\u0E00-\u0E7F]/.test(col1Trimmed);
    const isColBName = col0IsIndex && col1HasText;

    const nameIdx = isColBName ? 1 : 0;
    const hrIdx = isColBName ? 2 : 1;
    const dateIdx = isColBName ? 3 : 2;
    const hourIdx = isColBName ? 4 : 3;
    const minIdx = isColBName ? 5 : 4;
    const spawnTimeIdx = isColBName ? 7 : 6;
    const fullSpawnIdx = isColBName ? 10 : 9;
    const svIdx = isColBName ? 11 : 10;

    const rawName = (r[nameIdx] || '').replace(/\s+/g, ' ').trim();
    if (!rawName || rawName.toLowerCase() === 'name' || rawName.includes('ชื่อบอส')) {
      return;
    }
    const name = rawName;

    const rawHr = parseFloat(r[hrIdx] || '4');
    const respawnMinutes = (!isNaN(rawHr) && rawHr > 0) ? Math.round(rawHr * 60) : 240;

    const rawDate = (r[dateIdx] || '').trim();
    const rawHour = (r[hourIdx] || '').trim();
    const rawMin = (r[minIdx] || '').trim();
    const rawSpawnTime = (r[spawnTimeIdx] || '').trim();
    const rawFullSpawn = (r[fullSpawnIdx] || '').trim();
    const rawSV = (r[svIdx] || '').trim();

    let server: 'main' | 'sub' = defaultServer;
    if (rawSV.includes('T3') || rawSV.toLowerCase().includes('main') || rawSV.includes('หลัก')) {
      server = 'main';
    } else if (rawSV.includes('S1') || rawSV.includes('Invasion') || rawSV.toLowerCase().includes('sub') || rawSV.includes('รอง')) {
      server = 'sub';
    }
    const serverTag = rawSV || (server === 'main' ? 'T3' : 'Invasion');

    let lastKilledAt: string | null = null;
    let nextSpawnAt: string | null = null;

    const dateParts = parseSheetDateParts(rawDate);
    const hourNum = parseInt(rawHour, 10);
    const minNum = parseInt(rawMin, 10);

    // 1. Check if kill datetime is available (Col D, E, F)
    if (dateParts && !isNaN(hourNum) && !isNaN(minNum) && hourNum >= 0 && hourNum <= 23 && minNum >= 0 && minNum <= 59) {
      const killIso = `${dateParts.year}-${pad(dateParts.month)}-${pad(dateParts.day)}T${pad(hourNum)}:${pad(minNum)}:00+07:00`;
      const killDate = new Date(killIso);
      if (!isNaN(killDate.getTime())) {
        lastKilledAt = killDate.toISOString();
        nextSpawnAt = new Date(killDate.getTime() + respawnMinutes * 60 * 1000).toISOString();
      }
    }

    // 2. Full spawn datetime column (Col K / index 10 e.g. "26/09/2026 19:31")
    if (!nextSpawnAt && rawFullSpawn && !rawFullSpawn.includes('ไม่ทราบ')) {
      const [jDate, jTime] = rawFullSpawn.split(' ');
      const jDateParts = parseSheetDateParts(jDate);
      if (jDateParts && jTime) {
        const [jHour, jMin] = jTime.split(':').map(v => parseInt(v, 10));
        if (!isNaN(jHour) && !isNaN(jMin)) {
          const spawnIso = `${jDateParts.year}-${pad(jDateParts.month)}-${pad(jDateParts.day)}T${pad(jHour)}:${pad(jMin)}:00+07:00`;
          const spDate = new Date(spawnIso);
          if (!isNaN(spDate.getTime())) {
            nextSpawnAt = spDate.toISOString();
            if (!lastKilledAt) {
              lastKilledAt = new Date(spDate.getTime() - respawnMinutes * 60 * 1000).toISOString();
            }
          }
        }
      }
    }

    // 3. Time only column (Col H / index 7 e.g. "19:31")
    if (!nextSpawnAt && rawSpawnTime && rawSpawnTime.includes(':') && !rawSpawnTime.includes('ไม่ทราบ')) {
      const [gHour, gMin] = rawSpawnTime.split(':').map(v => parseInt(v, 10));
      const refDate = dateParts || {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
      };
      if (!isNaN(gHour) && !isNaN(gMin)) {
        const spawnIso = `${refDate.year}-${pad(refDate.month)}-${pad(refDate.day)}T${pad(gHour)}:${pad(gMin)}:00+07:00`;
        const spDate = new Date(spawnIso);
        if (!isNaN(spDate.getTime())) {
          nextSpawnAt = spDate.toISOString();
          if (!lastKilledAt) {
            lastKilledAt = new Date(spDate.getTime() - respawnMinutes * 60 * 1000).toISOString();
          }
        }
      }
    }

    const bossNumber = isColBName && /^\d+$/.test(col0Trimmed) ? parseInt(col0Trimmed, 10) : undefined;

    bossesList.push({
      id: `${server}-sheet-${index + 1}-${name.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}`,
      name,
      server,
      serverTag,
      location: 'ตามแมพ / พื้นที่ล่า',
      respawnMinutes,
      lastKilledAt,
      nextSpawnAt,
      killedBy: lastKilledAt ? 'Google Sheet' : undefined,
      notifiedStages: [],
      pinned: index < 3,
      bossNumber,
    });
  });

  return bossesList;
}

// Google Sheets Proxy (handles public export & CSV fetching without browser CORS issues)
app.get('/api/sheets/proxy', async (req: Request, res: Response) => {
  const { sheetId, gid = '0' } = req.query;
  if (!sheetId) {
    return res.status(400).json({ error: 'sheetId required' });
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  try {
    const response = await fetch(exportUrl);
    if (!response.ok) {
      return res.status(response.status).send('Cannot fetch sheet');
    }
    const data = await response.text();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Fetch failed';
    res.status(500).send(errorMsg);
  }
});

// Trigger Google Sheets Direct Server Sync
app.post('/api/sheets/sync', async (req: Request, res: Response) => {
  const {
    sheetId = state.sheetConfig.sheetId,
    mainGid = state.sheetConfig.mainGid,
    subGid = state.sheetConfig.subGid,
    target = 'all',
  } = req.body || {};

  try {
    const updatedBosses: Boss[] = [];
    if (target === 'main' || target === 'all') {
      const resMain = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${mainGid}`);
      if (resMain.ok) {
        const text = await resMain.text();
        const mainList = parseSheetCSVToBosses(text, 'main');
        updatedBosses.push(...mainList);
      }
    }
    if (target === 'sub' || target === 'all') {
      const resSub = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${subGid}`);
      if (resSub.ok) {
        const text = await resSub.text();
        const subList = parseSheetCSVToBosses(text, 'sub');
        updatedBosses.push(...subList);
      }
    }

    if (updatedBosses.length > 0) {
      if (target === 'all') {
        state.bosses = updatedBosses;
      } else {
        const otherBosses = state.bosses.filter(b => b.server !== target);
        state.bosses = [...otherBosses, ...updatedBosses];
      }
      state.sheetConfig.lastSyncedAt = new Date().toISOString();
      persistState();
      broadcastSSE('state_update', state);
      return res.json({ success: true, count: updatedBosses.length, bosses: state.bosses });
    } else {
      return res.status(400).json({ error: 'ไม่พบข้อมูลบอสจากชีตที่ระบุ' });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return res.status(500).json({ error: msg });
  }
});

// Automatic background sync from Google Sheets every 30 seconds to keep all devices linked
async function performAutoGoogleSheetSync() {
  if (!state.sheetConfig?.autoSync || !state.sheetConfig?.sheetId) return;

  try {
    const updatedBosses: Boss[] = [];
    const { sheetId, mainGid, subGid } = state.sheetConfig;

    if (mainGid) {
      const resMain = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${mainGid}`);
      if (resMain.ok) {
        const text = await resMain.text();
        const mainList = parseSheetCSVToBosses(text, 'main');
        updatedBosses.push(...mainList);
      }
    }

    if (subGid) {
      const resSub = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${subGid}`);
      if (resSub.ok) {
        const text = await resSub.text();
        const subList = parseSheetCSVToBosses(text, 'sub');
        updatedBosses.push(...subList);
      }
    }

    if (updatedBosses.length > 0) {
      let hasChanges = false;
      for (const updated of updatedBosses) {
        const existing = state.bosses.find(b => b.id === updated.id || (b.name === updated.name && b.server === updated.server));
        if (existing) {
          if (existing.nextSpawnAt !== updated.nextSpawnAt || existing.lastKilledAt !== updated.lastKilledAt) {
            existing.nextSpawnAt = updated.nextSpawnAt;
            existing.lastKilledAt = updated.lastKilledAt;
            existing.bossNumber = updated.bossNumber ?? existing.bossNumber;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        state.sheetConfig.lastSyncedAt = new Date().toISOString();
        persistState();
        broadcastSSE('state_update', state);
      }
    }
  } catch (err) {
    // Background sync error - silently ignore
  }
}
setInterval(performAutoGoogleSheetSync, 30000);

// User Management & Auth
app.post('/api/users/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = state.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
  
  if (!user || !user.active) {
    return res.status(401).json({ error: 'ไม่พบบัญชีผู้ใช้นี้ หรือบัญชีถูกระงับ' });
  }

  if (user.passwordHash && user.passwordHash !== password) {
    return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
  }

  user.lastLoginAt = new Date().toISOString();
  persistState();

  const { passwordHash: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// Admin: Create User ID
app.post('/api/users/create', (req: Request, res: Response) => {
  const { username, displayName, password, role } = req.body;
  if (!username || !displayName) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และชื่อแสดง' });
  }

  const exists = state.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'ชื่อผู้ใช้นี้มีในระบบแล้ว' });
  }

  const newUser: UserAccount = {
    id: `user-${Date.now()}`,
    username,
    displayName,
    role: role === 'admin' ? 'admin' : 'member',
    passwordHash: password || '123456',
    createdAt: new Date().toISOString(),
    active: true,
  };

  state.users.push(newUser);
  persistState();
  broadcastSSE('users_update', state.users.map(({ passwordHash: _, ...u }) => u));

  const { passwordHash: _, ...safeUser } = newUser;
  res.json({ success: true, user: safeUser });
});

// Admin: Update User Role / Status
app.post('/api/users/update', (req: Request, res: Response) => {
  const { userId, role, active, password } = req.body;
  const user = state.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
  }

  if (role) user.role = role;
  if (typeof active === 'boolean') user.active = active;
  if (password) user.passwordHash = password;

  persistState();
  broadcastSSE('users_update', state.users.map(({ passwordHash: _, ...u }) => u));
  res.json({ success: true });
});

// Admin: Delete User
app.delete('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (id === 'admin-master') {
    return res.status(400).json({ error: 'ไม่สามารถลบ Master Admin ได้' });
  }
  state.users = state.users.filter(u => u.id !== id);
  persistState();
  broadcastSSE('users_update', state.users.map(({ passwordHash: _, ...u }) => u));
  res.json({ success: true });
});

// Cloud Backup / Export JSON
app.get('/api/backup', (_req: Request, res: Response) => {
  res.setHeader('Content-Disposition', `attachment; filename=boss-backup-${Date.now()}.json`);
  res.json(state);
});

// Restore from JSON
app.post('/api/restore', (req: Request, res: Response) => {
  const data = req.body;
  if (!data || !Array.isArray(data.bosses)) {
    return res.status(400).json({ error: 'ไฟล์สำรองข้อมูลไม่ถูกต้อง' });
  }

  state = {
    bosses: data.bosses,
    users: data.users || state.users,
    settings: data.settings || state.settings,
    sheetConfig: data.sheetConfig || state.sheetConfig,
    lastUpdated: new Date().toISOString(),
  };

  persistState();
  broadcastSSE('state_update', state);
  res.json({ success: true, count: state.bosses.length });
});

// Health check endpoint for Cloud Run
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Start dev or production server
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === 'production' || (hasDist && process.env.NODE_ENV !== 'development');

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('Boss Timer Pro backend ready.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (production: ${isProduction})`);
  });
}

startServer();
