import React, { useState } from 'react';
import { Boss, ServerType, SheetConfig } from '../types/boss';
import { 
  X, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  TableProperties, 
  Clock 
} from 'lucide-react';
import { writeBossesToGoogleSheet } from '../services/googleSheets';
import { getAccessToken } from '../services/firebase';
import { getApiUrl } from '../services/apiConfig';

interface ResetAllTimesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bosses: Boss[];
  currentServer: ServerType | 'all';
  mainServerTag?: string;
  subServerTag?: string;
  sheetConfig?: SheetConfig;
  currentUserName?: string;
  onResetComplete: (updatedBosses: Boss[]) => void;
}

export const ResetAllTimesModal: React.FC<ResetAllTimesModalProps> = ({
  isOpen,
  onClose,
  bosses,
  currentServer,
  mainServerTag = 'T3',
  subServerTag = 'S1',
  sheetConfig,
  currentUserName = 'สมาชิก',
  onResetComplete,
}) => {
  // If user opened modal while on sub server, default to sub server!
  const [targetServer, setTargetServer] = useState<ServerType | 'all'>(
    currentServer === 'sub' ? 'sub' : currentServer === 'main' ? 'main' : 'sub'
  );
  const [syncToSheet, setSyncToSheet] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Filter bosses by target server
  const targetBosses = targetServer === 'all' 
    ? bosses 
    : bosses.filter((b) => b.server === targetServer);

  const activeTimeCount = targetBosses.filter((b) => b.nextSpawnAt !== null).length;
  const serverLabel = targetServer === 'all' 
    ? 'ทุกเซิร์ฟเวอร์' 
    : targetServer === 'sub' 
      ? `เซิร์ฟรอง [${subServerTag}]` 
      : `เซิร์ฟหลัก [${mainServerTag}]`;

  const handleExecuteResetAll = async () => {
    setLoading(true);
    setStatusMsg(null);

    try {
      // 1. Call server API
      const res = await fetch(getApiUrl('/api/bosses/reset-times'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: targetServer,
          resetBy: currentUserName,
        }),
      });

      if (!res.ok) {
        throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อรีเซ็ตเวลาได้');
      }

      const resData = await res.json();
      const updatedBosses: Boss[] = resData.bosses || bosses.map((b) => {
        if (targetServer === 'all' || b.server === targetServer) {
          return {
            ...b,
            nextSpawnAt: null,
            lastKilledAt: null,
            notifiedStages: [],
          };
        }
        return b;
      });

      // 2. Sync to Google Sheets if requested
      if (syncToSheet && sheetConfig?.sheetId) {
        try {
          const token = await getAccessToken();
          if (token) {
            const bossesToWrite = targetServer === 'all'
              ? updatedBosses
              : updatedBosses.filter((b) => b.server === targetServer);
            await writeBossesToGoogleSheet(sheetConfig.sheetId, bossesToWrite);
          }
        } catch (sheetErr) {
          console.warn('Sheet sync on reset error:', sheetErr);
        }
      }

      onResetComplete(updatedBosses);
      setStatusMsg({
        type: 'success',
        text: `รีเซ็ตเวลาเกิดของบอสใน ${serverLabel} (${targetBosses.length} ตัว) เป็น --:-- เรียบร้อยแล้ว`,
      });

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการรีเซ็ตเวลา';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 shadow-sm">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">รีเซ็ตเวลาทั้งหมดเป็น --:--</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ล้างเวลารอข้อมูลใหม่
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ล้างเวลาเกิดของบอสทุกตัวให้กลับมาแสดงเป็น <strong>--:--</strong> (ไม่ทราบเวลา)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs animate-fade-in ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Server Selector */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-rose-400" />
              <span>เลือกเซิร์ฟเวอร์ที่ต้องการรีเซ็ตเวลา:</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'sub', label: `เซิร์ฟรอง [${subServerTag}]`, desc: 'Invasion' },
                { id: 'main', label: `เซิร์ฟหลัก [${mainServerTag}]`, desc: 'Main' },
                { id: 'all', label: 'ทุกเซิร์ฟเวอร์', desc: 'ทั้งสองเซิร์ฟ' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setTargetServer(s.id as any)}
                  className={`p-2 rounded-xl text-left border transition ${
                    targetServer === s.id
                      ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">{s.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Warning and Scope Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/30 flex items-start gap-3">
            <Clock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-slate-200">
                ผลกระทบจากการรีเซ็ต ({serverLabel}):
              </div>
              <p className="text-slate-400">
                บอสทั้งหมด <strong className="text-rose-300">{targetBosses.length} ตัว</strong> (มีเวลาที่กำลังนับถอยหลังอยู่ {activeTimeCount} ตัว) จะถูกเปลี่ยนเวลาเกิดกลับเป็น <strong className="font-mono text-white">--:--</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                สมาชิกจะสามารถกดปุ่ม "อัปเดต" หรือกดแก้เวลาบอสเพื่อเริ่มนับรอบเกิดใหม่ได้ทุกเมื่อ
              </p>
            </div>
          </div>

          {/* Sync to Sheet Option */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-slate-200">
                  อัปเดตลง Google Sheets ทันที
                </div>
                <div className="text-[11px] text-slate-500">
                  ล้างเวลาในตารางชีตให้เป็น "ไม่ทราบเวลา" ตรงกัน
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={syncToSheet}
                onChange={(e) => setSyncToSheet(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleExecuteResetAll}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-rose-950/30 transition active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'กำลังรีเซ็ต...' : `↺ ยืนยันรีเซ็ต ${serverLabel}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
