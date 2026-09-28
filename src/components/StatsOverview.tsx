import React from 'react';
import { Boss } from '../types/boss';
import { formatRemainingTime } from '../utils/time';
import { Flame, Skull, Clock, Sparkles } from 'lucide-react';

interface StatsOverviewProps {
  bosses: Boss[];
  currentServer: 'main' | 'sub' | 'all';
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ bosses, currentServer }) => {
  const filtered = bosses.filter(b => currentServer === 'all' || b.server === currentServer);

  let soonCount = 0;
  let aliveCount = 0;
  let pendingCount = 0;
  let nextBoss: { boss: Boss; diffSec: number } | null = null;

  filtered.forEach(b => {
    const time = formatRemainingTime(b.nextSpawnAt);
    if (time.isAlive) {
      aliveCount++;
    } else if (time.isSoon) {
      soonCount++;
      if (!nextBoss || time.diffSeconds < nextBoss.diffSec) {
        nextBoss = { boss: b, diffSec: time.diffSeconds };
      }
    } else {
      pendingCount++;
      if (!nextBoss || (time.diffSeconds > 0 && time.diffSeconds < nextBoss.diffSec)) {
        nextBoss = { boss: b, diffSec: time.diffSeconds };
      }
    }
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4">
      {/* Soon (<15m) */}
      <div className={`p-4 rounded-xl border relative overflow-hidden transition ${
        soonCount > 0 
          ? 'bg-gradient-to-br from-amber-950/40 via-orange-950/20 to-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/10' 
          : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">ใกล้เกิด (&lt; 15 นาที)</span>
          <div className={`p-2 rounded-lg ${soonCount > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl sm:text-3xl font-extrabold ${soonCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
            {soonCount}
          </span>
          <span className="text-xs text-slate-500">ตัว</span>
        </div>
      </div>

      {/* Alive Now */}
      <div className={`p-4 rounded-xl border relative overflow-hidden transition ${
        aliveCount > 0
          ? 'bg-gradient-to-br from-emerald-950/40 via-teal-950/20 to-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
          : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">เกิดแล้วในแมพ</span>
          <div className={`p-2 rounded-lg ${aliveCount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl sm:text-3xl font-extrabold ${aliveCount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
            {aliveCount}
          </span>
          <span className="text-xs text-slate-500">ตัวพร้อมล่า</span>
        </div>
      </div>

      {/* Next Boss */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">บอสตัวถัดไป</span>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 truncate">
          {nextBoss ? (
            <div>
              <p className="text-sm font-bold text-slate-200 truncate">{(nextBoss as { boss: Boss }).boss.name}</p>
              <p className="text-xs text-indigo-300 font-mono-num font-semibold mt-0.5">
                {formatRemainingTime((nextBoss as { boss: Boss }).boss.nextSpawnAt).text}
              </p>
            </div>
          ) : (
            <span className="text-sm text-slate-500 font-medium">ไม่มีบอสที่รอเกิด</span>
          )}
        </div>
      </div>

      {/* Total Tracked */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">ติดตามทั้งหมด</span>
          <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
            <Skull className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-200">
            {filtered.length}
          </span>
          <span className="text-xs text-slate-500">
            ({currentServer === 'main' ? 'เซิร์ฟหลัก' : currentServer === 'sub' ? 'เซิร์ฟรอง' : 'ทั้ง 2 เซิร์ฟ'})
          </span>
        </div>
      </div>
    </div>
  );
};
