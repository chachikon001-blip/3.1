import { Boss, NotificationSettings, SheetConfig, UserAccount } from '../types/boss';

export const DEFAULT_SHEET_CONFIG: SheetConfig = {
  sheetId: '1v9JBi82XouNyp9VotX9n4Kix4JX5EfXFrIJoXU-fCuc',
  gid: '1587945636',
  mainGid: '1587945636',
  subGid: '82332950',
  autoSync: true,
  syncIntervalSeconds: 60,
  lastSyncedAt: null,
};

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  notifyAtMinutes: [10, 5, 3, 1],
  soundType: 'synth_chime',
  soundVolume: 0.8,
  discordWebhookUrl: '',
  discordEnabled: true,
  lineWebhookUrl: '',
  lineEnabled: true,
  browserPushEnabled: true,
  mainServerTag: 'T3',
  subServerTag: 'S1',
};

export const INITIAL_ADMIN_USER: UserAccount = {
  id: 'admin-master',
  username: 'admin',
  displayName: 'หัวหน้ากิลด์ (Admin)',
  role: 'admin',
  createdAt: new Date().toISOString(),
  active: true,
};

export const INITIAL_GUEST_USER: UserAccount = {
  id: 'guest-user',
  username: 'guest',
  displayName: 'สมาชิกกิลด์',
  role: 'member',
  createdAt: new Date().toISOString(),
  active: true,
};

export const rawBossList = [
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
  { num: 10, name: 'คอร์ปส์ลอร์ด - Corpse Lord', location: 'ป่าแห่งความตาย', respawn: 180, level: 40, drops: ['ธนูซากศพ', 'หมวกหนัง'], pinned: false },
  { num: 12, name: 'ลอร์ดออฟแวร์วูล์ฟ - Lord Werewolf', location: 'หุบเขาลมหนาว', respawn: 240, level: 44, drops: ['เขี้ยวหมาป่า', 'กรงเล็บสังหาร'], pinned: false },
  { num: 15, name: 'ทรานเกิล - Trangle', location: 'ทางแยกดินแดนศักดิ์สิทธิ์', respawn: 360, level: 58, drops: ['เสื้อคลุมผู้พิทักษ์', 'หินเสริมพลัง'], pinned: false },
  { num: 18, name: 'ไทแรนท์ - Tyrant', location: 'ทะเลทรายแห่งความพินาศ', respawn: 300, level: 46, drops: ['สนับมือไทแรนท์', 'เข็มขัดไททัน'], pinned: false },
  { num: 20, name: 'ซากา - Zaken', location: 'เกาะโจรสลัด', respawn: 1200, level: 65, drops: ['ต่างหูซากา', 'ดาบคู่โจรสลัด'], pinned: false },
  { num: 22, name: 'วาลาคัส - Valakas', location: 'รังมังกรไฟ', respawn: 2880, level: 85, drops: ['สร้อยคอวาลาคัส', 'เกล็ดมังกรเพลิง'], pinned: false },
  { num: 24, name: 'แอนทารัส - Antharas', location: 'หุบเขามังกร', respawn: 2880, level: 85, drops: ['ต่างหูแอนทารัส', 'กระดูกมังกร'], pinned: false },
];

import bossesSeed from './bosses_seed.json';

export function createInitialBosses(): Boss[] {
  return (bossesSeed as Boss[]).map((b) => ({
    ...b,
    notifiedStages: b.notifiedStages || [],
  }));
}
