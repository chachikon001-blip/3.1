import React, { useState, useMemo } from 'react';
import { Boss, ServerType, SheetConfig } from '../types/boss';
import { 
  X, 
  RotateCcw, 
  Clock, 
  Calendar, 
  Server, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Search,
  SlidersHorizontal,
  TableProperties
} from 'lucide-react';
import { 
  DEFAULT_REBOOT_RULES, 
  findRebootRule, 
  calculateRebootSpawnTime, 
  RebootRule 
} from '../services/rebootRules';
import { writeBossesToGoogleSheet, writeRebootTimeToGoogleSheet } from '../services/googleSheets';
import { getAccessToken } from '../services/firebase';
import { getApiUrl } from '../services/apiConfig';

interface ServerRebootModalProps {
  isOpen: boolean;
  onClose: () => void;
  bosses: Boss[];
  currentServer: ServerType | 'all';
  mainServerTag?: string;
  subServerTag?: string;
  sheetConfig?: SheetConfig;
  currentUserName?: string;
  onRebootComplete: (updatedBosses: Boss[]) => void;
}

export const ServerRebootModal: React.FC<ServerRebootModalProps> = ({
  isOpen,
  onClose,
  bosses,
  currentServer,
  mainServerTag = 'T3',
  subServerTag = 'S1',
  sheetConfig,
  currentUserName = 'สมาชิก',
  onRebootComplete,
}) => {
  // Target server for reboot
  const [targetServer, setTargetServer] = useState<ServerType | 'all'>(
    currentServer === 'all' ? 'all' : currentServer
  );

  // Helper to format today's date YYYY-MM-DD in Asia/Bangkok
  const getTodayBkk = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    return parts; // YYYY-MM-DD
  };

  // Helper to format current time HH:mm in Asia/Bangkok
  const getTimeBkk = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
    return parts; // HH:mm
  };

  const [rebootDate, setRebootDate] = useState<string>(getTodayBkk());
  const [rebootTime, setRebootTime] = useState<string>(getTimeBkk());
  const [unmatchedMode, setUnmatchedMode] = useState<'respawn_cycle' | 'immediate' | 'clear'>('respawn_cycle');
  const [syncToSheet, setSyncToSheet] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [customHours, setCustomHours] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter bosses by target server
  const filteredBosses = useMemo(() => {
    if (targetServer === 'all') return bosses;
    return bosses.filter((b) => b.server === targetServer);
  }, [bosses, targetServer]);

  // Calculate live preview for each boss
  const previewList = useMemo(() => {
    return filteredBosses.map((boss) => {
      const rule = findRebootRule(boss.name, DEFAULT_REBOOT_RULES);
      const customH = customHours[boss.id];
      const hasRule = rule !== null;

      let effectiveHours = customH !== undefined 
        ? customH 
        : hasRule 
          ? rule.hours 
          : (boss.respawnMinutes / 60);

      // Handle spawn time calculation
      let calculatedTime = '-';
      let calculatedDate = '-';
      let nextSpawnIso: string | null = null;

      if (hasRule || customH !== undefined) {
        const res = calculateRebootSpawnTime(rebootDate, rebootTime, effectiveHours);
        calculatedTime = res.formattedTime;
        calculatedDate = res.formattedDate;
        nextSpawnIso = res.spawnIso;
      } else {
        if (unmatchedMode === 'respawn_cycle') {
          const res = calculateRebootSpawnTime(rebootDate, rebootTime, boss.respawnMinutes / 60);
          calculatedTime = res.formattedTime;
          calculatedDate = res.formattedDate;
          nextSpawnIso = res.spawnIso;
        } else if (unmatchedMode === 'immediate') {
          const res = calculateRebootSpawnTime(rebootDate, rebootTime, 0);
          calculatedTime = res.formattedTime;
          calculatedDate = res.formattedDate;
          nextSpawnIso = res.spawnIso;
        } else {
          calculatedTime = 'ยังไม่ระบุ';
          calculatedDate = '-';
          nextSpawnIso = null;
        }
      }

      return {
        boss,
        rule,
        hasRule,
        effectiveHours,
        calculatedTime,
        calculatedDate,
        nextSpawnIso,
      };
    });
  }, [filteredBosses, customHours, rebootDate, rebootTime, unmatchedMode]);

  // Search filter
  const displayedPreview = useMemo(() => {
    if (!searchFilter.trim()) return previewList;
    const q = searchFilter.toLowerCase().trim();
    return previewList.filter(
      (item) =>
        item.boss.name.toLowerCase().includes(q) ||
        (item.rule?.bossName && item.rule.bossName.toLowerCase().includes(q))
    );
  }, [previewList, searchFilter]);

  // Count rules
  const matchedCount = useMemo(() => previewList.filter((p) => p.hasRule).length, [previewList]);

  // Quick Time fill helpers
  const handleQuickTime = (type: 'now' | 'sheet' | 'plus5' | 'plus10') => {
    if (type === 'now') {
      setRebootDate(getTodayBkk());
      setRebootTime(getTimeBkk());
    } else if (type === 'sheet') {
      setRebootTime('21:42');
    } else if (type === 'plus5' || type === 'plus10') {
      const [h, m] = rebootTime.split(':').map(Number);
      const d = new Date();
      d.setHours(h);
      d.setMinutes(m + (type === 'plus5' ? 5 : 10));
      const pad = (n: number) => String(n).padStart(2, '0');
      setRebootTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  };

  // Perform Server Reboot
  const handleExecuteReboot = async () => {
    setLoading(true);
    setStatusMsg(null);

    try {
      // 1. Prepare reboot timestamp ISO in Bangkok timezone
      const [year, month, day] = rebootDate.split('-').map(Number);
      const [hour, min] = rebootTime.split(':').map(Number);
      const rebootDateTime = new Date(year, month - 1, day, hour, min, 0, 0);
      const rebootIso = rebootDateTime.toISOString();

      const [dayStr, monthStr, yearStr] = [
        String(day).padStart(2, '0'),
        String(month).padStart(2, '0'),
        String(year),
      ];
      const rebootDateFormatted = `${dayStr}/${monthStr}/${yearStr}`;
      const rebootTimeFormatted = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

      // 2. Build updated bosses array
      const updatedTargetBosses: Boss[] = previewList.map((item) => {
        const { boss, nextSpawnIso, hasRule, effectiveHours } = item;
        return {
          ...boss,
          lastKilledAt: rebootIso,
          nextSpawnAt: nextSpawnIso,
          killedBy: `รีบูทเซิร์ฟเวอร์ (${currentUserName})`,
          notifiedStages: [],
          notes: hasRule 
            ? `รีบูทเซิร์ฟเวอร์ +${effectiveHours} ชม. (ช่อง P)` 
            : boss.notes,
        };
      });

      // Merge with non-target bosses if single server was chosen
      let fullUpdatedBosses: Boss[] = [];
      if (targetServer === 'all') {
        fullUpdatedBosses = updatedTargetBosses;
      } else {
        const otherServerBosses = bosses.filter((b) => b.server !== targetServer);
        fullUpdatedBosses = [...otherServerBosses, ...updatedTargetBosses];
      }

      // 3. Send to Server API
      const response = await fetch(getApiUrl('/api/server/reboot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: targetServer,
          rebootTime: rebootIso,
          rebootDateFormatted,
          rebootTimeFormatted,
          rebootedBy: currentUserName,
          bosses: fullUpdatedBosses,
        }),
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถบันทึกสถานะรีบูทลงเซิร์ฟเวอร์ได้');
      }

      // 4. If Google Sheets sync is enabled and sheetId is configured
      if (syncToSheet && sheetConfig?.sheetId) {
        try {
          const token = await getAccessToken();
          if (token) {
            // Write reboot time to Cell N2
            await writeRebootTimeToGoogleSheet(sheetConfig.sheetId, rebootTimeFormatted);

            // Write bosses table to Google Sheets
            const bossesToWrite = targetServer === 'all' 
              ? fullUpdatedBosses 
              : fullUpdatedBosses.filter((b) => b.server === targetServer);
            await writeBossesToGoogleSheet(sheetConfig.sheetId, bossesToWrite);
          }
        } catch (sheetErr) {
          console.warn('Sheet sync on reboot failed:', sheetErr);
        }
      }

      // 5. Update local state & complete
      onRebootComplete(fullUpdatedBosses);
      setStatusMsg({
        type: 'success',
        text: `รีบูทเซิร์ฟเวอร์สำเร็จ! คำนวณเวลาเกิดใหม่ของบอส ${previewList.length} ตัวเรียบร้อยแล้ว`,
      });

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการรีบูทเซิร์ฟเวอร์';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shadow-sm">
              <RotateCcw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">รีบูทเซิร์ฟเวอร์ (Server Reboot)</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ช่อง P จาก Google Sheet
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                รีเซ็ตเวลาเกิดบอสทุกตัวตามเวลาที่เซิร์ฟเวอร์รีบูทเสร็จ และบวกจำนวนชั่วโมงจากช่อง P อัตโนมัติ
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 flex-1">
          {/* Status Message Toast */}
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

          {/* Section 1: Server & DateTime Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Target Server */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-amber-400" />
                <span>เลือกเซิร์ฟเวอร์</span>
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'main', label: mainServerTag || 'เซิร์ฟหลัก' },
                  { id: 'sub', label: subServerTag || 'เซิร์ฟรอง' },
                  { id: 'all', label: 'ทั้งหมด' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTargetServer(s.id as any)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      targetServer === s.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reboot Date */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>วันที่รีบูทเสร็จ</span>
              </label>
              <input
                type="date"
                value={rebootDate}
                onChange={(e) => setRebootDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Reboot Time */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>เวลารีบูทเสร็จ</span>
                </label>
                <span className="text-[10px] text-amber-400 font-mono">GMT+7</span>
              </div>
              <input
                type="time"
                value={rebootTime}
                onChange={(e) => setRebootTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick Fill Buttons for Time */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[11px] mr-1">ปุ่มลัดเวลา:</span>
            <button
              type="button"
              onClick={() => handleQuickTime('now')}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
            >
              ⏱️ เวลาปัจจุบัน
            </button>
            <button
              type="button"
              onClick={() => handleQuickTime('sheet')}
              className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] border border-amber-500/30 transition"
            >
              📋 21:42 (ตามในชีต)
            </button>
            <button
              type="button"
              onClick={() => handleQuickTime('plus5')}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
            >
              +5 นาที
            </button>
            <button
              type="button"
              onClick={() => handleQuickTime('plus10')}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
            >
              +10 นาที
            </button>
          </div>

          {/* Section 2: Strategy for Unmatched Small Bosses */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-300">บอสทั่วไปที่ไม่มีในตารางช่อง P:</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                (เช่น เทมเพสต์, เชอร์ทูบา, เมดูซ่า, เฟลิส ที่ไม่มีระบุในช่อง O & P)
              </p>
            </div>
            <div className="flex gap-1.5 self-stretch sm:self-auto">
              {[
                { id: 'respawn_cycle', label: '+รอบเกิดปกติ (ชม.)' },
                { id: 'immediate', label: 'เกิดทันที' },
                { id: 'clear', label: 'รอระบุเวลา' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setUnmatchedMode(opt.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                    unmatchedMode === opt.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Live Preview Table */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  📋 ผลการคำนวณเวลาเกิดหลังรีบูท ({previewList.length} ตัว):
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  พบในตารางช่อง P: {matchedCount} ตัว
                </span>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อบอส..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="p-2.5 font-semibold">ชื่อบอส</th>
                    <th className="p-2.5 font-semibold text-center">เซิร์ฟ</th>
                    <th className="p-2.5 font-semibold text-center">ช่อง P (+ชม. หลังรีบูท)</th>
                    <th className="p-2.5 font-semibold text-right">เวลาเกิดใหม่คำนวณได้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {displayedPreview.map((item) => {
                    const { boss, rule, hasRule, effectiveHours, calculatedTime, calculatedDate } = item;
                    return (
                      <tr key={boss.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-2 font-sans font-medium text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span>{boss.name}</span>
                            {rule?.probColor === 'green' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                                เกิด 100%
                              </span>
                            )}
                            {rule?.probColor === 'yellow' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans">
                                50%
                              </span>
                            )}
                            {rule?.probColor === 'red' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans">
                                33%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center text-slate-400 text-[11px]">
                          {boss.serverTag || (boss.server === 'main' ? mainServerTag : subServerTag)}
                        </td>
                        <td className="p-2 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            <span className={hasRule ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                              +{effectiveHours} ชม.
                            </span>
                            {hasRule && (
                              <span className="text-[10px] text-emerald-400 font-bold">ช่อง P</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="font-bold text-emerald-400">
                            {calculatedTime} น.
                          </div>
                          <div className="text-[10px] text-slate-500">{calculatedDate}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Google Sheets Sync Checkbox */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-slate-200">
                  อัปเดตเวลารีบูทและผลการคำนวณลง Google Sheets ทันที
                </div>
                <div className="text-[11px] text-slate-500">
                  เขียนเวลาเสร็จลงเซลล์ N2 และบันทึกเวลาเกิดใหม่ของบอสลงตารางชีต
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
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              จะรีเซ็ตเวลาบอส <strong className="text-slate-200">{previewList.length} ตัว</strong> ณ เวลา{' '}
              <strong className="text-amber-300">{rebootDate} {rebootTime} น.</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleExecuteReboot}
              disabled={loading}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'กำลังรีบูทเซิร์ฟเวอร์...' : '⚡ ยืนยันรีบูทเซิร์ฟเวอร์'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
