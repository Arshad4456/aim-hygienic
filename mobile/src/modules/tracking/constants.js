export const TRACKING_TASK_NAME = 'aim-duty-location-task';
export const TRACKING_QUEUE_KEY = 'aim_tracking_queue_v1';
export const TRACKING_STATE_KEY = 'aim_tracking_state_v1';

export const TRACKING_ROLES = new Set(['supplier', 'salesman', 'orderbooker']);

export const FG_WATCH_OPTIONS = {
  accuracy: 4,
  timeInterval: 15000,
  distanceInterval: 20,
  mayShowUserSettingsDialog: true,
};

export const BG_WATCH_OPTIONS = {
  accuracy: 3,
  timeInterval: 20000,
  distanceInterval: 25,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: false,
  foregroundService: {
    notificationTitle: 'Live tracking active',
    notificationBody: 'Your duty location is being tracked in background.',
  },
};

export const BATCH_SIZE = 25;
