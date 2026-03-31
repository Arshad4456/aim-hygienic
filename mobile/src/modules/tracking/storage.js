import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRACKING_QUEUE_KEY, TRACKING_STATE_KEY } from './constants';

async function readJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

export async function getTrackingQueue() {
  const queue = await readJson(TRACKING_QUEUE_KEY, []);
  return Array.isArray(queue) ? queue : [];
}

export async function addPointsToQueue(points) {
  const normalized = Array.isArray(points) ? points.filter(Boolean) : [];
  if (!normalized.length) return 0;
  const queue = await getTrackingQueue();
  const next = queue.concat(normalized);
  await AsyncStorage.setItem(TRACKING_QUEUE_KEY, JSON.stringify(next));
  return next.length;
}

export async function removePointsFromQueue(count) {
  const queue = await getTrackingQueue();
  const next = queue.slice(Math.max(0, Number(count) || 0));
  await AsyncStorage.setItem(TRACKING_QUEUE_KEY, JSON.stringify(next));
  return next.length;
}

export async function getTrackingState() {
  return readJson(TRACKING_STATE_KEY, {
    dutyActive: false,
    lastSyncedAt: null,
    lastError: '',
  });
}

export async function saveTrackingState(statePatch) {
  const current = await getTrackingState();
  const next = { ...current, ...(statePatch || {}) };
  await AsyncStorage.setItem(TRACKING_STATE_KEY, JSON.stringify(next));
  return next;
}