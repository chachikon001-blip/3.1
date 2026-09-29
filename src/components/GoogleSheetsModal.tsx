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
import { 
  fetchPublicGoogleSheet, 
  fetchSheetsDataWithOAuth, 
  writeBossesToGoogleSheet, 
  convertSheetRowsToBosses,
  exportBossesToCSV,
  triggerCSVDownload 
} from '../services/googleSheets';
import { googleSignIn, getAccessToken, logoutGoogle, initAuth } from '../services/firebase';

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
  const [sheetId, setSheetId] = useState(sheetConfig.sheetId || '1v9JBi82XouNyp9VotX9n4Kix4JX5EfXFrIJoXU-fCuc');
  const [mainGid, setMainGid] = useState(sheetConfig.mainGid || '1587945636');
  const [subGid, setSubGid] = useState(sheetConfig.subGid || '82332950');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isGoogleAuthed, setIsGoogleAuthed] = useState<boolean>(false);

  // Target server for write operations ('main' | 'sub' | 'all')
  const [targetExportServer, setTargetExportServer] = useState<'main' | 'sub' | 'all'>('all');
  const [showConfirmWrite, setShowConfirmWrite] = useState(false);

  // Check auth state on load
  React.useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        if (user) {
          setIsGoogleAuthed(true);
          setGoogleEmail(user.email || null);
        } else {
          setIsGoogleAuthed(false);
          setGoogleEmail(null);
        }
      },
      () => {
        setIsGoogleAuthed(false);
        setGoogleEmail(null);
      }
    );
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleConnectGoogle = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await googleSignIn();
      if (res?.user && res?.accessToken) {
        setIsGoogleAuthed(true);
        setGoogleEmail(res.user.email || null);
        setStatusMsg({
          type: 'success',
          text: `เชื่อมต่อบัญชี Google สำเร็จ (${res.user.email}) พร้อมใช้งานสิทธิ์เขียน/อ่าน Google Sheets`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อ Google ได้';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    await logoutGoogle();
    setIsGoogleAuthed(false);
    setGoogleEmail(null);
    setStatusMsg({
      type: 'success',
      text: 'ตัดการเชื่อมต่อ Google Sheets แล้ว',
    });
  };

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

  // Download CSV directly for easy Excel / Google Sheets import
  const handleDownloadCSV = (server: 'main' | 'sub' | 'all') => {
    try {
      const csv = exportBossesToCSV(bosses, server);
      const serverLabel = server === 'all' ? 'both-servers' : server === 'main' ? 'main-server-t3' : 'sub-server-s1';
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      triggerCSVDownload(csv, `boss-timer-${serverLabel}-${dateStr}.csv`);
      setStatusMsg({
        type: 'success',
        text: `ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว! สามารถเปิดใน Excel หรือกด "นำเข้า" ใน Google Sheet ได้ทันทีโดยไม่ต้องเชื่อมต่อ API`,
      });
    } catch {
      setStatusMsg({ type: 'error', text: 'ไม่สามารถสร้างไฟล์ CSV ได้' });
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
        // Trigger Google Sign In popup to request spreadsheet OAuth token
        const signResult = await googleSignIn();
        token = signResult?.accessToken || null;
        if (signResult?.user?.email) {
          setGoogleEmail(signResult.user.email);
          setIsGoogleAuthed(true);
        }
      }

      if (!token) {
        setStatusMsg({
          type: 'error',
          text: 'กรุณาเชื่อมต่อบัญชี Google เพื่ออนุญาตการเขียนข้อมูลลง Google Sheets หรือใช้ปุ่ม "ดาวน์โหลด CSV สำหรับชีต"',
        });
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
      const errMsg = err instanceof Error ? err.message : 'ไม่สามารถเขียนข้อมูลลง Google Sheet ได้';
      setStatusMsg({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleStartExport = (server: 'main' | 'sub' | 'all') => {
    setTargetExportServer(server);
    setShowConfirmWrite(true);
  };

  if (!isOpen) return null;

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

            {/* Google OAuth Authorization Banner */}
            {isGoogleAuthed ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-300">
                      เชื่อมต่อสิทธิ์ Google Sheets แล้ว (OAuth สำเร็จ)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[220px] sm:max-w-xs">
                      บัญชี: <span className="text-slate-200 font-mono">{googleEmail || 'Google User'}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  disabled={loading}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-red-400 text-xs font-medium border border-slate-700 transition shrink-0"
                >
                  ตัดการเชื่อมต่อ
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>🔐 สิทธิ์ Google Sheets OAuth (สำหรับเขียนข้อมูลลงชีต)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    เชื่อมต่อบัญชี Google เพื่อให้แอปเขียนข้อมูลเวลาเกิดบอสลง Google Sheets ได้
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>เชื่อมต่อสิทธิ์ Google</span>
                </button>
              </div>
            )}

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

            {/* Quick CSV Download (Zero friction for Google Sheets) */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>ดาวน์โหลดไฟล์ CSV (เปิดใน Google Sheets / Excel ได้ทันที):</span>
                </span>
                <span className="text-[10px] text-slate-500">ไม่ต้องใช้รหัสผ่าน Google</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadCSV('main')}
                  className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>CSV เซิร์ฟหลัก</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCSV('sub')}
                  className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>CSV เซิร์ฟรอง</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCSV('all')}
                  className="py-2 px-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-xs font-bold text-amber-300 transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>CSV ทั้ง 2 เซิร์ฟ</span>
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
