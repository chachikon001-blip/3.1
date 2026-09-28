import { Boss } from '../types/boss';
import { getAccessToken } from './firebase';
import { rawBossList } from '../data/defaultBosses';

export interface SheetRowData {
  name: string;
  server: 'main' | 'sub';
  respawnMinutes: number;
  lastKilledAt: string;
  nextSpawnAt: string;
  location: string;
}

/**
 * Fetch public Google Sheet CSV (or through backend proxy)
 */
export async function fetchPublicGoogleSheet(sheetId: string, gid = '0'): Promise<string[][]> {
  const urls = [
    `/api/sheets/proxy?sheetId=${encodeURIComponent(sheetId)}&gid=${encodeURIComponent(gid)}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        if (text && !text.includes('<!DOCTYPE html>')) {
          return parseCSV(text);
        }
      }
    } catch {
      // try next
    }
  }

  throw new Error('ไม่สามารถดึงข้อมูลจาก Google Sheet ได้โดยตรง กรุณาตรวจสอบสิทธิ์การแชร์หรือเข้าสู่ระบบด้วย Google');
}

/**
 * Parse CSV text into 2D array
 */
export function parseCSV(text: string): string[][] {
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

/**
 * Read spreadsheet using Google Sheets REST API (OAuth)
 */
export async function fetchSheetsDataWithOAuth(sheetId: string, range = 'A1:K100'): Promise<string[][]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาเข้าสู่ระบบ Google เพื่อเข้าถึงสิทธิ์ Google Sheets');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `HTTP ${res.status}: ไม่สามารถอ่านชีตได้`);
  }

  const data = await res.json();
  return (data.values as string[][]) || [];
}

/**
 * Helper to parse Date string from Column C (DD/MM/YYYY or YYYY-MM-DD)
 */
function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase().includes('ไม่ทราบ')) return null;

  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // If parts[0] is 4 digits: YYYY-MM-DD
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }

    // Convert Buddhist era if > 2400 (e.g. 2569 -> 2026)
    if (year > 2400) {
      year -= 543;
    } else if (year < 100) {
      year += 2000;
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Write Boss records to Google Sheets (MANDATORY User Confirmation handled by caller)
 * Matching user's exact sheet layout:
 * Column A: Name
 * Column B: Hr.
 * Column C: วันที่ตาย
 * Column D: ชม
 * Column E: นาที
 * Column F: Update
 * Column G: Respawn GMT+7
 * Column H: Respawn GMT+8
 * Column I: เรียงบอส
 * Column J: วันที่เเละเวลาเกิดของบอส
 * Column K: SV.
 */
export async function writeBossesToGoogleSheet(sheetId: string, bosses: Boss[], range = 'A1:K'): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาเข้าสู่ระบบด้วยบัญชี Google เพื่อบันทึกข้อมูลลงชีต');
  }

  // Header row
  const rows: (string | number)[][] = [
    ['Name', 'Hr.', 'วันที่ตาย', 'ชม', 'นาที', 'Update', 'Respawn GMT+7', 'Respawn GMT+8', 'เรียงบอส', 'วันที่เเละเวลาเกิดของบอส', 'SV.'],
  ];

  const nowMs = Date.now();

  bosses.forEach(b => {
    const respawnHours = (b.respawnMinutes / 60).toFixed(1).replace(/\.0$/, '');
    const serverLabel = b.serverTag || (b.server === 'main' ? 'T3' : 'S1');

    let deathDateStr = '';
    let deathHourStr = '';
    let deathMinStr = '';
    let respawnGmt7 = 'ไม่ทราบเวลา';
    let respawnGmt8 = 'ไม่ทราบเวลา';
    let fullSpawnStr = 'ไม่ทราบเวลา';
    let minutesLeftStr = '-';

    if (b.lastKilledAt) {
      const d = new Date(b.lastKilledAt);
      if (!isNaN(d.getTime())) {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).formatToParts(d);

        const getVal = (type: string) => parts.find(p => p.type === type)?.value || '';
        deathDateStr = `${getVal('day')}/${getVal('month')}/${getVal('year')}`;
        deathHourStr = parseInt(getVal('hour'), 10).toString();
        deathMinStr = parseInt(getVal('minute'), 10).toString();
      }
    }

    if (b.nextSpawnAt) {
      const sp = new Date(b.nextSpawnAt);
      if (!isNaN(sp.getTime())) {
        const diffMinutes = Math.round((sp.getTime() - nowMs) / 60000);
        minutesLeftStr = diffMinutes.toString();

        respawnGmt7 = sp.toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        respawnGmt8 = sp.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Singapore',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        const spParts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).formatToParts(sp);

        const getSp = (type: string) => spParts.find(p => p.type === type)?.value || '';
        fullSpawnStr = `${getSp('day')}/${getSp('month')}/${getSp('year')} ${getSp('hour')}:${getSp('minute')}`;
      }
    }

    rows.push([
      b.name,
      respawnHours,
      deathDateStr,
      deathHourStr,
      deathMinStr,
      'FALSE',
      respawnGmt7,
      respawnGmt8,
      minutesLeftStr,
      fullSpawnStr,
      serverLabel,
    ]);
  });

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: rows,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `เกิดข้อผิดพลาดในการบันทึกลงชีต (${res.status})`);
  }

  return true;
}

/**
 * Parse Google Sheet rows into Boss objects according to user format:
 * Column A (0): Name (ชื่อบอส)
 * Column B (1): Hr. (รอบเวลาเกิดใหม่เป็น ชม.)
 * Column C (2): วันที่ตาย (DD/MM/YYYY)
 * Column D (3): ชมที่ตาย (Hour 0-23)
 * Column E (4): นาทีที่ตาย (Minute 0-59)
 * Column F (5): Update (Checkbox)
 * Column G (6): เวลาเกิดใหม่ (Respawn GMT+7 e.g. 19:31)
 * Column J (9): วันที่เเละเวลาเกิดของบอส (Full Datetime e.g. 26/09/2026 19:31)
 * Column K (10): SV. (Server Tag: T3, S1, Invasion)
 */
export function convertSheetRowsToBosses(rows: string[][], fallbackServer: 'main' | 'sub' = 'main'): Boss[] {
  if (!rows || rows.length === 0) return [];

  // Filter out header and empty rows
  const cleanRows = rows.filter(r => {
    if (!r || r.length < 2) return false;
    const col0 = (r[0] || '').trim().toLowerCase();
    const col1 = (r[1] || '').trim().toLowerCase();
    if (col0 === 'name' || col0.includes('ชื่อบอส') || col1 === 'name' || col1.includes('ชื่อบอส')) {
      return false;
    }
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

    // 2. เวลาเกิดใหม่ (ชม.) -> respawnMinutes
    const rawHrStr = (r[hrIdx] || '').trim();
    let respawnMinutes = 240; // 4 ชั่วโมง default
    const parsedHr = parseFloat(rawHrStr);
    if (!isNaN(parsedHr) && parsedHr > 0) {
      respawnMinutes = Math.round(parsedHr * 60);
    } else {
      const matchHrs = rawHrStr.match(/(\d+(\.\d+)?)\s*(hr|h|ชม|ชั่วโมง)/i);
      const matchMins = rawHrStr.match(/(\d+)\s*(min|m|นาที)/i);
      if (matchHrs) {
        respawnMinutes = Math.round(parseFloat(matchHrs[1]) * 60);
      } else if (matchMins) {
        respawnMinutes = parseInt(matchMins[1], 10);
      }
    }

    // 3. วันที่ตาย, ชมที่ตาย, นาทีที่ตาย
    const rawDateStr = (r[dateIdx] || '').trim();
    const rawHourStr = (r[hourIdx] || '').trim();
    const rawMinStr = (r[minIdx] || '').trim();

    // 4. เวลาเกิดใหม่ GMT+7
    const rawSpawnG = (r[spawnTimeIdx] || '').trim();

    // 5. วันที่เเละเวลาเกิดของบอส (เช่น 26/09/2026 19:31)
    const rawFullSpawnJ = (r[fullSpawnIdx] || '').trim();

    // 6. SV.
    const rawSV = (r[svIdx] || '').trim();
    let server: 'main' | 'sub' = fallbackServer;
    if (rawSV.includes('T3') || rawSV.toLowerCase().includes('main') || rawSV.includes('หลัก')) {
      server = 'main';
    } else if (rawSV.includes('S1') || rawSV.includes('Invasion') || rawSV.toLowerCase().includes('sub') || rawSV.includes('รอง')) {
      server = 'sub';
    }

    const serverTag = rawSV || (server === 'main' ? 'T3' : 'Invasion');

    // Parse Dates
    let lastKilledAt: string | null = null;
    let nextSpawnAt: string | null = null;

    const dateParts = parseDateParts(rawDateStr);
    const hourNum = parseInt(rawHourStr, 10);
    const minNum = parseInt(rawMinStr, 10);

    // กรณีมีข้อมูล วันที่ + ชม + นาที ครบถ้วน
    if (
      dateParts &&
      !isNaN(hourNum) &&
      !isNaN(minNum) &&
      hourNum >= 0 &&
      hourNum <= 23 &&
      minNum >= 0 &&
      minNum <= 59
    ) {
      const killIsoStr = `${dateParts.year}-${pad(dateParts.month)}-${pad(dateParts.day)}T${pad(hourNum)}:${pad(minNum)}:00+07:00`;
      const killDate = new Date(killIsoStr);
      if (!isNaN(killDate.getTime())) {
        lastKilledAt = killDate.toISOString();
        // เวลาเกิดใหม่ = เวลาตาย + รอบเกิด
        nextSpawnAt = new Date(killDate.getTime() + respawnMinutes * 60 * 1000).toISOString();
      }
    }

    // กรณีไม่มี C, D, E แต่มี วันที่เเละเวลาเกิด เช่น "26/09/2026 19:31"
    if (!nextSpawnAt && rawFullSpawnJ && !rawFullSpawnJ.includes('ไม่ทราบ')) {
      const [jDate, jTime] = rawFullSpawnJ.split(' ');
      const jDateParts = parseDateParts(jDate);
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

    // กรณีมีเวลาเกิดใหม่ เช่น "19:31"
    if (!nextSpawnAt && rawSpawnG && rawSpawnG.includes(':') && !rawSpawnG.includes('ไม่ทราบ')) {
      const [gHour, gMin] = rawSpawnG.split(':').map(v => parseInt(v, 10));
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

    // Match with predefined boss metadata if exists
    const matchedKnownBoss = rawBossList.find(b => {
      const cleanBName = b.name.replace(/\s+/g, ' ').toLowerCase();
      const cleanTarget = name.toLowerCase();
      return cleanTarget.includes(cleanBName) || cleanBName.includes(cleanTarget) ||
        cleanTarget.split('-')[0].trim() === cleanBName.split('-')[0].trim();
    });

    const location = matchedKnownBoss?.location || 'ตามแมพ / พื้นที่ล่า';
    const level = matchedKnownBoss?.level;
    const dropItems = matchedKnownBoss?.drops || [];
    const bossNumber = (isColBName && /^\d+$/.test(col0Trimmed)) ? parseInt(col0Trimmed, 10) : matchedKnownBoss?.num;
    const pinned = matchedKnownBoss?.pinned ?? (index < 3);

    bossesList.push({
      id: `${server}-sheet-${index + 1}-${name.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}`,
      name,
      server,
      serverTag,
      location,
      respawnMinutes,
      level,
      lastKilledAt,
      nextSpawnAt,
      killedBy: lastKilledAt ? 'Google Sheet' : undefined,
      notifiedStages: [],
      dropItems,
      pinned,
      bossNumber,
    });
  });

  return bossesList;
}

/**
 * Writes the reboot completion time to cell N2 in the user's Google Sheet
 */
export async function writeRebootTimeToGoogleSheet(
  sheetId: string, 
  rebootTimeStr: string, 
  range = 'N2:N2'
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [[rebootTimeStr]],
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('writeRebootTimeToGoogleSheet error:', err);
    return false;
  }
}

