import { Boss } from '../types/boss';

const OFFLINE_QUEUE_KEY = 'boss_timer_offline_queue_v1';
const LOCAL_CACHE_KEY = 'boss_timer_local_cache_v1';

export interface PendingAction {
  id: string;
  type: 'update_boss' | 'kill_boss' | 'add_boss' | 'delete_boss';
  payload: unknown;
  timestamp: number;
}

export function getOfflineQueue(): PendingAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineAction(action: Omit<PendingAction, 'id' | 'timestamp'>) {
  try {
    const queue = getOfflineQueue();
    queue.push({
      ...action,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to queue offline action:', err);
  }
}

export function clearOfflineQueue() {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (err) {
    console.error('Failed to clear queue:', err);
  }
}

export function saveLocalCache(bosses: Boss[]) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(bosses));
  } catch (err) {
    console.error('Failed to cache bosses locally:', err);
  }
}

export function loadLocalCache(): Boss[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
