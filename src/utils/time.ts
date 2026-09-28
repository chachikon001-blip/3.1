/**
 * Time utility functions for Boss Timer
 */

export function formatRemainingTime(nextSpawnAt: string | null): {
  text: string;
  diffSeconds: number;
  isAlive: boolean;
  isSoon: boolean;
  statusText: string;
  progressPercent: number;
} {
  if (!nextSpawnAt) {
    return {
      text: 'ยังไม่บันทึกเวลา',
      diffSeconds: 999999,
      isAlive: false,
      isSoon: false,
      statusText: 'รอเวลา',
      progressPercent: 0,
    };
  }

  const now = Date.now();
  const spawnTime = new Date(nextSpawnAt).getTime();
  const diffMs = spawnTime - now;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec <= 0) {
    const elapsedSec = Math.abs(diffSec);
    const hrs = Math.floor(elapsedSec / 3600);
    const mins = Math.floor((elapsedSec % 3600) / 60);
    const text = hrs > 0 ? `เกิดแล้ว ${hrs}ชม. ${mins}น.` : `เกิดแล้ว ${mins} นาที`;
    return {
      text,
      diffSeconds: diffSec,
      isAlive: true,
      isSoon: false,
      statusText: 'เกิดแล้ว (Alive)',
      progressPercent: 100,
    };
  }

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const text = hours > 0 
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  const isSoon = diffSec <= 15 * 60; // Less than 15 mins

  return {
    text,
    diffSeconds: diffSec,
    isAlive: false,
    isSoon,
    statusText: isSoon ? 'ใกล้เกิดแล้ว' : 'กำลังนับถอยหลัง',
    progressPercent: 0,
  };
}

export function formatDateTimeThai(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '-';
  }
}

export function formatTimeOnly(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}
