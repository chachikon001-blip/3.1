import React, { useState } from 'react';
import { Boss } from '../types/boss';
import { formatRemainingTime } from '../utils/time';
import { 
  Star, 
  MapPin, 
  RotateCw, 
  Clock, 
  Edit3, 
  Volume2, 
  Check, 
  ShieldAlert, 
  Swords,
  RotateCcw,
  X
} from 'lucide-react';

interface BossTableRowProps {
  boss: Boss;
  onKillNow: (bossId: string) => void;
  onEdit: (boss: Boss) => void;
  onTogglePin: (bossId: string) => void;
  onTestSound?: (boss: Boss) => void;
  onQuickUpdateTime?: (bossId: string, newTimeStr: string | null) => void;
}

export const BossTableRow: React.FC<BossTableRowProps> = ({
  boss,
  onKillNow,
  onEdit,
  onTogglePin,
  onTestSound,
  onQuickUpdateTime,
}) => {
  const timeInfo = formatRemainingTime(boss.nextSpawnAt);
  const isMain = boss.server === 'main';

  // Inline quick time editing
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [inlineTime, setInlineTime] = useState(() => {
    if (!boss.nextSpawnAt) return '12:00';
    const d = new Date(boss.nextSpawnAt);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });

  const handleInlineTimeSubmit = () => {
    if (!onQuickUpdateTime) {
      setIsEditingTime(false);
      return;
    }
    const [hrs, mins] = inlineTime.split(':').map(Number);
    if (!isNaN(hrs) && !isNaN(mins)) {
      const now = new Date();
      const target = new Date();
      target.setHours(hrs, mins, 0, 0);
      onQuickUpdateTime(boss.id, target.toISOString());
    }
    setIsEditingTime(false);
  };

  const formattedSpawnTime = boss.nextSpawnAt 
    ? new Date(boss.nextSpawnAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  // Calculate elapsed overdue or remaining text
  let subStatusText = '';
  let subStatusColor = '';

  if (timeInfo.isAlive) {
    const elapsedSec = Math.abs(timeInfo.diffSeconds);
    const hrs = Math.floor(elapsedSec / 3600);
    const mins = Math.floor((elapsedSec % 3600) / 60);
    subStatusText = hrs > 0 ? `เกิดแล้ว (+${hrs} ชม. ${mins} นาที)` : `เกิดแล้ว (+${mins} นาที)`;
    subStatusColor = 'text-rose-400';
  } else if (timeInfo.isSoon) {
    subStatusText = `กำลังจะเกิด (อีก ${timeInfo.text})`;
    subStatusColor = 'text-amber-400 font-semibold';
  } else if (boss.nextSpawnAt) {
    subStatusText = `นับถอยหลัง (${timeInfo.text})`;
    subStatusColor = 'text-slate-400';
  } else {
    subStatusText = 'ยังไม่ระบุเวลา';
    subStatusColor = 'text-slate-500';
  }

  return (
    <tr className="border-b border-slate-800/80 hover:bg-slate-900/60 transition group">
      {/* 1. Star / Pin */}
      <td className="py-3 px-3 sm:px-4 w-10 text-center">
        <button
          onClick={() => onTogglePin(boss.id)}
          title={boss.pinned ? 'ยกเลิกการปักหมุด' : 'ปักหมุดไว้บนสุด'}
          className="transition transform active:scale-125 focus:outline-none"
        >
          <Star
            className={`w-4 h-4 sm:w-5 sm:h-5 ${
              boss.pinned
                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                : 'text-slate-600 hover:text-amber-400/60'
            }`}
          />
        </button>
      </td>

      {/* 2. ชื่อบอส / เซิร์ฟเวอร์ */}
      <td className="py-3 px-2 sm:px-4">
        <div className="flex flex-col gap-1">
          {/* Top line: #number + Boss Name + Server Badge + Status Badge */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Number Pill */}
            {boss.bossNumber && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-900 text-sky-400 border border-sky-500/30">
                #{boss.bossNumber}
              </span>
            )}

            {/* Boss Name */}
            <span className="font-bold text-sm sm:text-base text-slate-100 group-hover:text-amber-300 transition">
              {boss.name}
            </span>

            {/* Server Badge & Tag */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold cursor-pointer hover:ring-1 hover:ring-amber-400/50 ${
                isMain
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/40'
                  : 'bg-purple-500/10 text-purple-300 border border-purple-500/40'
              }`}
              onClick={() => onEdit(boss)}
              title="คลิกเพื่อแก้ไขชื่อ/แท็กเซิร์ฟเวอร์"
            >
              {isMain ? <ShieldAlert className="w-3 h-3" /> : <Swords className="w-3 h-3" />}
              <span>{boss.serverTag ? `${isMain ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง'} [${boss.serverTag}]` : (isMain ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง')}</span>
            </span>

            {/* Status Pill */}
            {timeInfo.isAlive ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60 animate-pulse">
                เกิดแล้ว
              </span>
            ) : timeInfo.isSoon ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-600/60 animate-bounce">
                เร็วๆ นี้
              </span>
            ) : null}
          </div>

          {/* Subline: Location */}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{boss.location || 'ยังไม่ระบุสถานที่'}</span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-slate-500">รอบ {(boss.respawnMinutes / 60).toFixed(1)} ชม.</span>
          </div>
        </div>
      </td>

      {/* 3. เวลาเกิด GMT+7 (แก้ไขได้) */}
      <td className="py-3 px-2 sm:px-4 whitespace-nowrap">
        <div className="flex flex-col items-start sm:items-center">
          {isEditingTime ? (
            <div className="flex items-center gap-1 animate-fade-in">
              <input
                type="time"
                value={inlineTime}
                onChange={(e) => setInlineTime(e.target.value)}
                className="px-2 py-0.5 bg-slate-950 border border-amber-500 rounded text-xs text-white font-mono focus:outline-none"
                autoFocus
              />
              {/* Save Button */}
              <button
                type="button"
                onClick={handleInlineTimeSubmit}
                className="p-1 bg-amber-600 hover:bg-amber-500 text-white rounded transition shadow-sm active:scale-95"
                title="บันทึกเวลา"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              {/* Reset to --:-- button */}
              <button
                type="button"
                onClick={() => {
                  if (onQuickUpdateTime) {
                    onQuickUpdateTime(boss.id, null);
                  }
                  setIsEditingTime(false);
                }}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 rounded text-[11px] font-bold transition flex items-center gap-1 active:scale-95"
                title="รีเซ็ตเวลาเป็น --:-- (ไม่ทราบเวลา)"
              >
                <RotateCcw className="w-3 h-3 text-rose-400" />
                <span className="font-mono">--:--</span>
              </button>
              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => setIsEditingTime(false)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition text-xs"
                title="ยกเลิก"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 group/btn">
              <button
                onClick={() => {
                  setInlineTime(() => {
                    if (!boss.nextSpawnAt) {
                      const d = new Date();
                      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                    }
                    const d = new Date(boss.nextSpawnAt);
                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                  });
                  setIsEditingTime(true);
                }}
                title="คลิกเพื่อแก้ไขเวลาเกิด"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950/90 border border-slate-700/80 hover:border-amber-500 text-slate-100 hover:text-amber-300 text-xs sm:text-sm font-bold font-mono transition group/time"
              >
                <span>{formattedSpawnTime}</span>
                <Clock className="w-3.5 h-3.5 text-slate-400 group-hover/time:text-amber-400" />
                <span className="text-slate-400 text-xs font-normal">น.</span>
              </button>

              {/* Quick Reset Button right next to time when boss has a time set */}
              {boss.nextSpawnAt && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickUpdateTime) {
                      onQuickUpdateTime(boss.id, null);
                    }
                  }}
                  className="opacity-40 group-hover/btn:opacity-100 p-1 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded transition border border-transparent hover:border-rose-800/40"
                  title="รีเซ็ตเวลากลับเป็น --:--"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Sub-status (เกิดแล้ว +X ชม. Y นาที หรือ เหลืออีก...) */}
          <span className={`text-[11px] mt-1 font-mono-num ${subStatusColor}`}>
            {subStatusText}
          </span>
        </div>
      </td>

      {/* 4. อัปเดตเวลา (เวลาล่าสุด + รอบเกิด) */}
      <td className="py-3 px-2 sm:px-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          {/* Main Orange Update Button */}
          <button
            onClick={() => onKillNow(boss.id)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md shadow-amber-500/20 active:scale-95 transition"
            title="บันทึกเวลาบอสโดนเดี๋ยวนี้ (คำนวณรอบเกิดถัดไปทันที)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>อัปเดต</span>
          </button>

          {/* Quick Adjust Button */}
          <button
            onClick={() => onEdit(boss)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition"
            title="ปรับเวลาหรือรอบเกิด"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>

      {/* 5. เครื่องมือ */}
      <td className="py-3 px-2 sm:px-4 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1">
          {onTestSound && (
            <button
              onClick={() => onTestSound(boss)}
              title="ทดสอบเสียงเตือนบอสตัวนี้"
              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => onEdit(boss)}
            title="แก้ไขข้อมูลบอส"
            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};
