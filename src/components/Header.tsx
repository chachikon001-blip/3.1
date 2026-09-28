import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ShieldCheck, 
  TableProperties, 
  Plus, 
  Moon, 
  Sun, 
  Wifi, 
  WifiOff, 
  User, 
  LogOut, 
  Clock, 
  Flame,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';
import { UserAccount } from '../types/boss';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  currentUser: UserAccount | null;
  googleUser: FirebaseUser | null;
  isOnline: boolean;
  isDarkMode: boolean;
  isSoundEnabled?: boolean;
  onToggleSound?: () => void;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenSheets: () => void;
  onOpenReboot?: () => void;
  onOpenAddBoss: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onTestSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  googleUser,
  isOnline,
  isDarkMode,
  isSoundEnabled = true,
  onToggleSound,
  onToggleDarkMode,
  onOpenSettings,
  onOpenAdmin,
  onOpenSheets,
  onOpenReboot,
  onOpenAddBoss,
  onOpenAuth,
  onLogout,
  onTestSound,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Clock */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 p-0.5 shadow-lg shadow-orange-500/20 flex items-center justify-center">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  BOSS TIMER PRO
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  GUILD SYNC
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono-num font-medium text-slate-300">{currentTime} (ICT)</span>
                <span className="text-slate-600">•</span>
                <span className={`inline-flex items-center gap-1 text-[11px] ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isOnline ? (
                    <>
                      <Wifi className="w-3 h-3" />
                      <span className="hidden md:inline">เชื่อมต่อเรียลไทม์</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" />
                      <span>โหมดออฟไลน์</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Toggle Sound ON/OFF */}
            <button
              onClick={onToggleSound || onTestSound}
              title={isSoundEnabled ? 'เสียงแจ้งเตือน: เปิดอยู่ (คลิกเพื่อปิดเสียง)' : 'เสียงแจ้งเตือน: ปิดอยู่ (คลิกเพื่อเปิดเสียง)'}
              className={`p-2 rounded-lg transition border ${
                isSoundEnabled
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-500 hover:text-slate-300 border-slate-700/60'
              }`}
            >
              {isSoundEnabled ? (
                <Volume2 className="w-4 h-4 text-amber-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Google Sheets Modal Button */}
            <button
              onClick={onOpenSheets}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
              title="Google Sheets ซิงค์ข้อมูล"
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google ชีต</span>
            </button>

            {/* Server Reboot Button */}
            {onOpenReboot && (
              <button
                onClick={onOpenReboot}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition shadow-sm shadow-amber-500/10 active:scale-95"
                title="รีเซ็ตเวลาบอสตามเวลาเซิร์ฟเวอร์รีบูท (ช่อง P)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>รีบูทเซิร์ฟ</span>
              </button>
            )}

            {/* Notification & Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-orange-400 transition border border-slate-700/60"
              title="การตั้งค่าการแจ้งเตือน (Discord, LINE, เสียง)"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Admin Management (if admin) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
                title="จัดการระบบและผู้ใช้ (Admin)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">จัดการกิลด์</span>
              </button>
            )}

            {/* Add Boss Button */}
            <button
              onClick={onOpenAddBoss}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-md shadow-orange-600/20 text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">เพิ่มบอส</span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-yellow-300 transition border border-slate-700/60"
              title={isDarkMode ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile / Auth */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
                <div 
                  onClick={onOpenAuth}
                  className="cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                  title="คลิกเพื่อดูโปรไฟล์"
                >
                  <div className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' ? 'bg-amber-400 ring-2 ring-amber-400/20' : 'bg-blue-400'}`} />
                  <span className="max-w-[70px] sm:max-w-[100px] truncate">{currentUser.displayName || currentUser.username}</span>
                  {currentUser.role === 'admin' && (
                    <span className="text-[10px] px-1 bg-amber-500/20 text-amber-300 rounded font-semibold">แอดมิน</span>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
              >
                <User className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
