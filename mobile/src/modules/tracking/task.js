import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BG_WATCH_OPTIONS, TRACKING_TASK_NAME } from './constants';
import { addPointsToQueue } from './storage';

function toPoint(location) {
  const lat = Number(location?.coords?.latitude);
  const lng = Number(location?.coords?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    latitude: lat,
    longitude: lng,
    accuracy: Number.isFinite(Number(location?.coords?.accuracy)) ? Number(location.coords.accuracy) : null,
    speed: Number.isFinite(Number(location?.coords?.speed)) ? Number(location.coords.speed) : null,
    heading: Number.isFinite(Number(location?.coords?.heading)) ? Number(location.coords.heading) : null,
    altitude: Number.isFinite(Number(location?.coords?.altitude)) ? Number(location.coords.altitude) : null,
    recordedAt: new Date(location?.timestamp || Date.now()).toISOString(),
    source: 'mobile-bg',
  };
}

if (!TaskManager.isTaskDefined(TRACKING_TASK_NAME)) {
  TaskManager.defineTask(TRACKING_TASK_NAME, async ({ data, error }) => {
    if (error) return;
    const locations = Array.isArray(data?.locations) ? data.locations : [];
    const points = locations.map(toPoint).filter(Boolean);
    if (!points.length) return;
    await addPointsToQueue(points);
  });
}

export async function startBackgroundTracking() {
  const started = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
  if (started) return;
  await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, BG_WATCH_OPTIONS);
}

export async function stopBackgroundTracking() {
  const started = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
  if (!started) return;
  await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME);
}