import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Card from '../../ui/Card';
import { useAuth } from '../../auth/useAuth';
import { useDutyTracking } from './useDutyTracking';

function formatTime(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString();
}

export default function DutyTrackingCard() {
  const { role } = useAuth();
  const tracking = useDutyTracking(role);

  if (!tracking.supported) return null;

  return (
    <Card>
      <Text style={styles.title}>Duty Live Tracking</Text>
      <Text style={styles.meta}>Status: {tracking.status}</Text>
      <Text style={styles.meta}>Last synced: {formatTime(tracking.lastSyncedAt)}</Text>
      <Text style={styles.meta}>Pending queue: {tracking.pendingCount}</Text>
      {tracking.error ? <Text style={styles.error}>{tracking.error}</Text> : null}

      <View style={styles.row}>
        <Pressable
          style={[styles.btn, styles.startBtn, tracking.dutyActive && styles.disabled]}
          disabled={tracking.dutyActive}
          onPress={tracking.startDuty}
        >
          <Text style={styles.startText}>Start Duty</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, styles.endBtn, !tracking.dutyActive && styles.disabled]}
          disabled={!tracking.dutyActive}
          onPress={tracking.endDuty}
        >
          <Text style={styles.endText}>End Duty</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.btn, styles.syncBtn]} onPress={tracking.syncNow}>
        <Text style={styles.syncText}>{tracking.isSyncing ? 'Syncing…' : 'Sync Now'}</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  meta: { marginTop: 6, fontSize: 13, color: '#374151' },
  error: { marginTop: 8, fontSize: 12, color: '#b91c1c' },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  startBtn: { flex: 1, borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  endBtn: { flex: 1, borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  syncBtn: { marginTop: 8, borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  startText: { color: '#166534', fontWeight: '700' },
  endText: { color: '#991b1b', fontWeight: '700' },
  syncText: { color: '#1d4ed8', fontWeight: '600' },
  disabled: { opacity: 0.5 },
});