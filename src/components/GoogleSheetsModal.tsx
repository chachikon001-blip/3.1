import React, { useState } from 'react';
import { SheetConfig, Boss } from '../types/boss';
import { 
  X, 
  TableProperties, 
  ExternalLink, 
  Download, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert,
  Swords,
  Sparkles
} from 'lucide-react';
import { fetchPublicGoogleSheet, fetchSheetsDataWithOAuth, writeBossesToGoogleSheet, convertSheetRowsToBosses } from '../services/googleSheets';
import { googleSignIn, getAccessToken } from '../services/firebase';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetConfig: SheetConfig;
  bosses: Boss[];
  onImportBosses: (imported: Boss[]) => void;
  onUpdateSheetConfig: (config: Partial<SheetConfig>) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  sheetConfig,
  bosses,
  onImportBosses,
  onUpdateSheetConfig,
}) => {
  if (!isOpen) return null;

  const [sheetId, setSheetId] = useState(sheetConfig.sheetId || '1v9JBi82XouNyp9VotX9n4Kix4JX5EfXFrIJoXU-fCuc');
  const [mainGid, setMainGid] = useState(sheetConfig.mainGid || '1587945636');
  const [subGid, setSubGid] = useState(sheetConfig.subGid || '82332950');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Target server for write operations ('main' | 'sub' | 'all')
  const [targetExportServer, setTargetExportServer] = useState<'main' | 'sub' | 'all'>('all');
  const [showConfirmWrite, setShowConfirmWrite] = useState(false);

  const mainSheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${mainGid}`;
  const subSheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${subGid}`;

  // Import data from sheet (for main, sub, or both)
  const handleImport = async (target: 'main' | 'sub' | 'all') => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const gidsToFetch: Array<{ server: 'main' | 'sub'; gid: string }> = [];
      if (target === 'main' || target === 'all') gidsToFetch.push({ server: 'main', gid: mainGid });
      if (target === 'sub' || target === 'all') gidsToFetch.push({ server: 'sub', gid: subGid });

      let allImported: Boss[] = [];

      for (const item of gidsToFetch) {
        let rows: string[][] = [];
        const token = await getAccessToken();

        if (token) {
          try {
            rows = await fetchSheetsDataWithOAuth(sheetId, 'A1:H100');
          } catch (oauthErr) {
            console.warn('OAuth fetch failed, trying public export fallback:', oauthErr);
            rows = await fetchPublicGoogleSheet(sheetId, item.gid);
          }
        } else {
          rows = await fetchPublicGoogleSheet(sheetId, item.gid);
        }

        if (rows && rows.length > 0) {
          const parsed = convertSheetRowsToBosses(rows, item.server).map(b => ({
            ...b,
            server: item.server,
            serverTag: b.serverTag || (item.server === 'main' ? 'T3' : 'S1'),
          }));
          allImported = [...allImported, ...parsed];
        }
      }

      if (allImported.length > 0) {
        if (target === 'all') {
          onImportBosses(allImported);
        } else {
          // Merge keeping other server
          const otherBosses = bosses.filter(b => b.server !== target);
          onImportBosses([...otherBosses, ...allImported]);
        }

        onUpdateSheetConfig({ 
          sheetId, 
          mainGid, 
          subGid, 
          lastSyncedAt: new Date().toISOString() 
        });

        setStatusMsg({
          type: 'success',
          text: `นำเข้าข้อมูลบอสสำเร็จ ${allImported.length} ตัวจาก Google Sheet (${target === 'all' ? 'ทั้ง 2 เซิร์ฟ' : target === 'main' ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง'})!`,
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: 'ไม่พบแถวข้อมูลบอสในชีต กรุณาตรวจสอบว่าชีตเปิดสิทธิ์แชร์หรือตรวจสอบ GID ให้ถูกต้อง',
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล';
      setStatusMsg({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  // Perform write to sheet after explicit confirmation dialog
  const executeWriteToSheet = async () => {
    setShowConfirmWrite(false);
    setLoading(true);
    setStatusMsg(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        const signResult = await googleSignIn();
        token = signResult?.accessToken || null;
      }

      if (!token) {
        setStatusMsg({ type: 'error', text: 'กรุณาเข้าสู่ระบบ Google เพื่ออนุญาตการเขียนข้อมูลลงชีต' });
        setLoading(false);
        return;
      }

      // Filter bosses to write
      const bossesToWrite = targetExportServer === 'all' 
        ? bosses 
        : bosses.filter(b => b.server === targetExportServer);

      await writeBossesToGoogleSheet(sheetId, bossesToWrite, targetExportServer);

      onUpdateSheetConfig({ 
        sheetId, 
        mainGid, 
        subGid, 
        lastSyncedAt: new Date().toISOString() 
      });

      setStatusMsg({
        type: 'success',
        text: `บันทึกข้อมูลบอส ${bossesToWrite.length} ตัวลง Google Sheet เรียบร้อยแล้ว!`,
      });
    } catch (err: unknown) {
      let errMsg = err instanceof Error ? err.message : 'ไม่สามารถเขียนข้อมูลลง Google Sheet ได้';
      if (errMsg.includes('insufficient authentication scopes') || errMsg.includes('insufficient') || errMsg.includes('PERMISSION_DENIED')) {
        errMsg = 'สิทธิ์การเข้าถึง Google Sheets หมดอายุหรือยังไม่ได้รับอนุญาต กรุณากด "เข้าสู่ระบบด้วย Google" ที่ด้านบนเพื่อยินยอมสิทธิ์ Google Sheets';
      }
      setStatusMsg({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleStartExport = (server: 'main' | 'sub' | 'all') => {
    setTargetExportServer(server);
    setShowConfirmWrite(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <TableProperties className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">เชื่อมต่อ Google Sheets</h2>
                <p className="text-xs text-slate-400">ซิงค์เวลาเกิดบอสแบบสองทิศทาง (เซิร์ฟหลัก & เซิร์ฟรอง)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Sheet Link info: Main Server & Sub Server */}
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>ชีตเซิร์ฟหลัก (Main Server GID: {mainGid})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">gid={mainGid}</div>
                </div>
                <a
                  href={mainSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-xs font-semibold inline-flex items-center gap-1 border border-blue-500/30"
                >
                  <span>เปิดชีตเซิร์ฟหลัก</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                    <Swords className="w-4 h-4" />
                    <span>ชีตเซิร์ฟรอง (Sub Server GID: {subGid})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">gid={subGid}</div>
                </div>
                <a
                  href={subSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-xs font-semibold inline-flex items-center gap-1 border border-purple-500/30"
                >
                  <span>เปิดชีตเซิร์ฟรอง</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Inputs: Sheet ID, Main GID, Sub GID */}
            <div className="space-y-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-300 mb-1">
                    GID เซิร์ฟหลัก
                  </label>
                  <input
                    type="text"
                    value={mainGid}
                    onChange={(e) => setMainGid(e.target.value)}
                    placeholder="1587945636"
                    className="w-full px-3 py-2 bg-slate-900 border border-blue-500/40 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-300 mb-1">
                    GID เซิร์ฟรอง
                  </label>
                  <input
                    type="text"
                    value={subGid}
                    onChange={(e) => setSubGid(e.target.value)}
                    placeholder="82332950"
                    className="w-full px-3 py-2 bg-slate-900 border border-purple-500/40 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>

            {/* Column Mapping Indicator */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 text-xs">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <span>📋 โครงสร้างคอลัมน์สเปรดชีต (ตรงตามชีตจริง):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-slate-300 font-mono">
                <span className="p-1 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-amber-400">A:</strong> ชื่อบอส (Name)
                </span>
                <span className="p-1 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-amber-400">B:</strong> รอบเกิด ชม. (Hr.)
                </span>
                <span className="p-1 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-amber-400">C:</strong> วันที่ตาย (Date)
                </span>
                <span className="p-1 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-amber-400">D:</strong> ชม. ที่ตาย (Hour)
                </span>
                <span className="p-1 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-amber-400">E:</strong> นาที ที่ตาย (Min)
                </span>
                <span className="p-1 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-amber-400">G:</strong> เวลาเกิดใหม่ (GMT+7)
                </span>
              </div>
            </div>

            {/* Status Feedback */}
            {statusMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
              }`}>
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Import Actions */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200 block">
                📥 ดึงข้อมูลเข้าแอป (Import from Google Sheets):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleImport('main')}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-blue-500/30 text-xs font-semibold text-blue-300 transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดึงเซิร์ฟหลัก ({mainGid})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleImport('sub')}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-purple-500/30 text-xs font-semibold text-purple-300 transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดึงเซิร์ฟรอง ({subGid})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleImport('all')}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-xs font-bold text-emerald-300 transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ดึงทั้ง 2 เซิร์ฟ</span>
                </button>
              </div>
            </div>

            {/* Export Actions (triggers confirmation modal) */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-200 block">
                📤 ส่งออกข้อมูลไปยังชีต (Export to Google Sheets):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStartExport('main')}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-blue-950/50 hover:bg-blue-900/60 border border-blue-500/40 text-xs font-semibold text-blue-200 transition flex items-center justify-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>ส่งออกเซิร์ฟหลัก</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartExport('sub')}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-xs font-semibold text-purple-200 transition flex items-center justify-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>ส่งออกเซิร์ฟรอง</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartExport('all')}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-xs font-bold text-emerald-300 transition flex items-center justify-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>ส่งออกทั้ง 2 เซิร์ฟ</span>
                </button>
              </div>
            </div>

            {sheetConfig.lastSyncedAt && (
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800">
                <span>ซิงค์ล่าสุดเมื่อ:</span>
                <span className="font-mono-num text-slate-400">
                  {new Date(sheetConfig.lastSyncedAt).toLocaleString('th-TH')}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>

      {/* MANDATORY Confirmation Dialog before updating Google Sheet */}
      {showConfirmWrite && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">ยืนยันการบันทึกข้อมูลลง Google Sheet</h3>
                <p className="text-xs text-amber-300">
                  กำลังจะเขียนข้อมูล {targetExportServer === 'all' ? 'ทั้งหมด' : targetExportServer === 'main' ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง'} ลงในสเปรดชีต
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <p>
                คุณกำลังจะส่งออกข้อมูลบอสจำนวน{' '}
                <strong className="text-white">
                  {targetExportServer === 'all'
                    ? bosses.length
                    : bosses.filter((b) => b.server === targetExportServer).length}{' '}
                  ตัว
                </strong>{' '}
                ไปยัง Google Sheet ID:
              </p>
              <p className="font-mono text-emerald-400 text-[11px] break-all">{sheetId}</p>
              <p className="text-slate-400 text-[11px]">
                เป้าหมาย GID: {targetExportServer === 'sub' ? subGid : mainGid}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmWrite(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                type="button"
                onClick={executeWriteToSheet}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันการเขียนข้อมูลลงชีต</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
