/**
 * Server Reboot Rules & Time Calculation
 * Matches bosses with Column O & Column P from Google Sheets
 * and computes new spawn times following server maintenance / reboot.
 */

export interface RebootRule {
  bossName: string;
  hours: number;
  probColor?: 'green' | 'yellow' | 'red';
  probabilityText?: string;
  note?: string;
}

export const DEFAULT_REBOOT_RULES: RebootRule[] = [
  { bossName: 'ซาบัน - Savan', hours: 6, probColor: 'red', probabilityText: '33%' },
  { bossName: 'มด 3- Ant3', hours: 14, probColor: 'red', probabilityText: '33%' },
  { bossName: 'เคลซอส - Kelsus', hours: 6, probColor: 'yellow', probabilityText: '50%' },
  { bossName: 'ครูม่าปนเปื้อน - Cruma4', hours: 6, probColor: 'green', probabilityText: '100%' },
  { bossName: 'ครูม่าหนองน้ำ - Mutated Cruma', hours: 6, probColor: 'green', probabilityText: '100%' },
  { bossName: 'คอร์ซัสเซปเตอร์ - Core', hours: 8, probColor: 'yellow', probabilityText: '50%' },
  { bossName: 'คาทาน - Katan', hours: 6, probColor: 'green', probabilityText: '100%' },
  { bossName: 'แกเร็ธ - Gahareth', hours: 6, probColor: 'yellow', probabilityText: '50%' },
  { bossName: 'ดราก้อนบีสต์ - DB', hours: 14, probColor: 'red', probabilityText: '33%' },
  { bossName: 'เบฮีมอธ - Behemoth', hours: 6, probColor: 'green', probabilityText: '100%' },
  { bossName: 'ลิลลี่ - Lily', hours: 10, probColor: 'green', probabilityText: '100%' },
  { bossName: 'ซามูเอล - Samuel', hours: 10, probColor: 'green', probabilityText: '100%' },
  { bossName: 'ทิมิเนล - Timiniel', hours: 6, probColor: 'green', probabilityText: '100%' },
  { bossName: 'บัลโบ - BalBo', hours: 6, probColor: 'green', probabilityText: '100%' },
  { bossName: 'ออร์เฟน - Orfen', hours: 14, probColor: 'red', probabilityText: '33%' },
  { bossName: 'โครูน - Coroon', hours: 6, probColor: 'green', probabilityText: '100%' },
  { bossName: 'กระจก - Mirror', hours: 10, probColor: 'green', probabilityText: '100%' },
  { bossName: 'กลากิ - Glaki', hours: 14, probColor: 'yellow', probabilityText: '50%' },
  { bossName: 'คาบริโอ - Cabrio', hours: 10, probColor: 'green', probabilityText: '100%' },
  { bossName: 'ทานาทอส - Tanatos', hours: 14, probColor: 'red', probabilityText: '33%' },
  { bossName: 'ฟลินท์ - Flynt', hours: 10, probColor: 'yellow', probabilityText: '50%' },
  { bossName: 'ลาฮา - Rahha', hours: 14, probColor: 'red', probabilityText: '33%' },
  { bossName: 'ฮาร์ป - Haff', hours: 10, probColor: 'yellow', probabilityText: '+10 ชม. หลังรีบูท' },
  { bossName: 'ฮิซิโลเม - Hisilrome', hours: 6, probColor: 'yellow', probabilityText: '+6 ชม. หลังรีบูท' },
  { bossName: 'แลนเดอร์ - Landor', hours: 10, probColor: 'yellow', probabilityText: '+10 ชม. หลังรีบูท' },
  { bossName: 'แอนดราส - Andras', hours: 10, probColor: 'yellow', probabilityText: '+10 ชม. หลังรีบูท' },
  { bossName: 'โอล์คุส - Olkuth', hours: 14, probColor: 'red', probabilityText: '+14 ชม. หลังรีบูท' },
];

/**
 * Normalizes text by lowercasing and stripping whitespace/punctuation
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s\-_:/.'"]/g, '')
    .replace(/หลังจากรีบูธ.*/g, '')
    .replace(/หลังรีบูส.*/g, '');
}

/**
 * Matches a boss name against the reboot rules list
 */
export function findRebootRule(bossName: string, rules: RebootRule[] = DEFAULT_REBOOT_RULES): RebootRule | null {
  if (!bossName) return null;
  const bNorm = normalizeName(bossName);

  // 1. Exact or contains match on normalized name
  for (const r of rules) {
    const rNorm = normalizeName(r.bossName);
    if (bNorm === rNorm || bNorm.includes(rNorm) || rNorm.includes(bNorm)) {
      return r;
    }
  }

  // 2. Match by Thai keyword (at least 3 characters)
  const thaiMatches = bossName.match(/[\u0E00-\u0E7F]+/g) || [];
  for (const tb of thaiMatches) {
    if (tb.length >= 3) {
      for (const r of rules) {
        if (r.bossName.includes(tb)) {
          return r;
        }
      }
    }
  }

  // 3. Match by English keyword (at least 3 characters)
  const engMatches = bossName.match(/[a-zA-Z]+/g) || [];
  for (const eb of engMatches) {
    if (eb.length >= 3) {
      const ebLow = eb.toLowerCase();
      for (const r of rules) {
        if (r.bossName.toLowerCase().includes(ebLow)) {
          return r;
        }
      }
    }
  }

  return null;
}

/**
 * Parse Google Sheet rows (specifically Columns N, O, P, Q)
 * to extract live reboot rules if available.
 */
export function extractRebootRulesFromSheetRows(rows: string[][]): {
  rebootTimeFromSheet: string | null;
  rules: RebootRule[];
} {
  let rebootTimeFromSheet: string | null = null;
  const rules: RebootRule[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= 14) continue;

    // Check row 2 (index 1) Column N (index 13) for reboot time
    if (i === 1 && row[13]) {
      const val = row[13].trim();
      if (val && !val.includes('เวลาที่เซิร์ฟเวอร์') && (val.includes('.') || val.includes(':'))) {
        rebootTimeFromSheet = val.replace('.', ':');
      }
    }

    const bossName = row[14]?.trim();
    const hoursStr = row[15]?.trim();

    if (bossName && hoursStr && bossName !== 'ชื่อบอส') {
      const hours = parseFloat(hoursStr);
      if (!isNaN(hours) && hours > 0) {
        let probColor: 'green' | 'yellow' | 'red' | undefined;
        let probText: string | undefined;

        if (hours === 6) {
          probColor = 'green';
          probText = '100%';
        } else if (hours === 8 || hours === 10) {
          probColor = 'yellow';
          probText = '50%';
        } else if (hours >= 14) {
          probColor = 'red';
          probText = '33%';
        }

        rules.push({
          bossName,
          hours,
          probColor,
          probabilityText: probText,
        });
      }
    }
  }

  return {
    rebootTimeFromSheet,
    rules: rules.length > 0 ? rules : DEFAULT_REBOOT_RULES,
  };
}

/**
 * Calculates new spawn time given reboot date and time
 */
export function calculateRebootSpawnTime(
  rebootDateStr: string, // "YYYY-MM-DD"
  rebootTimeStr: string, // "HH:mm"
  hoursOffset: number
): { spawnDate: Date; spawnIso: string; formattedTime: string; formattedDate: string } {
  const [year, month, day] = rebootDateStr.split('-').map(Number);
  const [hour, min] = rebootTimeStr.split(':').map(Number);

  const baseDate = new Date(year, month - 1, day, hour, min, 0, 0);
  const spawnDate = new Date(baseDate.getTime() + hoursOffset * 60 * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedTime = `${pad(spawnDate.getHours())}:${pad(spawnDate.getMinutes())}`;
  const formattedDate = `${pad(spawnDate.getDate())}/${pad(spawnDate.getMonth() + 1)}/${spawnDate.getFullYear()}`;

  return {
    spawnDate,
    spawnIso: spawnDate.toISOString(),
    formattedTime,
    formattedDate,
  };
}
