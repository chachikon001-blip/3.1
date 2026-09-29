import React, { useState } from 'react';
import { Boss } from '../types/boss';
import { X, Clock, Calendar, MapPin, Trash2, Save, RotateCcw } from 'lucide-react';

interface EditBossModalProps {
  boss: Boss | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<Boss> & { id: string }) => void;
  onDelete?: (bossId: string) => void;
}

export const EditBossModal: React.FC<EditBossModalProps> = ({
  boss,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const toLocalISOString = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [name, setName] = useState(boss?.name || '');
  const [server, setServer] = useState<'main' | 'sub'>(boss?.server || 'main');
  const [serverTag, setServerTag] = useState(boss?.serverTag || (boss?.server === 'main' ? 'T3' : 'S1'));
  const [location, setLocation] = useState(boss?.location || '');
  const [respawnHours, setRespawnHours] = useState(Math.floor((boss?.respawnMinutes || 240) / 60));
  const [respawnMins, setRespawnMins] = useState((boss?.respawnMinutes || 240) % 60);
  const [lastKilledAt, setLastKilledAt] = useState<string>(toLocalISOString(boss?.lastKilledAt || null));
  const [nextSpawnAt, setNextSpawnAt] = useState<string>(toLocalISOString(boss?.nextSpawnAt || null));
  const [notes, setNotes] = useState(boss?.notes || '');

  // Synchronize form when boss prop changes
  React.useEffect(() => {
    if (boss) {
      setName(boss.name);
      setServer(boss.server);
      setServerTag(boss.serverTag || (boss.server === 'main' ? 'T3' : 'S1'));
      setLocation(boss.location);
      setRespawnHours(Math.floor(boss.respawnMinutes / 60));
      setRespawnMins(boss.respawnMinutes % 60);
      setLastKilledAt(toLocalISOString(boss.lastKilledAt));
      setNextSpawnAt(toLocalISOString(boss.nextSpawnAt));
      setNotes(boss.notes || '');
    }
  }, [boss]);

  const totalRespawnMinutes = Number(respawnHours) * 60 + Number(respawnMins);

  // Quick calculate next spawn from killed time
  const handleRecalculateSpawn = () => {
    if (!lastKilledAt) return;
    const killDate = new Date(lastKilledAt);
    const newSpawn = new Date(killDate.getTime() + totalRespawnMinutes * 60 * 1000);
    setNextSpawnAt(toLocalISOString(newSpawn.toISOString()));
  };

  // Quick offset helpers
  const addSpawnMinutes = (mins: number) => {
    const base = nextSpawnAt ? new Date(nextSpawnAt) : new Date();
    const newDate = new Date(base.getTime() + mins * 60 * 1000);
    setNextSpawnAt(toLocalISOString(newDate.toISOString()));
  };

  const handleSetSpawnToNow = () => {
    setNextSpawnAt(toLocalISOString(new Date().toISOString()));
  };

  const handleSave = () => {
    if (!boss) return;
    onSave({
      id: boss.id,
      name,
      server,
      serverTag: serverTag.trim(),
      location,
      respawnMinutes: Math.max(1, totalRespawnMinutes),
      lastKilledAt: lastKilledAt ? new Date(lastKilledAt).toISOString() : null,
      nextSpawnAt: nextSpawnAt ? new Date(nextSpawnAt).toISOString() : null,
      notes,
    });
    onClose();
  };

  if (!isOpen || !boss) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">แก้ไขข้อมูลบอส</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Boss Name & Server & Server Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-300 mb-1">ชื่อบอส</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">เซิร์ฟเวอร์</label>
              <select
                value={server}
                onChange={(e) => setServer(e.target.value as 'main' | 'sub')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="main">เซิร์ฟหลัก</option>
                <option value="sub">เซิร์ฟรอง</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1" title="เช่น T3, S1 (ใช้สำหรับอ่านออกเสียงเตือน)">
                แท็กเซิร์ฟ
              </label>
              <input
                type="text"
                placeholder="เช่น T3"
                value={serverTag}
                onChange={(e) => setServerTag(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-amber-500/50 rounded-lg text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Location & Respawn Cooldown (2 separate boxes: Hours & Minutes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-rose-400" />
                สถานที่ / แมพ
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                รอบเวลาเกิด (ใส่ 2 ช่อง: ชม. และ นาที)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={respawnHours}
                    onChange={(e) => setRespawnHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full pl-3 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    ชม.
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={respawnMins}
                    onChange={(e) => setRespawnMins(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                    className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    นาที
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-amber-400/80 mt-1">
                รวมทั้งหมด: {totalRespawnMinutes} นาที
              </div>
            </div>
          </div>

          {/* Last Killed Time */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                เวลาบอสโดน / ตายล่าสุด
              </label>
              <button
                type="button"
                onClick={handleRecalculateSpawn}
                className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
              >
                คำนวณเวลาเกิดใหม่จากเวลานี้
              </button>
            </div>
            <input
              type="datetime-local"
              value={lastKilledAt}
              onChange={(e) => setLastKilledAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Next Spawn Time */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/30 space-y-2">
            <label className="block text-xs font-semibold text-amber-400">
              <Clock className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
              กำหนดเวลาเกิดรอบถัดไปโดยตรง
            </label>
            <input
              type="datetime-local"
              value={nextSpawnAt}
              onChange={(e) => setNextSpawnAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono-num"
            />
            {/* Quick Adjust Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleSetSpawnToNow}
                className="px-2 py-1 text-xs rounded bg-slate-800 text-emerald-300 hover:bg-emerald-950 border border-emerald-500/30"
              >
                เกิดเดี๋ยวนี้ (Now)
              </button>
              <button
                type="button"
                onClick={() => addSpawnMinutes(10)}
                className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                +10 นาที
              </button>
              <button
                type="button"
                onClick={() => addSpawnMinutes(30)}
                className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                +30 นาที
              </button>
              <button
                type="button"
                onClick={() => addSpawnMinutes(60)}
                className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                +1 ชม.
              </button>
              <button
                type="button"
                onClick={() => setNextSpawnAt('')}
                className="px-2.5 py-1 text-xs rounded bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-bold transition ml-auto"
                title="ล้างเวลาเกิดกลับเป็น --:--"
              >
                <RotateCcw className="w-3 h-3 text-rose-400" />
                <span>รีเซ็ตเป็น --:--</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">บันทึกเพิ่มเติม / เทคนิค</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="เช่น จุดเกิดฝั่งซ้าย, ต้องเตรียมตี้พระ..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/40">
          {onDelete ? (
            <button
              onClick={() => {
                if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบอส "${boss.name}"?`)) {
                  onDelete(boss.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/40 text-xs font-semibold transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>ลบบอสตัวนี้</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-md shadow-amber-600/30"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
