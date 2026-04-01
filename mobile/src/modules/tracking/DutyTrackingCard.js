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

function statusColors(status) {
  const key = String(status || '').toLowerCase();
  if (key.includes('active')) return { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' };
  if (key.includes('starting') || key.includes('sync')) return { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };
  if (key.includes('waiting')) return { bg: '#fffbeb', border: '#fde68a', text: '#b45309' };
  return { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' };
}

export default function DutyTrackingCard() {
  const { user } = useAuth();
  const tracking = useDutyTracking(user);

  if (!tracking.supported) return null;
  const tone = statusColors(tracking.status);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>FIELD TRACKING</Text>
          <Text style={styles.title}>Duty Live Tracking</Text>
          <Text style={styles.subtitle}>Turn duty on only when the field user is ready to share live movement.</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Text style={[styles.statusPillText, { color: tone.text }]}>{tracking.status}</Text>
        </View>
      </View>

      <View style={styles.metricsWrap}>
        <Metric label="Last synced" value={formatTime(tracking.lastSyncedAt)} />
        <Metric label="Pending queue" value={String(tracking.pendingCount)} />
      </View>
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

      <Pressable
        style={[styles.btn, styles.syncBtn, (!tracking.dutyActive || tracking.isSyncing) && styles.disabled]}
        onPress={tracking.syncNow}
        disabled={!tracking.dutyActive || tracking.isSyncing}
      >
        <Text style={styles.syncText}>{tracking.isSyncing ? 'Syncing live points…' : 'Sync pending points now'}</Text>
      </Pressable>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  eyebrow: { fontSize: 10, color: '#047857', fontWeight: '800', letterSpacing: 0.7 },
  title: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 4, fontSize: 12, color: '#6b7280', maxWidth: 240 },
  statusPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  statusPillText: { fontWeight: '800', fontSize: 12 },
  metricsWrap: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metricCard: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#fafafa', padding: 12 },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { marginTop: 6, fontSize: 13, fontWeight: '700', color: '#111827' },
  error: { marginTop: 10, fontSize: 12, color: '#b91c1c' },
  row: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  startBtn: { flex: 1, borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  endBtn: { flex: 1, borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  syncBtn: { marginTop: 8, borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  startText: { color: '#166534', fontWeight: '800' },
  endText: { color: '#991b1b', fontWeight: '800' },
  syncText: { color: '#1d4ed8', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});