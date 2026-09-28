import React, { useState } from 'react';
import { X, LogIn, UserPlus, KeyRound, User as UserIcon, Shield, CheckCircle2 } from 'lucide-react';
import { UserAccount } from '../types/boss';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  googleUser: FirebaseUser | null;
  onLoginGuildUser: (username: string, pass: string) => Promise<boolean>;
  onLoginGoogle: () => Promise<void>;
  onRegister: (data: { username: string; displayName: string; password?: string }) => Promise<boolean>;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  googleUser,
  onLoginGuildUser,
  onLoginGoogle,
  onRegister,
  onLogout,
}) => {
  if (!isOpen) return null;

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

  const handleGoogleSignInClick = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await onLoginGoogle();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'การเชื่อมต่อ Google ผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for testing
  const quickLoginAs = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

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

                {googleUser && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>เชื่อมต่อกับ Google: {googleUser.email}</span>
                  </div>
                )}
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
              {/* Google Sign In Official Styled Button */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs sm:text-sm shadow-sm transition disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>เข้าสู่ระบบด้วย Google (เชื่อมสิทธิ์ชีต)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[11px] text-slate-500 uppercase tracking-wider">หรือเข้าด้วย ID กิลด์</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleGuildLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Username (ชื่อผู้ใช้)
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="admin หรือ guest"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password (รหัสผ่าน)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Quick autofill helper */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                    <span>กรอกด่วน:</span>
                    <button
                      type="button"
                      onClick={() => quickLoginAs('admin', 'admin123')}
                      className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700"
                    >
                      👑 แอดมิน (admin)
                    </button>
                    <button
                      type="button"
                      onClick={() => quickLoginAs('guest', '123456')}
                      className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 hover:bg-slate-700 border border-slate-700"
                    >
                      🛡️ สมาชิก (guest)
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-600/30 transition flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>เข้าสู่ระบบ</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMsg('');
                      }}
                      className="text-xs text-slate-400 hover:text-amber-400"
                    >
                      ยังไม่มีบัญชี? <span className="font-semibold text-amber-400 underline">ลงทะเบียนใหม่</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Username (ชื่อผู้ใช้) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น player01"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      ชื่อแสดงในกิลด์ / ฉายา *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ธนูเทพแดนหน้า"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      รหัสผ่าน *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-600/30 transition flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>ลงทะเบียนเข้าใช้งาน</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg('');
                      }}
                      className="text-xs text-slate-400 hover:text-amber-400"
                    >
                      มีบัญชีอยู่แล้ว? <span className="font-semibold text-amber-400 underline">เข้าสู่ระบบที่นี่</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
