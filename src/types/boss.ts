export type ServerType = 'main' | 'sub';

export type BossStatus = 'alive' | 'soon' | 'dead';

export interface Boss {
  id: string;
  name: string;
  server: ServerType;
  serverTag?: string; // e.g. "T3", "S1", "Main"
  location: string;
  respawnMinutes: number; // e.g., 240 for 4 hours
  level?: number;
  lastKilledAt: string | null; // ISO string
  nextSpawnAt: string | null;  // ISO string
  killedBy?: string;
  notifiedStages: number[]; // e.g. [10, 5, 3, 1] that have already fired
  notes?: string;
  dropItems?: string[];
  pinned?: boolean;
  bossNumber?: number;
}

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  passwordHash?: string;
  createdAt: string;
  lastLoginAt?: string;
  active: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  notifyAtMinutes: number[]; // [10, 5, 3, 1]
  soundType: 'synth_chime' | 'warning_siren' | 'horn' | 'sci_fi' | '8bit' | 'tts_thai' | 'custom';
  soundVolume: number; // 0 to 1
  ttsLanguage?: 'thai_only' | 'english_only' | 'all'; // ตัวเลือกภาษาการอ่าน: ไทยอย่างเดียว, อังกฤษอย่างเดียว, หรือทั้งหมด
  ttsSpeed?: number; // ความเร็วการอ่าน (default: 1.05)
  customSoundUrl?: string;
  discordWebhookUrl: string;
  discordEnabled: boolean;
  lineWebhookUrl: string; // LINE notify or incoming webhook URL
  lineEnabled: boolean;
  browserPushEnabled: boolean;
  mainServerTag?: string; // default e.g. "T3"
  subServerTag?: string;  // default e.g. "S1"
}

export interface SheetConfig {
  sheetId: string;
  gid: string;
  mainGid: string; // '1587945636'
  subGid: string;  // '82332950'
  autoSync: boolean;
  syncIntervalSeconds: number;
  lastSyncedAt: string | null;
}

export interface AppStateData {
  bosses: Boss[];
  users: UserAccount[];
  settings: NotificationSettings;
  sheetConfig: SheetConfig;
  lastUpdated: string;
}
