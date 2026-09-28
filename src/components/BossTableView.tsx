import React from 'react';
import { Boss } from '../types/boss';
import { BossTableRow } from './BossTableRow';
import { Star, Shield, RotateCcw } from 'lucide-react';

interface BossTableViewProps {
  bosses: Boss[];
  onKillNow: (bossId: string) => void;
  onEdit: (boss: Boss) => void;
  onTogglePin: (bossId: string) => void;
  onTestSound?: (boss: Boss) => void;
  onQuickUpdateTime?: (bossId: string, newTimeStr: string | null) => void;
  onOpenResetAll?: () => void;
}

export const BossTableView: React.FC<BossTableViewProps> = ({
  bosses,
  onKillNow,
  onEdit,
  onTogglePin,
  onTestSound,
  onQuickUpdateTime,
  onOpenResetAll,
}) => {
  if (bosses.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 my-4">
        <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-200">ไม่พบบอสในรายการนี้</h3>
        <p className="text-xs text-slate-400 mt-1">
          ลองเลือกเซิร์ฟเวอร์อื่น หรือพิมพ์ค้นหาใหม่อีกครั้ง
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0d111c] shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          {/* Table Header matching screenshot */}
          <thead>
            <tr className="border-b border-slate-800 bg-[#090d16] text-xs font-bold text-slate-400">
              <th className="py-3.5 px-3 sm:px-4 w-12 text-center">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 mx-auto" />
              </th>
              <th className="py-3.5 px-2 sm:px-4">
                ชื่อบอส / เซิร์ฟเวอร์
              </th>
              <th className="py-3.5 px-2 sm:px-4 text-center">
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span>เวลาเกิด GMT+7</span>
                  <span className="text-[10px] text-slate-500 font-normal">(แก้ไขได้)</span>
                  {onOpenResetAll && (
                    <button
                      type="button"
                      onClick={onOpenResetAll}
                      className="ml-1 px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900/90 text-rose-300 text-[10px] border border-rose-800/50 font-bold transition flex items-center gap-1 shadow-sm active:scale-95"
                      title="รีเซ็ตเวลาบอสทั้งหมดเป็น --:--"
                    >
                      <RotateCcw className="w-2.5 h-2.5 text-rose-400" />
                      <span>รีเซ็ตทั้งหมด</span>
                    </button>
                  )}
                </div>
              </th>
              <th className="py-3.5 px-2 sm:px-4">
                อัปเดตเวลา <span className="text-[10px] text-slate-500 font-normal">(เวลาล่าสุด + รอบเกิด)</span>
              </th>
              <th className="py-3.5 px-2 sm:px-4 text-center w-24">
                เครื่องมือ
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {bosses.map((boss) => (
              <BossTableRow
                key={boss.id}
                boss={boss}
                onKillNow={onKillNow}
                onEdit={onEdit}
                onTogglePin={onTogglePin}
                onTestSound={onTestSound}
                onQuickUpdateTime={onQuickUpdateTime}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
