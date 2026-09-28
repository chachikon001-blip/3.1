import React, { useEffect, useRef, useState } from 'react';
import { Flame, X, Skull } from 'lucide-react';

export interface AlertNotification {
  id: string;
  type: 'boss_alert' | 'boss_killed' | 'success';
  title: string;
  message: string;
  server?: 'main' | 'sub';
  timestamp: number;
}

interface NotificationToastProps {
  notifications: AlertNotification[];
  onDismiss: (id: string) => void;
}

interface ToastItemProps {
  item: AlertNotification;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ item, onDismiss }) => {
  const [isClosing, setIsClosing] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDismissRef.current(item.id);
    }, 250);
  };

  useEffect(() => {
    // คำนวณเวลาที่เหลือจาก timestamp เดิม เพื่อความแม่นยำ 5 วินาที
    const elapsed = Date.now() - (item.timestamp || Date.now());
    const remaining = Math.max(0, 5000 - elapsed);

    const timer = setTimeout(() => {
      triggerClose();
    }, remaining);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden p-2 rounded-lg shadow-xl border flex items-center gap-2 backdrop-blur-md transition-all duration-300 ${
        isClosing ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100 translate-x-0 scale-100 animate-slide-up'
      } ${
        item.type === 'boss_alert'
          ? 'bg-amber-950/95 border-amber-500/60 text-amber-100 shadow-amber-500/10'
          : item.type === 'boss_killed'
          ? 'bg-red-950/95 border-red-500/60 text-red-100 shadow-red-500/10'
          : 'bg-slate-900/95 border-emerald-500/60 text-emerald-100 shadow-emerald-500/10'
      }`}
    >
      <div className="p-1 rounded-md bg-slate-950/70 shrink-0">
        {item.type === 'boss_alert' ? (
          <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
        ) : item.type === 'boss_killed' ? (
          <Skull className="w-3.5 h-3.5 text-red-400" />
        ) : (
          <Flame className="w-3.5 h-3.5 text-emerald-400" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-0.5">
        <h4 className="text-[11px] font-bold leading-tight truncate">{item.title}</h4>
        <p className="text-[9.5px] text-slate-300 mt-0.5 leading-tight truncate">{item.message}</p>
      </div>

      <button
        onClick={triggerClose}
        className="p-0.5 text-slate-400 hover:text-white rounded transition hover:bg-white/10 shrink-0"
        title="ปิดการแจ้งเตือน"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Progress bar counting down 5 seconds */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40 overflow-hidden">
        <div
          className={`h-full ${
            item.type === 'boss_alert'
              ? 'bg-amber-400'
              : item.type === 'boss_killed'
              ? 'bg-rose-400'
              : 'bg-emerald-400'
          }`}
          style={{
            animation: 'toastCountdown 5s linear forwards',
          }}
        />
      </div>
    </div>
  );
};

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
}) => {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // ตรวจจับและลบแจ้งเตือนที่ค้างเกิน 5 วินาทีอัตโนมัติทุก 1 วินาที
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      notifications.forEach((n) => {
        if (n.timestamp && now - n.timestamp >= 5000) {
          onDismissRef.current(n.id);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toastCountdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div className="fixed bottom-3 right-3 z-50 flex flex-col gap-1.5 max-w-[260px] sm:max-w-[280px] w-full pointer-events-none px-2">
        {notifications.slice(0, 3).map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
};
