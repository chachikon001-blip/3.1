import React, { useState } from 'react';
import { X, LogIn, UserPlus, KeyRound, User as UserIcon, Shield, CheckCircle2 } from 'lucide-react';
import { UserAccount } from '../types/boss';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLoginGuildUser: (username: string, pass: string) => Promise<boolean>;
  onRegister: (data: { username: string; displayName: string; password?: string }) => Promise<boolean>;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginGuildUser,
  onRegister,
  onLogout,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuildLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const ok = await onLoginGuildUser(username, password);
      if (ok) {
        onClose();
      } else {
        setErrorMsg('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'เข้าสู่ระบบล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const ok = await onRegister({ username, displayName, password });
      if (ok) {
        onClose();
      } else {
        setErrorMsg('ไม่สามารถลงทะเบียนได้');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ลงทะเบียนล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for testing
  const quickLoginAs = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {currentUser ? 'โปรไฟล์ผู้ใช้งาน' : mode === 'login' ? 'เข้าสู่ระบบกิลด์' : 'ลงทะเบียนสมาชิกใหม่'}
              </h2>
              <p className="text-xs text-slate-400">
                {currentUser ? 'บัญชีกิลด์และ Google ที่กำลังใช้งาน' : 'บันทึกเวลาบอสและจัดการข้อมูลร่วมกัน'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {currentUser ? (
            /* Logged In Info */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    currentUser.role === 'admin' ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
                  }`}>
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{currentUser.displayName}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span>ID: @{currentUser.username}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {currentUser.role === 'admin' ? 'แอดมิน (Admin)' : 'สมาชิกกิลด์ (Member)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-rose-300 text-xs font-bold transition"
                >
                  ออกจากระบบ (Logout)
                </button>
              </div>
            </div>
          ) : (
            /* Login & Register Forms */
            <div className="space-y-4">
              {/* Tab Selector: Login vs Register */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    mode === 'login'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบด้วย ID</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    mode === 'register'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>ลงทะเบียน ID ใหม่</span>
                </button>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleGuildLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Username (ชื่อผู้ใช้ / ID) *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="กรอกชื่อผู้ใช้ เช่น pae123 หรือ admin"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password (รหัสผ่าน) *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="กรอกรหัสผ่าน (เริ่มต้น: 123456)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Quick autofill helper */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                    <span>บัญชีแนะนำ:</span>
                    <button
                      type="button"
                      onClick={() => quickLoginAs('admin', 'admin123')}
                      className="px-2 py-1 rounded-lg bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700 font-medium"
                    >
                      👑 แอดมิน (admin)
                    </button>
                    <button
                      type="button"
                      onClick={() => quickLoginAs('guest', '123456')}
                      className="px-2 py-1 rounded-lg bg-slate-800 text-blue-300 hover:bg-slate-700 border border-slate-700 font-medium"
                    >
                      🛡️ สมาชิก (guest)
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย ID'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Username (ชื่อผู้ใช้สำหรับเข้าสู่ระบบ) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น pae123"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      ชื่อแสดงในกิลด์ / ชื่อในเกม *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น pae123 หรือ เป้ แดนหน้า"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      รหัสผ่าน (อย่างน้อย 4 ตัวอักษร) *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนและเข้าใช้งาน'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
