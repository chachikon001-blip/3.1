import React, { useState } from 'react';
import { UserAccount, Boss, AppStateData } from '../types/boss';
import { 
  X, 
  ShieldCheck, 
  UserPlus, 
  Users, 
  Trash2, 
  Key, 
  DownloadCloud, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  onCreateUser: (data: { username: string; displayName: string; role: 'admin' | 'member'; password?: string }) => Promise<void>;
  onUpdateUser: (userId: string, data: Partial<UserAccount>) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onRestoreBackup: (data: Partial<AppStateData>) => Promise<void>;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  users,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onRestoreBackup,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'users' | 'create' | 'backup'>('users');

  // Form states for creating user
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) return;

    try {
      await onCreateUser({
        username: username.trim(),
        displayName: displayName.trim(),
        role,
        password,
      });
      setStatusMsg({ type: 'success', text: `สร้างบัญชี "${username}" สำเร็จเรียบร้อยแล้ว!` });
      setUsername('');
      setDisplayName('');
      setPassword('123456');
      setActiveTab('users');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'สร้างบัญชีไม่สำเร็จ';
      setStatusMsg({ type: 'error', text: errMsg });
    }
  };

  const handleDownloadBackup = () => {
    window.open('/api/backup', '_blank');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);
        if (parsed.bosses) {
          await onRestoreBackup(parsed);
          setStatusMsg({ type: 'success', text: 'กู้คืนข้อมูลสำรองบนคลาวด์สำเร็จแล้ว!' });
        } else {
          setStatusMsg({ type: 'error', text: 'ไฟล์ JSON ไม่ถูกต้อง' });
        }
      } catch {
        setStatusMsg({ type: 'error', text: 'อ่านไฟล์สำรองข้อมูลล้มเหลว' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">ระบบจัดการผู้ใช้และข้อมูล (Admin Console)</h2>
              <p className="text-xs text-slate-400">จัดการยศแอดมิน/สมาชิก และสำรองข้อมูลบนคลาวด์</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>รายชื่อสมาชิกในระบบ ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'create'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>สร้าง ID ผู้ใช้ใหม่</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'backup'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>สำรอง & กู้คืนข้อมูล</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 space-y-4">
          {statusMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold">
                    <tr>
                      <th className="p-3">ผู้ใช้งาน</th>
                      <th className="p-3">Username</th>
                      <th className="p-3">ยศ / สิทธิ์</th>
                      <th className="p-3">สถานะ</th>
                      <th className="p-3 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-semibold text-slate-200">
                          {u.displayName}
                        </td>
                        <td className="p-3 font-mono text-slate-400">{u.username}</td>
                        <td className="p-3">
                          <select
                            value={u.role}
                            disabled={u.id === 'admin-master'}
                            onChange={(e) => onUpdateUser(u.id, { role: e.target.value as 'admin' | 'member' })}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                          >
                            <option value="admin">แอดมิน (Admin)</option>
                            <option value="member">สมาชิกทั่วไป (Member)</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => onUpdateUser(u.id, { active: !u.active })}
                            disabled={u.id === 'admin-master'}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.active
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {u.active ? 'เปิดใช้งาน' : 'ระงับชั่วคราว'}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          {u.id !== 'admin-master' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`ลบผู้ใช้ ${u.username}?`)) {
                                  onDeleteUser(u.id);
                                }
                              }}
                              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
                              title="ลบผู้ใช้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username (ใช้สำหรับเข้าสู่ระบบ) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น member01 หรือ hunter"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ชื่อแสดงในเกม / กิลด์ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ดาบพิฆาต (สายเวท)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    รหัสผ่านเริ่มต้น
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ยศและสิทธิ์
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="member">สมาชิกทั่วไป (บันทึกเวลาบอสได้)</option>
                    <option value="admin">แอดมิน (สร้าง ID, ลบบอส, จัดการระบบได้)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>บันทึกและสร้าง ID ผู้ใช้</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <DownloadCloud className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">ดาวน์โหลดสำรองข้อมูลบนคลาวด์</h3>
                    <p className="text-xs text-slate-400">บันทึกเวลาบอส, รายชื่อสมาชิก, และการตั้งค่าลงไฟล์ JSON</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์สำรองข้อมูล (Export JSON)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">กู้คืนข้อมูลสำรอง (Restore)</h3>
                    <p className="text-xs text-slate-400">นำเข้าไฟล์ JSON ที่เคยสำรองไว้เพื่อกู้คืนสถานะบอสและผู้ใช้</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-amber-300 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>
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
  );
};
