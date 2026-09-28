import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Layers, 
  ShieldAlert, 
  Swords, 
  Table, 
  LayoutGrid, 
  RotateCcw,
  Pencil,
  Check,
  X
} from 'lucide-react';

interface ServerTabsProps {
  currentTab: 'main' | 'sub' | 'all';
  onChangeTab: (tab: 'main' | 'sub' | 'all') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'all' | 'soon' | 'alive' | 'pending';
  onStatusFilterChange: (status: 'all' | 'soon' | 'alive' | 'pending') => void;
  sortBy: 'next_spawn' | 'name' | 'respawn';
  onSortByChange: (sort: 'next_spawn' | 'name' | 'respawn') => void;
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  mainCount: number;
  subCount: number;
  allCount: number;
  mainServerTag?: string;
  subServerTag?: string;
  onUpdateServerTag?: (server: 'main' | 'sub', newTag: string) => void;
  onOpenReboot?: () => void;
  onOpenResetAll?: () => void;
}

export const ServerTabs: React.FC<ServerTabsProps> = ({
  currentTab,
  onChangeTab,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  mainCount,
  subCount,
  allCount,
  mainServerTag = 'T3',
  subServerTag = 'B9',
  onUpdateServerTag,
  onOpenReboot,
  onOpenResetAll,
}) => {
  const [editingServer, setEditingServer] = useState<'main' | 'sub' | null>(null);
  const [tempTag, setTempTag] = useState<string>('');

  const handleStartEdit = (server: 'main' | 'sub', e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingServer(server);
    setTempTag(server === 'main' ? mainServerTag : subServerTag);
  };

  const handleSaveTag = (server: 'main' | 'sub') => {
    const clean = tempTag.trim().toUpperCase();
    if (clean && onUpdateServerTag) {
      onUpdateServerTag(server, clean);
    }
    setEditingServer(null);
  };

  const handlePresetSelect = (server: 'main' | 'sub', preset: string) => {
    if (onUpdateServerTag) {
      onUpdateServerTag(server, preset);
    }
    setEditingServer(null);
  };

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto gap-1">
        {/* Main Server Tab */}
        <div
          onClick={() => onChangeTab('main')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap flex-1 justify-center cursor-pointer select-none ${
            currentTab === 'main'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-blue-300 shrink-0" />
          <span>เซิร์ฟหลัก</span>

          {/* Editable Main Tag */}
          {editingServer === 'main' ? (
            <div
              className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-amber-400 shadow-lg z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={tempTag}
                onChange={(e) => setTempTag(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTag('main');
                  if (e.key === 'Escape') setEditingServer(null);
                }}
                placeholder="T3"
                className="w-14 px-1.5 py-0.5 text-xs font-mono font-bold bg-slate-900 border border-slate-700 rounded text-amber-300 focus:outline-none uppercase"
                autoFocus
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => handleSaveTag('main')}
                className="p-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                title="บันทึกชื่อเซิร์ฟหลัก"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setEditingServer(null)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                title="ยกเลิก"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={(e) => handleStartEdit('main', e)}
              className="group/tag inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-950/70 hover:bg-blue-900/90 text-blue-200 border border-blue-400/40 text-[11px] font-mono font-bold transition hover:scale-105 active:scale-95"
              title="คลิกเพื่อเปลี่ยนชื่อเซิร์ฟหลัก (เช่น T3, B1)"
            >
              <span>[{mainServerTag}]</span>
              <Pencil className="w-2.5 h-2.5 opacity-60 group-hover/tag:opacity-100 text-amber-300" />
            </div>
          )}

          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-blue-200 font-mono-num">
            {mainCount}
          </span>
        </div>

        {/* Sub Server Tab */}
        <div
          onClick={() => onChangeTab('sub')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap flex-1 justify-center cursor-pointer select-none ${
            currentTab === 'sub'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Swords className="w-4 h-4 text-purple-300 shrink-0" />
          <span>เซิร์ฟรอง</span>

          {/* Editable Sub Tag (e.g. B9, S1) */}
          {editingServer === 'sub' ? (
            <div
              className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-amber-400 shadow-lg z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={tempTag}
                onChange={(e) => setTempTag(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTag('sub');
                  if (e.key === 'Escape') setEditingServer(null);
                }}
                placeholder="B9"
                className="w-14 px-1.5 py-0.5 text-xs font-mono font-bold bg-slate-900 border border-slate-700 rounded text-amber-300 focus:outline-none uppercase"
                autoFocus
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => handleSaveTag('sub')}
                className="p-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                title="บันทึกชื่อเซิร์ฟรอง"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setEditingServer(null)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                title="ยกเลิก"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={(e) => handleStartEdit('sub', e)}
              className="group/tag inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/70 hover:bg-purple-900/90 text-purple-200 border border-purple-400/40 text-[11px] font-mono font-bold transition hover:scale-105 active:scale-95"
              title="คลิกเพื่อเปลี่ยนชื่อเซิร์ฟรองทันที (เช่น B9, S1, W4)"
            >
              <span>[{subServerTag}]</span>
              <Pencil className="w-2.5 h-2.5 opacity-60 group-hover/tag:opacity-100 text-amber-300" />
            </div>
          )}

          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-purple-200 font-mono-num">
            {subCount}
          </span>
        </div>

        {/* All Servers Tab */}
        <button
          onClick={() => onChangeTab('all')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap flex-1 justify-center ${
            currentTab === 'all'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-300 shrink-0" />
          <span>ตารางรวมทั้ง 2 เซิร์ฟ</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-amber-200 font-mono-num">
            {allCount}
          </span>
        </button>
      </div>

      {/* Quick Server Switcher Bar if editing */}
      {editingServer && (
        <div className="p-2.5 bg-slate-900/90 border border-amber-500/40 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">
              ⚡ เปลี่ยนชื่อ{editingServer === 'main' ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง'}:
            </span>
            <span className="text-slate-400">
              พิมพ์ชื่อเซิร์ฟใหม่ (เช่น B9, T3, S1) หรือคลิกปุ่มลัด:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(editingServer === 'main'
              ? ['T3', 'T1', 'T2', 'Main']
              : ['B9', 'B1', 'B2', 'S1', 'W4']
            ).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handlePresetSelect(editingServer, code)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-mono font-bold border border-slate-700 transition"
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อบอส, สถานที่, หรือไอเทมดรอป..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'soon' | 'alive' | 'pending')}
              className="w-full sm:w-auto px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="soon">🔥 ใกล้เกิด (&lt; 15 นาที)</option>
              <option value="alive">🟢 เกิดแล้ว (Alive)</option>
              <option value="pending">⏳ ยังไม่เกิด (Pending)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as 'next_spawn' | 'name' | 'respawn')}
              className="w-full sm:w-auto px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="next_spawn">เรียงตาม: เวลาเกิดเร็วสุด</option>
              <option value="name">เรียงตาม: ชื่อบอส (ก-ฮ)</option>
              <option value="respawn">เรียงตาม: ระยะเวลารอบเกิด</option>
            </select>
          </div>

          {/* View Mode Toggle: Table vs Grid */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => onViewModeChange('table')}
              title="มุมมองตาราง (ตามภาพตัวอย่าง)"
              className={`p-1.5 rounded transition ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              title="มุมมองการ์ด (Grid Cards)"
              className={`p-1.5 rounded transition ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Server Reboot Button */}
          {onOpenReboot && (
            <button
              type="button"
              onClick={onOpenReboot}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition shadow-sm shadow-amber-500/10 active:scale-95 whitespace-nowrap"
              title="รีเซ็ตเวลาบอสทั้งหมดตามเวลาเซิร์ฟเวอร์รีบูท (ช่อง P)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ รีบูทเซิร์ฟ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
