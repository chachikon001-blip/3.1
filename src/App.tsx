/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Boss, NotificationSettings, SheetConfig, UserAccount, ServerType, AppStateData } from './types/boss';
import { 
  DEFAULT_SETTINGS, 
  DEFAULT_SHEET_CONFIG, 
  createInitialBosses, 
  INITIAL_ADMIN_USER 
} from './data/defaultBosses';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { ServerTabs } from './components/ServerTabs';
import { BossCard } from './components/BossCard';
import { BossTableView } from './components/BossTableView';
import { EditBossModal } from './components/EditBossModal';
import { AddBossModal } from './components/AddBossModal';
import { SettingsModal } from './components/SettingsModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ServerRebootModal } from './components/ServerRebootModal';
import { ResetAllTimesModal } from './components/ResetAllTimesModal';
import { AdminModal } from './components/AdminModal';
import { AuthModal } from './components/AuthModal';
import { NotificationToast, AlertNotification } from './components/NotificationToast';
import { playBossAlert } from './services/audio';
import { 
  getOfflineQueue, 
  queueOfflineAction, 
  clearOfflineQueue, 
  saveLocalCache, 
  loadLocalCache 
} from './services/offlineSync';
import { formatRemainingTime } from './utils/time';
import { Shield, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // Core Data States
  const [bosses, setBosses] = useState<Boss[]>(() => {
    return loadLocalCache() || createInitialBosses();
  });
  const [users, setUsers] = useState<UserAccount[]>([INITIAL_ADMIN_USER]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(DEFAULT_SHEET_CONFIG);

  // App & Auth States
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('boss_timer_current_user');
      return saved ? JSON.parse(saved) : INITIAL_ADMIN_USER;
    } catch {
      return INITIAL_ADMIN_USER;
    }
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Filtering & View States with localStorage persistence
  const [currentTab, setCurrentTab] = useState<'main' | 'sub' | 'all'>(() => {
    try {
      const saved = localStorage.getItem('boss_timer_current_tab');
      return (saved as 'main' | 'sub' | 'all') || 'all';
    } catch {
      return 'all';
    }
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'soon' | 'alive' | 'pending'>(() => {
    try {
      const saved = localStorage.getItem('boss_timer_status_filter');
      return (saved as 'all' | 'soon' | 'alive' | 'pending') || 'all';
    } catch {
      return 'all';
    }
  });
  const [sortBy, setSortBy] = useState<'next_spawn' | 'name' | 'respawn'>(() => {
    try {
      const saved = localStorage.getItem('boss_timer_sort_by');
      return (saved as 'next_spawn' | 'name' | 'respawn') || 'next_spawn';
    } catch {
      return 'next_spawn';
    }
  });
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem('boss_timer_view_mode');
      return (saved as 'table' | 'grid') || 'table';
    } catch {
      return 'table';
    }
  });

  // Sync view preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('boss_timer_current_tab', currentTab);
    } catch {}
  }, [currentTab]);

  useEffect(() => {
    try {
      localStorage.setItem('boss_timer_view_mode', viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem('boss_timer_status_filter', statusFilter);
    } catch {}
  }, [statusFilter]);

  useEffect(() => {
    try {
      localStorage.setItem('boss_timer_sort_by', sortBy);
    } catch {}
  }, [sortBy]);

  // Always keep local cache synced whenever bosses change
  useEffect(() => {
    if (bosses && bosses.length > 0) {
      saveLocalCache(bosses);
    }
  }, [bosses]);

  // Modals
  const [editingBoss, setEditingBoss] = useState<Boss | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSheetsOpen, setIsSheetsOpen] = useState(false);
  const [isRebootOpen, setIsRebootOpen] = useState(false);
  const [isResetAllOpen, setIsResetAllOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Floating Notifications & Toast Queue
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);

  // Ticker for updating countdowns every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save current user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('boss_timer_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('boss_timer_current_user');
    }
  }, [currentUser]);

  // Realtime SSE / Polling sync
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isComponentMounted = true;

    const fetchServerState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const text = await res.text();
          const data = text ? JSON.parse(text) : null;
          if (data) {
            if (data.bosses) setBosses(data.bosses);
            if (data.users) setUsers(data.users);
            if (data.settings) setSettings(data.settings);
            if (data.sheetConfig) setSheetConfig(data.sheetConfig);
            saveLocalCache(data.bosses);
            setIsOnline(true);
          }
        }
      } catch {
        setIsOnline(false);
      }
    };

    const connectSSE = () => {
      if (!isComponentMounted) return;
      try {
        if (eventSource) {
          eventSource.close();
        }
        eventSource = new EventSource('/api/realtime/stream');

        eventSource.addEventListener('initial_state', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.bosses) setBosses(data.bosses);
            if (data.users) setUsers(data.users);
            if (data.settings) setSettings(data.settings);
            if (data.sheetConfig) setSheetConfig(data.sheetConfig);
            saveLocalCache(data.bosses);
            setIsOnline(true);
          } catch (err) {
            console.error('SSE initial_state parse error:', err);
          }
        });

        eventSource.addEventListener('state_update', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.bosses) {
              setBosses(data.bosses);
              saveLocalCache(data.bosses);
            }
            if (data.users) setUsers(data.users);
            if (data.settings) setSettings(data.settings);
            if (data.sheetConfig) setSheetConfig(data.sheetConfig);
            setIsOnline(true);
          } catch (err) {
            console.error('SSE state_update parse error:', err);
          }
        });

        eventSource.addEventListener('boss_alert', (e) => {
          try {
            const { boss, stage, message } = JSON.parse(e.data);
            const serverLabel = boss.serverTag || (boss.server === 'main' ? 'T3' : 'S1');
            addNotification({
              id: `alert-${boss.id}-${stage}-${Date.now()}`,
              type: 'boss_alert',
              title: `🚨 แจ้งเตือนบอสเกิด (${stage} นาที)`,
              message: message || `${boss.name} ${serverLabel} กำลังจะเกิดในอีก ${stage} นาที!`,
              server: boss.server,
              timestamp: Date.now(),
            });

            // Play Sound with custom server tag (e.g. "บัลโบ T3 กำลังจะเกิดในอีก 5 นาที") if enabled
            if (settings.enabled) {
              playBossAlert(
                settings.soundType,
                settings.soundVolume,
                settings.customSoundUrl,
                {
                  name: boss.name,
                  server: boss.server,
                  serverTag: serverLabel,
                  minutesLeft: stage,
                },
                settings.ttsLanguage || 'thai_only',
                settings.ttsSpeed || 1.05
              );
            }

            // Desktop Web Push
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`⚔️ แจ้งเตือนบอสเกิด (${stage} นาที)`, {
                body: `${boss.name} ${serverLabel} กำลังจะเกิดในอีก ${stage} นาที!`,
                icon: '/favicon.ico',
              });
            }
          } catch (err) {
            console.error('SSE alert parse error:', err);
          }
        });

        eventSource.addEventListener('boss_killed', (e) => {
          try {
            const { boss, killedBy } = JSON.parse(e.data);
            addNotification({
              id: `kill-${boss.id}-${Date.now()}`,
              type: 'boss_killed',
              title: `💀 บอสถูกสังหารแล้ว`,
              message: `${boss.name} บันทึกเวลาตายโดย ${killedBy || 'สมาชิก'}`,
              server: boss.server,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error('SSE boss_killed parse error:', err);
          }
        });

        eventSource.addEventListener('server_reboot', (e) => {
          try {
            const { message, bosses: updatedBosses, rebootedBy } = JSON.parse(e.data);
            if (updatedBosses && Array.isArray(updatedBosses)) {
              setBosses(updatedBosses);
              saveLocalCache(updatedBosses);
            }
            addNotification({
              id: `reboot-${Date.now()}`,
              type: 'success',
              title: '⚡ เซิร์ฟเวอร์รีบูทเสร็จสิ้น',
              message: message || `รีเซ็ตเวลาบอสตามตารางรีบูทโดย ${rebootedBy || 'สมาชิก'}`,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error('SSE server_reboot parse error:', err);
          }
        });

        eventSource.addEventListener('boss_times_reset', (e) => {
          try {
            const { message, bosses: updatedBosses, resetBy } = JSON.parse(e.data);
            if (updatedBosses && Array.isArray(updatedBosses)) {
              setBosses(updatedBosses);
              saveLocalCache(updatedBosses);
            }
            addNotification({
              id: `reset-all-${Date.now()}`,
              type: 'success',
              title: '↺ รีเซ็ตเวลาบอสเป็น --:--',
              message: message || `รีเซ็ตเวลาเกิดบอสกลับเป็น --:-- โดย ${resetBy || 'สมาชิก'}`,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error('SSE boss_times_reset parse error:', err);
          }
        });

        eventSource.addEventListener('users_update', (e) => {
          try {
            const u = JSON.parse(e.data);
            setUsers(u);
          } catch (err) {
            console.error('SSE users_update parse error:', err);
          }
        });

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          // Auto-reconnect after 3 seconds
          if (isComponentMounted && !reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 3000);
          }
        };
      } catch {
        if (isComponentMounted && !reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            connectSSE();
          }, 3000);
        }
      }
    };

    connectSSE();
    // Background polling every 5s ensures all devices stay 100% in sync
    const pollInterval = setInterval(fetchServerState, 5000);

    return () => {
      isComponentMounted = false;
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
    };
  }, [settings.soundType, settings.soundVolume, settings.customSoundUrl, settings.ttsLanguage, settings.ttsSpeed]);

  // Online / Offline Listeners & Sync Queue
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        try {
          await fetch('/api/bosses/sync-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bosses }),
          });
          clearOfflineQueue();
          addNotification({
            id: `sync-back-${Date.now()}`,
            type: 'success',
            title: 'เชื่อมต่อเครือข่ายแล้ว',
            message: 'ซิงค์ข้อมูลที่ค้างอยู่ขึ้นระบบเรียลไทม์เรียบร้อยแล้ว',
            timestamp: Date.now(),
          });
        } catch (e) {
          console.error('Offline batch sync error:', e);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [bosses]);

  const addNotification = useCallback((item: AlertNotification) => {
    setNotifications((prev) => {
      // ป้องกันการแจ้งเตือนซ้ำซ้อนภายใน 3 วินาที
      const isDuplicate = prev.some(
        (n) => n.id === item.id || (n.title === item.title && Math.abs(n.timestamp - item.timestamp) < 3000)
      );
      if (isDuplicate) return prev;
      return [item, ...prev.slice(0, 2)];
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ลบการแจ้งเตือนที่หมดเวลา 5 วินาทีออกจาก State อัตโนมัติทุกวินาที
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setNotifications((prev) => {
        const remaining = prev.filter((n) => now - n.timestamp < 5000);
        return remaining.length === prev.length ? prev : remaining;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Actions: กดอัปเดตจะเอาเวลาเกิดมา + กับรอบเกิด แล้วหาเวลาใหม่ทันที
  const handleKillNow = async (bossId: string) => {
    const targetBoss = bosses.find((b) => b.id === bossId);
    if (!targetBoss) return;

    const killerName = currentUser?.displayName || currentUser?.username || 'สมาชิก';

    const nowMs = Date.now();
    let newSpawnTime: Date;
    let lastKilledTime: string;

    if (targetBoss.nextSpawnAt) {
      const baseSpawn = new Date(targetBoss.nextSpawnAt).getTime();
      let calculated = baseSpawn + targetBoss.respawnMinutes * 60 * 1000;
      // If the calculated time has already passed, calculate from now so boss is not already overdue
      if (calculated <= nowMs) {
        calculated = nowMs + targetBoss.respawnMinutes * 60 * 1000;
        lastKilledTime = new Date(nowMs).toISOString();
      } else {
        lastKilledTime = targetBoss.nextSpawnAt;
      }
      newSpawnTime = new Date(calculated);
    } else {
      const now = new Date(nowMs);
      lastKilledTime = now.toISOString();
      newSpawnTime = new Date(nowMs + targetBoss.respawnMinutes * 60 * 1000);
    }

    const nextSpawnIso = newSpawnTime.toISOString();
    const serverLabel = targetBoss.serverTag || (targetBoss.server === 'main' ? 'T3' : 'S1');
    const newFormatted = newSpawnTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    // Optimistic Update
    setBosses((prev) => {
      const next = prev.map((b) => {
        if (b.id !== bossId) return b;
        return {
          ...b,
          lastKilledAt: lastKilledTime,
          nextSpawnAt: nextSpawnIso,
          killedBy: killerName,
          notifiedStages: [],
        };
      });
      saveLocalCache(next);
      return next;
    });

    addNotification({
      id: `kill-local-${Date.now()}`,
      type: 'boss_killed',
      title: `อัปเดต ${targetBoss.name} ${serverLabel} สำเร็จ`,
      message: `คำนวณเวลาเกิดใหม่เป็น ${newFormatted} น. (+รอบเกิด ${(targetBoss.respawnMinutes / 60).toFixed(1)} ชม.)`,
      timestamp: Date.now(),
    });

    if (navigator.onLine) {
      try {
        await fetch('/api/bosses/kill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            bossId, 
            killedBy: killerName,
            killedAt: lastKilledTime,
            nextSpawnAt: nextSpawnIso 
          }),
        });
      } catch {
        queueOfflineAction({ 
          type: 'kill_boss', 
          payload: { bossId, killedBy: killerName, killedAt: lastKilledTime, nextSpawnAt: nextSpawnIso } 
        });
      }
    } else {
      queueOfflineAction({ 
        type: 'kill_boss', 
        payload: { bossId, killedBy: killerName, killedAt: lastKilledTime, nextSpawnAt: nextSpawnIso } 
      });
    }
  };

  const handleSaveBoss = async (updated: Partial<Boss> & { id: string }) => {
    setBosses((prev) => {
      const next = prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b));
      saveLocalCache(next);
      return next;
    });

    if (navigator.onLine) {
      try {
        await fetch('/api/bosses/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      } catch {
        queueOfflineAction({ type: 'update_boss', payload: updated });
      }
    } else {
      queueOfflineAction({ type: 'update_boss', payload: updated });
    }
  };

  const handleQuickUpdateTime = async (bossId: string, newTimeIso: string | null) => {
    const targetBoss = bosses.find((b) => b.id === bossId);
    handleSaveBoss({
      id: bossId,
      nextSpawnAt: newTimeIso,
      notifiedStages: [],
    });
    addNotification({
      id: `quick-time-${Date.now()}`,
      type: 'success',
      title: newTimeIso ? 'ปรับปรุงเวลาสำเร็จ' : 'รีเซ็ตเวลาสำเร็จ (--:--)',
      message: newTimeIso
        ? `อัปเดตเวลาเกิดของ ${targetBoss?.name || 'บอส'} เรียบร้อยแล้ว`
        : `รีเซ็ตเวลาเกิดของ ${targetBoss?.name || 'บอส'} กลับเป็น --:-- เรียบร้อยแล้ว`,
      timestamp: Date.now(),
    });
  };

  const handleDeleteBoss = async (bossId: string) => {
    setBosses((prev) => prev.filter((b) => b.id !== bossId));

    if (navigator.onLine) {
      try {
        await fetch(`/api/bosses/${bossId}`, { method: 'DELETE' });
      } catch {
        queueOfflineAction({ type: 'delete_boss', payload: { id: bossId } });
      }
    }
  };

  const handleAddBoss = async (data: {
    name: string;
    server: ServerType;
    location: string;
    respawnMinutes: number;
    level?: number;
    notes?: string;
  }) => {
    try {
      const res = await fetch('/api/bosses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const resData = await res.json();
        setBosses((prev) => [resData.boss, ...prev]);
        addNotification({
          id: `add-boss-${Date.now()}`,
          type: 'success',
          title: 'เพิ่มบอสเรียบร้อย',
          message: `เพิ่ม ${data.name} ลงใน ${data.server === 'main' ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง'} แล้ว`,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Local fallback
      const fallbackBoss: Boss = {
        id: `${data.server}-${Date.now()}`,
        ...data,
        lastKilledAt: null,
        nextSpawnAt: null,
        notifiedStages: [],
      };
      setBosses((prev) => [fallbackBoss, ...prev]);
    }
  };

  const handleTogglePin = (bossId: string) => {
    const boss = bosses.find((b) => b.id === bossId);
    if (!boss) return;
    handleSaveBoss({ id: bossId, pinned: !boss.pinned });
  };

  const handleSaveSettings = async (newSettings: NotificationSettings, showToast = true) => {
    setSettings(newSettings);

    if (newSettings.mainServerTag || newSettings.subServerTag) {
      setBosses((prev) => {
        const updated = prev.map((b) => {
          if (b.server === 'main' && newSettings.mainServerTag) {
            return { ...b, serverTag: newSettings.mainServerTag };
          }
          if (b.server === 'sub' && newSettings.subServerTag) {
            return { ...b, serverTag: newSettings.subServerTag };
          }
          return b;
        });
        saveLocalCache(updated);
        return updated;
      });
    }

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (showToast) {
        addNotification({
          id: `settings-${Date.now()}`,
          type: 'success',
          title: 'บันทึกการตั้งค่าสำเร็จ',
          message: 'อัปเดตช่องทางแจ้งเตือนและระดับเสียงแล้ว',
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateServerTag = async (server: 'main' | 'sub', newTag: string) => {
    const cleanTag = newTag.trim().toUpperCase() || (server === 'main' ? 'T3' : 'B9');

    const updatedSettings = {
      ...settings,
      [server === 'main' ? 'mainServerTag' : 'subServerTag']: cleanTag,
    };
    setSettings(updatedSettings);

    setBosses((prev) => {
      const updated = prev.map((b) => (b.server === server ? { ...b, serverTag: cleanTag } : b));
      saveLocalCache(updated);
      return updated;
    });

    try {
      await fetch('/api/settings/server-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server, newTag: cleanTag }),
      });
    } catch {
      localStorage.setItem('boss_timer_settings', JSON.stringify(updatedSettings));
    }

    addNotification({
      id: `server-tag-${Date.now()}`,
      type: 'success',
      title: 'เปลี่ยนชื่อเซิร์ฟเวอร์สำเร็จ',
      message: `เปลี่ยนรหัส${server === 'main' ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง'} เป็น "${cleanTag}" เรียบร้อยแล้ว`,
      timestamp: Date.now(),
    });
  };

  const handleToggleSound = () => {
    const nextEnabled = !settings.enabled;
    const nextSettings = { ...settings, enabled: nextEnabled };
    setSettings(nextSettings);
    handleSaveSettings(nextSettings, false);

    if (nextEnabled) {
      playBossAlert(
        settings.soundType,
        settings.soundVolume,
        settings.customSoundUrl,
        {
          name: 'บัลโบ - BalBo',
          server: 'main',
          serverTag: settings.mainServerTag || 'T3',
          minutesLeft: 5,
        },
        settings.ttsLanguage || 'thai_only',
        settings.ttsSpeed || 1.05
      );
      addNotification({
        id: `sound-on-${Date.now()}`,
        type: 'success',
        title: '🔊 เปิดเสียงแจ้งเตือนแล้ว',
        message: 'ระบบจะส่งเสียงแจ้งเตือนและเสียงพูดเมื่อบอสใกล้เกิด',
        timestamp: Date.now(),
      });
    } else {
      addNotification({
        id: `sound-off-${Date.now()}`,
        type: 'boss_alert',
        title: '🔇 ปิดเสียงแจ้งเตือนแล้ว (Mute)',
        message: 'ระบบจะไม่ส่งเสียงแจ้งเตือนจนกว่าจะเปิดใหม่อีกครั้ง',
        timestamp: Date.now(),
      });
    }
  };

  const handleUpdateSheetConfig = async (config: Partial<SheetConfig>) => {
    setSheetConfig((prev) => ({ ...prev, ...config }));
    try {
      await fetch('/api/sheet-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportBosses = async (imported: Boss[]) => {
    setBosses(imported);
    saveLocalCache(imported);
    try {
      await fetch('/api/bosses/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bosses: imported, override: true }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // User Accounts
  const handleLoginGuildUser = async (username: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return false;
      }
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        try {
          localStorage.setItem('boss_timer_current_user', JSON.stringify(data.user));
        } catch {
          // ignore
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleRegisterUser = async (data: { username: string; displayName: string; password?: string }): Promise<boolean> => {
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, role: 'member' }),
      });
      const text = await res.text();
      let resData: any = {};
      try {
        resData = text ? JSON.parse(text) : {};
      } catch {
        return false;
      }
      if (res.ok && resData.user) {
        setCurrentUser(resData.user);
        try {
          localStorage.setItem('boss_timer_current_user', JSON.stringify(resData.user));
        } catch {
          // ignore
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleCreateUserByAdmin = async (data: { username: string; displayName: string; role: 'admin' | 'member'; password?: string }) => {
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const text = await res.text();
    let resData: any = {};
    try {
      resData = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
    if (!res.ok) {
      throw new Error(resData.error || 'เกิดข้อผิดพลาดในการสร้าง ID ผู้ใช้');
    }
    if (resData.user) {
      setUsers((prev) => [...prev.filter(u => u.id !== resData.user.id), resData.user]);
    }
  };

  const handleUpdateUserByAdmin = async (userId: string, data: Partial<UserAccount>) => {
    try {
      await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });
    } catch (e) {
      console.warn('Update user error:', e);
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data } : u)));
  };

  const handleDeleteUserByAdmin = async (userId: string) => {
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Delete user error:', e);
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleRestoreBackup = async (data: Partial<AppStateData>) => {
    await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (data.bosses) setBosses(data.bosses);
    if (data.users) setUsers(data.users);
    if (data.settings) setSettings(data.settings);
    if (data.sheetConfig) setSheetConfig(data.sheetConfig);
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('boss_timer_current_user');
    addNotification({
      id: `logout-${Date.now()}`,
      type: 'success',
      title: 'ออกจากระบบแล้ว',
      message: 'คุณได้ออกจากระบบเรียบร้อยแล้ว',
      timestamp: Date.now(),
    });
  };

  // Filtered & Sorted Bosses List
  const filteredBosses = useMemo(() => {
    return bosses
      .filter((b) => {
        // Tab Filter
        if (currentTab !== 'all' && b.server !== currentTab) return false;

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = b.name.toLowerCase().includes(q);
          const matchLoc = b.location.toLowerCase().includes(q);
          const matchDrops = (b.dropItems || []).some((item) => item.toLowerCase().includes(q));
          if (!matchName && !matchLoc && !matchDrops) return false;
        }

        // Status Filter
        if (statusFilter !== 'all') {
          const t = formatRemainingTime(b.nextSpawnAt);
          if (statusFilter === 'alive' && !t.isAlive) return false;
          if (statusFilter === 'soon' && !t.isSoon) return false;
          if (statusFilter === 'pending' && (t.isAlive || t.isSoon)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // เมื่อเรียงตามเวลาเกิด (next_spawn): เอาเวลาที่เหลือน้อยที่สุดขึ้นมาก่อนเสมอ ไม่ว่าจะติดดาวหรือไม่
        if (sortBy === 'next_spawn') {
          const timeA = a.nextSpawnAt ? new Date(a.nextSpawnAt).getTime() : Infinity;
          const timeB = b.nextSpawnAt ? new Date(b.nextSpawnAt).getTime() : Infinity;

          if (timeA !== timeB) {
            return timeA - timeB;
          }

          // กรณีเวลาเท่ากัน ให้บอสติดดาวหรือเรียงตามชื่อเป็น tie-breaker
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return a.name.localeCompare(b.name, 'th');
        }

        // สำหรับโหมดเรียงอื่น (ชื่อ หรือ รอบเกิด): ให้บอสติดดาวอยู่ด้านบน
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        if (sortBy === 'name') {
          return a.name.localeCompare(b.name, 'th');
        }
        if (sortBy === 'respawn') {
          return a.respawnMinutes - b.respawnMinutes;
        }

        return 0;
      });
  }, [bosses, currentTab, searchQuery, statusFilter, sortBy]);

  // Counts
  const mainCount = useMemo(() => bosses.filter((b) => b.server === 'main').length, [bosses]);
  const subCount = useMemo(() => bosses.filter((b) => b.server === 'sub').length, [bosses]);
  const allCount = bosses.length;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'}`}>
      {/* Header */}
      <Header
        currentUser={currentUser}
        isOnline={isOnline}
        isDarkMode={isDarkMode}
        isSoundEnabled={settings.enabled}
        onToggleSound={handleToggleSound}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenSheets={() => setIsSheetsOpen(true)}
        onOpenReboot={() => setIsRebootOpen(true)}
        onOpenAddBoss={() => setIsAddModalOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onTestSound={() =>
          playBossAlert(
            settings.soundType,
            settings.soundVolume,
            settings.customSoundUrl,
            {
              name: 'เทมเพสต์ - Valefar',
              server: 'main',
              serverTag: settings.mainServerTag || 'T3',
              minutesLeft: 5,
            },
            settings.ttsLanguage || 'thai_only',
            settings.ttsSpeed || 1.05
          )
        }
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5">
        {/* Offline Warning Banner if disconnected */}
        {!isOnline && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                กำลังทำงานใน<strong>โหมดออฟไลน์</strong> (ข้อมูลถูกบันทึกในเครื่องอัตโนมัติ และจะซิงค์ขึ้นเซิร์ฟเวอร์ทันทีเมื่อกลับมาออนไลน์)
              </span>
            </div>
            <span className="text-[11px] font-bold text-amber-400">บันทึกอัตโนมัติ</span>
          </div>
        )}

        {/* Stats Summary Overview */}
        <StatsOverview bosses={bosses} currentServer={currentTab} />

        {/* Server Selection Tabs & Filter Controls */}
        <div className="mt-6 mb-4">
          <ServerTabs
            currentTab={currentTab}
            onChangeTab={setCurrentTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            mainCount={mainCount}
            subCount={subCount}
            allCount={allCount}
            mainServerTag={settings.mainServerTag || 'T3'}
            subServerTag={settings.subServerTag || 'B9'}
            onUpdateServerTag={handleUpdateServerTag}
            onOpenReboot={() => setIsRebootOpen(true)}
            onOpenResetAll={() => setIsResetAllOpen(true)}
          />
        </div>

        {/* Boss List: Table View (As requested in image) or Grid View */}
        {filteredBosses.length > 0 ? (
          viewMode === 'table' ? (
            <BossTableView
              bosses={filteredBosses}
              onKillNow={handleKillNow}
              onEdit={(b) => setEditingBoss(b)}
              onTogglePin={handleTogglePin}
              onTestSound={(b) =>
                playBossAlert(
                  settings.soundType,
                  settings.soundVolume,
                  settings.customSoundUrl,
                  {
                    name: b.name,
                    server: b.server,
                    serverTag: b.serverTag || (b.server === 'main' ? 'T3' : 'S1'),
                    minutesLeft: 3,
                  },
                  settings.ttsLanguage || 'thai_only',
                  settings.ttsSpeed || 1.05
                )
              }
              onQuickUpdateTime={handleQuickUpdateTime}
              onOpenResetAll={() => setIsResetAllOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredBosses.map((boss) => (
                <BossCard
                  key={boss.id}
                  boss={boss}
                  onKillNow={handleKillNow}
                  onEdit={(b) => setEditingBoss(b)}
                  onTogglePin={handleTogglePin}
                  onTestSound={(b) =>
                    playBossAlert(
                      settings.soundType,
                      settings.soundVolume,
                      settings.customSoundUrl,
                      {
                        name: b.name,
                        server: b.server,
                        serverTag: b.serverTag || (b.server === 'main' ? 'T3' : 'S1'),
                        minutesLeft: 3,
                      },
                      settings.ttsLanguage || 'thai_only',
                      settings.ttsSpeed || 1.05
                    )
                  }
                  onQuickUpdateTime={handleQuickUpdateTime}
                />
              ))}
            </div>
          )
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 my-8">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-200">ไม่พบบอสที่ตรงกับเงื่อนไขการค้นหา</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองสถานะเป็น &quot;ทั้งหมด&quot; เพื่อดูบอสที่มีอยู่ในระบบ
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold transition"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </main>

      {/* Floating Notifications Toast */}
      <NotificationToast notifications={notifications} onDismiss={removeNotification} />

      {/* Modals */}
      {editingBoss && (
        <EditBossModal
          boss={editingBoss}
          isOpen={true}
          onClose={() => setEditingBoss(null)}
          onSave={handleSaveBoss}
          onDelete={handleDeleteBoss}
        />
      )}

      {isAddModalOpen && (
        <AddBossModal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddBoss}
          defaultServer={currentTab === 'sub' ? 'sub' : 'main'}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={true}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={handleSaveSettings}
        />
      )}

      {isSheetsOpen && (
        <GoogleSheetsModal
          isOpen={true}
          onClose={() => setIsSheetsOpen(false)}
          sheetConfig={sheetConfig}
          bosses={bosses}
          onImportBosses={handleImportBosses}
          onUpdateSheetConfig={handleUpdateSheetConfig}
        />
      )}

      {isRebootOpen && (
        <ServerRebootModal
          isOpen={true}
          onClose={() => setIsRebootOpen(false)}
          bosses={bosses}
          currentServer={currentTab}
          mainServerTag={settings.mainServerTag || 'T3'}
          subServerTag={settings.subServerTag || 'S1'}
          sheetConfig={sheetConfig}
          currentUserName={currentUser?.displayName || currentUser?.username || 'สมาชิก'}
          onRebootComplete={(updatedBosses) => {
            setBosses(updatedBosses);
            saveLocalCache(updatedBosses);
            addNotification({
              id: `reboot-done-${Date.now()}`,
              type: 'success',
              title: '⚡ เซิร์ฟเวอร์รีบูทเสร็จสิ้น',
              message: `รีเซ็ตเวลาบอสตามตารางรีบูท (ช่อง P) เรียบร้อยแล้ว`,
              timestamp: Date.now(),
            });
          }}
        />
      )}

      {isResetAllOpen && (
        <ResetAllTimesModal
          isOpen={true}
          onClose={() => setIsResetAllOpen(false)}
          bosses={bosses}
          currentServer={currentTab}
          mainServerTag={settings.mainServerTag || 'T3'}
          subServerTag={settings.subServerTag || 'S1'}
          sheetConfig={sheetConfig}
          currentUserName={currentUser?.displayName || currentUser?.username || 'สมาชิก'}
          onResetComplete={(updatedBosses) => {
            setBosses(updatedBosses);
            saveLocalCache(updatedBosses);
            addNotification({
              id: `reset-all-done-${Date.now()}`,
              type: 'success',
              title: '↺ รีเซ็ตเวลาบอสเป็น --:--',
              message: `รีเซ็ตเวลาเกิดบอสทั้งหมดเป็น --:-- เรียบร้อยแล้ว`,
              timestamp: Date.now(),
            });
          }}
        />
      )}

      {isAdminOpen && (
        <AdminModal
          isOpen={true}
          onClose={() => setIsAdminOpen(false)}
          users={users}
          onCreateUser={handleCreateUserByAdmin}
          onUpdateUser={handleUpdateUserByAdmin}
          onDeleteUser={handleDeleteUserByAdmin}
          onRestoreBackup={handleRestoreBackup}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          isOpen={true}
          onClose={() => setIsAuthOpen(false)}
          currentUser={currentUser}
          onLoginGuildUser={handleLoginGuildUser}
          onRegister={handleRegisterUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
