import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { BATCH_SIZE, FG_WATCH_OPTIONS, TRACKING_ROLES } from './constants';
import { addPointsToQueue, getTrackingQueue, getTrackingState, removePointsFromQueue, saveTrackingState } from './storage';
import { postEndDuty, postLocationUpdate, postStartDuty } from './api';
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

export function useDutyTracking(currentRole) {
  const [dutyActive, setDutyActive] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const watchRef = useRef(null);
  const syncingRef = useRef(false);

  const supported = useMemo(() => isTrackingRole(currentRole), [currentRole]);

  const refreshQueueCount = useCallback(async () => {
    const queue = await getTrackingQueue();
    setPendingCount(queue.length);
  }, []);

  const persistStatus = useCallback(async (patch) => {
    const next = await saveTrackingState(patch);
    setDutyActive(Boolean(next.dutyActive));
    setLastSyncedAt(next.lastSyncedAt || null);
    setError(next.lastError || '');
  }, []);

  const flushQueue = useCallback(async () => {
    if (!supported || syncingRef.current) return;

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      let queue = await getTrackingQueue();
      while (queue.length > 0) {
        const chunk = queue.slice(0, BATCH_SIZE);
        await postLocationUpdate(chunk);
        const nextCount = await removePointsFromQueue(chunk.length);
        const syncedAt = new Date().toISOString();
        await persistStatus({ lastSyncedAt: syncedAt, lastError: '' });
        setPendingCount(nextCount);
        queue = await getTrackingQueue();
      }

      setStatus(dutyActive ? 'Tracking active' : 'Idle');
    } catch (e) {
      const message = String(e?.message || 'Sync failed');
      await persistStatus({ lastError: message });
      setStatus('Waiting for network');
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [dutyActive, persistStatus, supported]);

  const onLocation = useCallback(
    async (position) => {
      const point = toPoint(position);
      if (!point) return;
      const nextCount = await addPointsToQueue([point]);
      setPendingCount(nextCount);
      if (nextCount >= BATCH_SIZE) {
        await flushQueue();
      }
    },
    [flushQueue]
  );

  const ensureForegroundWatcher = useCallback(async () => {
    if (watchRef.current || !supported) return;
    watchRef.current = await Location.watchPositionAsync(FG_WATCH_OPTIONS, onLocation);
  }, [onLocation, supported]);

  const stopForegroundWatcher = useCallback(() => {
    if (!watchRef.current) return;
    watchRef.current.remove();
    watchRef.current = null;
  }, []);

  const requestPermissions = useCallback(async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg?.granted) throw new Error('Location permission denied');

    const bg = await Location.requestBackgroundPermissionsAsync();
    if (!bg?.granted) throw new Error('Background location permission denied');
  }, []);

  const startDuty = useCallback(async () => {
    if (!supported) return;
    setStatus('Starting duty…');
    setError('');

    try {
      await requestPermissions();
      const position = await Location.getCurrentPositionAsync({ accuracy: 4 });
      const point = toPoint(position, 'mobile-start');
      if (!point) throw new Error('Unable to get current location');

      await postStartDuty(point);
      await persistStatus({ dutyActive: true, lastError: '' });
      await ensureForegroundWatcher();
      await startBackgroundTracking();

      setStatus('Tracking active');
      await flushQueue();
    } catch (e) {
      const message = String(e?.message || 'Could not start duty');
      await persistStatus({ lastError: message });
      setStatus('Idle');
    }
  }, [ensureForegroundWatcher, flushQueue, persistStatus, requestPermissions, supported]);

  const endDuty = useCallback(async () => {
    if (!supported) return;
    setStatus('Ending duty…');

    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: 4 });
      const point = toPoint(position, 'mobile-end');
      if (!point) throw new Error('Unable to get current location');

      await flushQueue();
      await postEndDuty({ latitude: point.latitude, longitude: point.longitude, accuracy: point.accuracy, speed: point.speed, heading: point.heading, altitude: point.altitude, endedAt: point.recordedAt, source: point.source });
      await stopBackgroundTracking();
      stopForegroundWatcher();
      await persistStatus({ dutyActive: false, lastError: '' });
      setStatus('Duty ended');
    } catch (e) {
      const message = String(e?.message || 'Could not end duty');
      await persistStatus({ lastError: message });
      setStatus('Tracking active');
    }
  }, [flushQueue, persistStatus, stopForegroundWatcher, supported]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const state = await getTrackingState();
      if (!mounted) return;
      setDutyActive(Boolean(state.dutyActive));
      setLastSyncedAt(state.lastSyncedAt || null);
      setError(state.lastError || '');
      await refreshQueueCount();
      if (state.dutyActive && supported) {
        await ensureForegroundWatcher();
        await startBackgroundTracking();
        setStatus('Tracking active');
      }
    })();

    return () => {
      mounted = false;
      stopForegroundWatcher();
    };
  }, [ensureForegroundWatcher, refreshQueueCount, stopForegroundWatcher, supported]);

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