import { execSync } from 'child_process';

const csv = execSync('curl -s -L "https://docs.google.com/spreadsheets/d/1v9JBi82XouNyp9VotX9n4Kix4JX5EfXFrIJoXU-fCuc/export?format=csv&gid=1587945636"').toString();

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.map(line => {
    const row = [];
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

function parseDate(str) {
  if (!str) return null;
  const parts = str.trim().split(/[/.-]/);
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
    return { year, month, day };
  }
  return null;
}

const rows = parseCSV(csv);
console.log('Total rows:', rows.length);
console.log('Headers:', rows[0].slice(0, 8));

const pad = n => String(n).padStart(2, '0');

const bosses = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const name = (r[0] || '').replace(/\s+/g, ' ').trim();
  if (!name || name.toLowerCase() === 'name') continue;

  const hrVal = parseFloat(r[1]);
  const respawnMinutes = (!isNaN(hrVal) && hrVal > 0) ? Math.round(hrVal * 60) : 240;

  const dateParts = parseDate(r[2]);
  const hourNum = parseInt(r[3], 10);
  const minNum = parseInt(r[4], 10);

  let lastKilledAt = null;
  let nextSpawnAt = null;

  if (dateParts && !isNaN(hourNum) && !isNaN(minNum) && hourNum >= 0 && hourNum <= 23 && minNum >= 0 && minNum <= 59) {
    const killIsoStr = `${dateParts.year}-${pad(dateParts.month)}-${pad(dateParts.day)}T${pad(hourNum)}:${pad(minNum)}:00+07:00`;
    const killDate = new Date(killIsoStr);
    lastKilledAt = killDate.toISOString();
    nextSpawnAt = new Date(killDate.getTime() + respawnMinutes * 60 * 1000).toISOString();
  }

  bosses.push({
    name,
    respawnMinutes,
    lastKilledAt,
    nextSpawnAt,
    rawSpawnG: r[6],
    formattedNextSpawn: nextSpawnAt ? new Date(nextSpawnAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) : null,
  });
}

console.log('Sample parsed bosses (first 5):');
console.log(JSON.stringify(bosses.slice(0, 5), null, 2));

console.log('Sample parsed bosses (row 31 Rahha):');
console.log(JSON.stringify(bosses.find(b => b.name.includes('ลาฮา')), null, 2));
