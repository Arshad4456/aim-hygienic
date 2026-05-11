import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRACKING_QUEUE_KEY, TRACKING_STATE_KEY } from './constants';

function safeScope(scopeKey) {
  const value = String(scopeKey || '').trim();
  return value || 'default';
}

function scopedKey(baseKey, scopeKey) {
  return `${baseKey}:${safeScope(scopeKey)}`;
}

function pointKey(point) {
  const lat = Number(point?.latitude);
  const lng = Number(point?.longitude);
  const ts = new Date(point?.recordedAt || 0).toISOString();
  return `${lat.toFixed(6)}:${lng.toFixed(6)}:${ts}`;
}

async function readJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

export function buildTrackingScope(user) {
  const companyId = String(user?.companyId || '').trim();
  const userId = String(user?.userId || user?.id || user?._id || '').trim();
  const role = String(user?.role || '').trim().toLowerCase().replace(/\s+/g, '-');
  return [companyId || 'company', role || 'role', userId || 'user'].join('__');
}

export async function getTrackingQueue(scopeKey) {
  const queue = await readJson(scopedKey(TRACKING_QUEUE_KEY, scopeKey), []);
  return Array.isArray(queue) ? queue : [];
}

export async function addPointsToQueue(scopeKey, points) {
  const normalized = Array.isArray(points) ? points.filter(Boolean) : [];
  if (!normalized.length) return 0;
  const queue = await getTrackingQueue(scopeKey);
  const seen = new Set(queue.map(pointKey));
  const dedupedIncoming = normalized.filter((point) => {
    const key = pointKey(point);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const next = queue.concat(dedupedIncoming);
  await AsyncStorage.setItem(scopedKey(TRACKING_QUEUE_KEY, scopeKey), JSON.stringify(next));
  return next.length;
}

export async function removePointsFromQueue(scopeKey, count) {
  const queue = await getTrackingQueue(scopeKey);
  const next = queue.slice(Math.max(0, Number(count) || 0));
  await AsyncStorage.setItem(scopedKey(TRACKING_QUEUE_KEY, scopeKey), JSON.stringify(next));
  return next.length;
}

export async function clearTrackingQueue(scopeKey) {
  await AsyncStorage.removeItem(scopedKey(TRACKING_QUEUE_KEY, scopeKey));
  return 0;
}

export async function getTrackingState(scopeKey) {
  return readJson(scopedKey(TRACKING_STATE_KEY, scopeKey), {
    dutyActive: false,
    lastSyncedAt: null,
    lastError: '',
    dutySessionId: '',
  });
}

export async function saveTrackingState(scopeKey, statePatch) {
  const current = await getTrackingState(scopeKey);
  const next = { ...current, ...(statePatch || {}) };
  await AsyncStorage.setItem(scopedKey(TRACKING_STATE_KEY, scopeKey), JSON.stringify(next));
  return next;
}