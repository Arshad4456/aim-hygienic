import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { BATCH_SIZE, FG_WATCH_OPTIONS, TRACKING_ROLES } from './constants';
import {
  addPointsToQueue,
  buildTrackingScope,
  clearTrackingQueue,
  getTrackingQueue,
  getTrackingState,
  removePointsFromQueue,
  saveTrackingState,
} from './storage';
import { getDutySummary, postEndDuty, postLocationUpdate, postStartDuty } from './api';
import { startBackgroundTracking, stopBackgroundTracking } from './task';

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase().replace(/\s+/g, '');
}

function isTrackingRole(role) {
  return TRACKING_ROLES.has(normalizeRole(role));
}

function toPoint(position, source = 'mobile-fg') {
  const lat = Number(position?.coords?.latitude);
  const lng = Number(position?.coords?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    latitude: lat,
    longitude: lng,
    accuracy: Number.isFinite(Number(position?.coords?.accuracy)) ? Number(position.coords.accuracy) : null,
    speed: Number.isFinite(Number(position?.coords?.speed)) ? Number(position.coords.speed) : null,
    heading: Number.isFinite(Number(position?.coords?.heading)) ? Number(position.coords.heading) : null,
    altitude: Number.isFinite(Number(position?.coords?.altitude)) ? Number(position.coords.altitude) : null,
    recordedAt: new Date(position?.timestamp || Date.now()).toISOString(),
    source,
  };
}

function isNoActiveDutyMessage(message) {
  const value = String(message || '').toLowerCase();
  return value.includes('no active duty session');
}

export function useDutyTracking(currentUser) {
  const role = currentUser?.role || '';
  const supported = useMemo(() => isTrackingRole(role), [role]);
  const scopeKey = useMemo(() => buildTrackingScope(currentUser), [currentUser]);
  const userId = String(currentUser?.userId || currentUser?.id || currentUser?._id || '').trim();

  const [dutyActive, setDutyActive] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const watchRef = useRef(null);
  const syncingRef = useRef(false);

  const refreshQueueCount = useCallback(async () => {
    const queue = await getTrackingQueue(scopeKey);
    setPendingCount(queue.length);
  }, [scopeKey]);

  const persistStatus = useCallback(
    async (patch) => {
      const next = await saveTrackingState(scopeKey, patch);
      setDutyActive(Boolean(next.dutyActive));
      setLastSyncedAt(next.lastSyncedAt || null);
      setError(next.lastError || '');
      return next;
    },
    [scopeKey]
  );

  const stopAllTracking = useCallback(async () => {
    await stopBackgroundTracking();
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  }, []);

  const flushQueue = useCallback(async () => {
    if (!supported || syncingRef.current || !dutyActive) return;

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      let queue = await getTrackingQueue(scopeKey);
      while (queue.length > 0) {
        const chunk = queue.slice(0, BATCH_SIZE);
        await postLocationUpdate(chunk);
        const nextCount = await removePointsFromQueue(scopeKey, chunk.length);
        const syncedAt = new Date().toISOString();
        await persistStatus({ lastSyncedAt: syncedAt, lastError: '' });
        setPendingCount(nextCount);
        queue = await getTrackingQueue(scopeKey);
      }

      setStatus('Tracking active');
    } catch (e) {
      const message = String(e?.message || 'Sync failed');
      if (isNoActiveDutyMessage(message)) {
        await stopAllTracking();
        await clearTrackingQueue(scopeKey);
        setPendingCount(0);
        await persistStatus({ dutyActive: false, dutySessionId: '', lastError: '' });
        setStatus('Duty ended');
        return;
      }
      await persistStatus({ lastError: message });
      setStatus('Waiting for network');
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [dutyActive, persistStatus, scopeKey, stopAllTracking, supported]);

  const onLocation = useCallback(
    async (position) => {
      const point = toPoint(position);
      if (!point) return;
      const nextCount = await addPointsToQueue(scopeKey, [point]);
      setPendingCount(nextCount);
      if (nextCount >= BATCH_SIZE) {
        await flushQueue();
      }
    },
    [flushQueue, scopeKey]
  );

  const ensureForegroundWatcher = useCallback(async () => {
    if (watchRef.current || !supported) return;
    watchRef.current = await Location.watchPositionAsync(FG_WATCH_OPTIONS, onLocation);
  }, [onLocation, supported]);

  const requestPermissions = useCallback(async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg?.granted) throw new Error('Location permission denied');

    const bg = await Location.requestBackgroundPermissionsAsync();
    if (!bg?.granted) throw new Error('Background location permission denied');
  }, []);

  const reconcileServerDuty = useCallback(async () => {
    if (!supported || !userId) return false;

    try {
      const res = await getDutySummary(userId);
      const hasActiveDuty = Boolean(res?.data?.hasActiveDuty);
      const activeDutySessionId = String(res?.data?.activeDutySessionId || '').trim();

      if (hasActiveDuty) {
        await persistStatus({ dutyActive: true, dutySessionId: activeDutySessionId, lastError: '' });
        setStatus('Tracking active');
        return true;
      }

      await stopAllTracking();
      await clearTrackingQueue(scopeKey);
      setPendingCount(0);
      await persistStatus({ dutyActive: false, dutySessionId: '', lastError: '' });
      setStatus('Idle');
      return false;
    } catch (_error) {
      return false;
    }
  }, [persistStatus, scopeKey, stopAllTracking, supported, userId]);

  const startDuty = useCallback(async () => {
    if (!supported || dutyActive) return;
    setStatus('Starting duty…');
    setError('');

    try {
      await requestPermissions();
      const position = await Location.getCurrentPositionAsync({ accuracy: 4 });
      const point = toPoint(position, 'mobile-start');
      if (!point) throw new Error('Unable to get current location');

      const response = await postStartDuty(point);
      await persistStatus({
        dutyActive: true,
        dutySessionId: String(response?.data?.dutySessionId || ''),
        lastError: '',
      });

      await ensureForegroundWatcher();
      await startBackgroundTracking();

      setStatus('Tracking active');
      await flushQueue();
    } catch (e) {
      const message = String(e?.message || 'Could not start duty');
      await persistStatus({ dutyActive: false, dutySessionId: '', lastError: message });
      setStatus('Idle');
    }
  }, [dutyActive, ensureForegroundWatcher, flushQueue, persistStatus, requestPermissions, supported]);

  const endDuty = useCallback(async () => {
    if (!supported) return;
    setStatus('Ending duty…');

    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: 4 });
      const point = toPoint(position, 'mobile-end');
      if (!point) throw new Error('Unable to get current location');

      await flushQueue();
      await postEndDuty({
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy,
        speed: point.speed,
        heading: point.heading,
        altitude: point.altitude,
        endedAt: point.recordedAt,
        source: point.source,
      });

      await stopAllTracking();
      await clearTrackingQueue(scopeKey);
      setPendingCount(0);
      await persistStatus({ dutyActive: false, dutySessionId: '', lastError: '' });
      setStatus('Duty ended');
    } catch (e) {
      const message = String(e?.message || 'Could not end duty');
      if (isNoActiveDutyMessage(message)) {
        await stopAllTracking();
        await clearTrackingQueue(scopeKey);
        setPendingCount(0);
        await persistStatus({ dutyActive: false, dutySessionId: '', lastError: '' });
        setStatus('Duty ended');
        return;
      }
      await persistStatus({ lastError: message });
      setStatus(dutyActive ? 'Tracking active' : 'Idle');
    }
  }, [dutyActive, flushQueue, persistStatus, scopeKey, stopAllTracking, supported]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const state = await getTrackingState(scopeKey);
      if (!mounted) return;

      setDutyActive(Boolean(state.dutyActive));
      setLastSyncedAt(state.lastSyncedAt || null);
      setError(state.lastError || '');
      await refreshQueueCount();

      const hasServerDuty = await reconcileServerDuty();
      if (!mounted) return;

      if (hasServerDuty) {
        await ensureForegroundWatcher();
        await startBackgroundTracking();
      }
    })();

    return () => {
      mounted = false;
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
    };
  }, [ensureForegroundWatcher, reconcileServerDuty, refreshQueueCount, scopeKey]);

  useEffect(() => {
    if (!supported || !dutyActive) return undefined;
    const timer = setInterval(() => {
      flushQueue();
    }, 15000);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') flushQueue();
    });

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [dutyActive, flushQueue, supported]);

  return {
    supported,
    dutyActive,
    pendingCount,
    lastSyncedAt,
    status,
    error,
    isSyncing,
    startDuty,
    endDuty,
    syncNow: flushQueue,
  };
}