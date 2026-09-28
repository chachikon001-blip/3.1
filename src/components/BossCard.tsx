import React from 'react';
import { Boss } from '../types/boss';
import { formatRemainingTime, formatDateTimeThai } from '../utils/time';
import { 
  MapPin, 
  Clock, 
  RotateCcw, 
  Skull, 
  Edit3, 
  Pin, 
  ShieldAlert, 
  Swords, 
  Sparkles, 
  Flame,
  Volume2
} from 'lucide-react';

interface BossCardProps {
  boss: Boss;
  onKillNow: (bossId: string) => void;
  onEdit: (boss: Boss) => void;
  onTogglePin?: (bossId: string) => void;
  onTestSound?: (boss: Boss) => void;
  onQuickUpdateTime?: (bossId: string, newTimeStr: string | null) => void;
}

export const BossCard: React.FC<BossCardProps> = ({
  boss,
  onKillNow,
  onEdit,
  onTogglePin,
  onTestSound,
  onQuickUpdateTime,
}) => {
  const timeInfo = formatRemainingTime(boss.nextSpawnAt);

  // Calculate cooldown progress percentage
  let progressPercent = 0;
  if (boss.lastKilledAt && boss.nextSpawnAt) {
    const totalMs = new Date(boss.nextSpawnAt).getTime() - new Date(boss.lastKilledAt).getTime();
    const passedMs = Date.now() - new Date(boss.lastKilledAt).getTime();
    if (totalMs > 0) {
      progressPercent = Math.min(100, Math.max(0, (passedMs / totalMs) * 100));
    }
  }

  const isMain = boss.server === 'main';

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
        timeInfo.isAlive
          ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
          : timeInfo.isSoon
          ? 'bg-slate-900/90 border-amber-500/60 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500/40 animate-pulse-slow'
          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Bar with Server badge & Pin */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Server Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                isMain
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
              }`}
              onClick={() => onEdit(boss)}
              title="คลิกเพื่อแก้ไขเซิร์ฟเวอร์"
            >
              {isMain ? <ShieldAlert className="w-3 h-3" /> : <Swords className="w-3 h-3" />}
              <span>{boss.serverTag ? `${isMain ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง'} [${boss.serverTag}]` : (isMain ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง')}</span>
            </span>

            {/* Level Badge if available */}
            {boss.level && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-num font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                Lv.{boss.level}
              </span>
            )}

            {/* Status Pill */}
            {timeInfo.isAlive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                <Sparkles className="w-3 h-3" />
                เกิดแล้ว
              </span>
            ) : timeInfo.isSoon ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Flame className="w-3 h-3 text-amber-400 animate-bounce" />
                ใกล้เกิด
              </span>
            ) : null}
          </div>

          {/* Quick Tools */}
          <div className="flex items-center gap-1">
            {onTestSound && (
              <button
                onClick={() => onTestSound(boss)}
                title="ฟังเสียงแจ้งเตือนบอสตัวนี้"
                className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onTogglePin && (
              <button
                onClick={() => onTogglePin(boss.id)}
                title={boss.pinned ? 'ยกเลิกการปักหมุด' : 'ปักหมุดไว้บนสุด'}
                className={`p-1 rounded transition ${
                  boss.pinned ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onEdit(boss)}
              title="แก้ไขเวลาและข้อมูลบอส"
              className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Boss Name */}
        <h3 className="text-base sm:text-lg font-bold text-slate-100 mt-2 truncate">
          {boss.name}
        </h3>

        {/* Location & Respawn Info */}
        <div className="mt-1 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-400">
          <div className="flex items-center gap-1 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-rose-400/80 shrink-0" />
            <span className="truncate max-w-[170px]">{boss.location}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <RotateCcw className="w-3.5 h-3.5 text-sky-400/80 shrink-0" />
            <span>ทุก {(boss.respawnMinutes / 60).toFixed(1)} ชม.</span>
          </div>
        </div>
      </div>

      {/* Countdown Timer Display */}
      <div className="px-4 py-3 bg-slate-950/50 my-2 border-y border-slate-800/80">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-slate-400">
            {timeInfo.isAlive ? 'ระยะเวลาที่เกิดมาแล้ว' : 'เวลาเกิดรอบถัดไป'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-300 font-mono-num font-bold">
              {boss.nextSpawnAt ? new Date(boss.nextSpawnAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : '--:--'}
            </span>
            {boss.nextSpawnAt && onQuickUpdateTime && (
              <button
                type="button"
                onClick={() => onQuickUpdateTime(boss.id, null)}
                className="p-0.5 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded transition"
                title="รีเซ็ตเวลาเกิดเป็น --:--"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Main Countdown Display */}
        <div className="mt-1 flex items-center justify-between">
          <div
            className={`font-mono-num font-extrabold tracking-tight text-xl sm:text-2xl ${
              timeInfo.isAlive
                ? 'text-emerald-400'
                : timeInfo.isSoon
                ? 'text-amber-400 animate-pulse'
                : 'text-slate-200'
            }`}
          >
            {timeInfo.text}
          </div>
        </div>

        {/* Cooldown Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              timeInfo.isAlive
                ? 'bg-emerald-500'
                : timeInfo.isSoon
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : 'bg-indigo-500'
            }`}
            style={{ width: `${timeInfo.isAlive ? 100 : progressPercent}%` }}
          />
        </div>
      </div>

      {/* Footer Details & Action Button */}
      <div className="p-4 pt-1 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="truncate">
            <span>ตายล่าสุด: </span>
            <span className="text-slate-300 font-mono-num">{formatDateTimeThai(boss.lastKilledAt)}</span>
          </div>
          {boss.killedBy && (
            <span className="text-slate-400 truncate max-w-[90px]" title={`บันทึกโดย ${boss.killedBy}`}>
              โดย: {boss.killedBy}
            </span>
          )}
        </div>

        {/* Drops if any */}
        {boss.dropItems && boss.dropItems.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {boss.dropItems.slice(0, 2).map((item, idx) => (
              <span
                key={idx}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 truncate max-w-[120px]"
              >
                {item}
              </span>
            ))}
            {boss.dropItems.length > 2 && (
              <span className="text-[10px] px-1 py-0.5 text-slate-500">
                +{boss.dropItems.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Quick Kill Button */}
        <button
          onClick={() => onKillNow(boss.id)}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600/90 via-rose-600/90 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-950/50 flex items-center justify-center gap-2 transition transform active:scale-[0.98]"
        >
          <Skull className="w-4 h-4" />
          <span>ตายแล้ว (บันทึกเวลานี้)</span>
        </button>
      </div>
    </div>
  );
};
