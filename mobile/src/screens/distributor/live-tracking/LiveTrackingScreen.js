import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

function deriveTrackingStatus(lastSeenAt) {
  if (!lastSeenAt) return 'unknown';
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (Number.isNaN(diff)) return 'unknown';
  if (diff <= 90 * 1000) return 'online';
  if (diff <= 5 * 60 * 1000) return 'idle';
  return 'offline';
}

function fmtDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function fmtCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toFixed(5);
}

function fmtSpeed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return `${number.toFixed(1)} km/h`;
}

function fmtHeading(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return `${Math.round(number)}°`;
}

export default function DistributorLiveTrackingScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const load = useCallback(async (mode = 'load') => {
    if (mode === 'load') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError('');
    try {
      const response = await apiClient.get('/location/live-users');
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      const distributorVisible = items.filter((item) => {
        const role = String(item?.role || '').toLowerCase();
        return role === 'salesman' || role === 'orderbooker' || role === 'order booker';
      });
      setUsers(distributorVisible);
      setSelectedUserId((prev) => {
        if (distributorVisible.some((item) => String(item.userId) === String(prev))) return prev;
        return distributorVisible[0]?.userId || '';
      });
    } catch (e) {
      setError(e?.message || 'Failed to load live tracking');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('load');
    const timer = setInterval(() => load('silent'), 20000);
    return () => clearInterval(timer);
  }, [load]);

  const selectedUser = useMemo(() => {
    return users.find((item) => String(item.userId) === String(selectedUserId)) || users[0] || null;
  }, [users, selectedUserId]);

  const summary = useMemo(() => {
    return users.reduce((acc, item) => {
      const status = deriveTrackingStatus(item?.lastSeenAt);
      acc.total += 1;
      if (status === 'online') acc.online += 1;
      if (status === 'idle') acc.idle += 1;
      if (status === 'offline') acc.offline += 1;
      return acc;
    }, { total: 0, online: 0, idle: 0, offline: 0 });
  }, [users]);

  if (loading) return <Loader />;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
    >
      <Card>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Distributor Live Tracking</Text>
            <Text style={styles.subtitle}>View your salesmen and order bookers with latest location and last seen status.</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={() => load('refresh')}>
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.metricRow}>
          <Metric label="Total" value={summary.total} />
          <Metric label="Online" value={summary.online} />
          <Metric label="Idle" value={summary.idle} />
          <Metric label="Offline" value={summary.offline} />
        </View>
      </Card>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Tracked team</Text>
        <Text style={styles.sectionHint}>Only salesmen and order bookers linked to this distributor should appear here.</Text>

        <View style={styles.listWrap}>
          {users.map((item) => {
            const status = deriveTrackingStatus(item?.lastSeenAt);
            const active = String(item.userId) === String(selectedUser?.userId || '');
            return (
              <Pressable key={`${item.userId}-${item.lastSeenAt || ''}`} style={[styles.userCard, active ? styles.userCardActive : null]} onPress={() => setSelectedUserId(item.userId)}>
                <View style={styles.userCardTop}>
                  <Text style={styles.userName}>{item?.fullName || item?.userId || 'Unknown user'}</Text>
                  <View style={[styles.statusPill, status === 'online' ? styles.statusOnline : status === 'idle' ? styles.statusIdle : styles.statusOffline]}>
                    <Text style={styles.statusText}>{status}</Text>
                  </View>
                </View>
                <Text style={styles.userMeta}>{item?.role || '—'} • Territory: {item?.territoryName || '—'}</Text>
                <Text style={styles.userMeta}>Last seen: {fmtDate(item?.lastSeenAt)}</Text>
                <Text style={styles.userMeta}>Lat: {fmtCoordinate(item?.latitude)} • Lng: {fmtCoordinate(item?.longitude)}</Text>
              </Pressable>
            );
          })}
          {!users.length ? <Text style={styles.empty}>No tracked users found.</Text> : null}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Selected user details</Text>
        {!selectedUser ? (
          <Text style={styles.empty}>Select a tracked user to see details.</Text>
        ) : (
          <View style={styles.detailWrap}>
            <Detail label="Full name" value={selectedUser.fullName || '—'} />
            <Detail label="Role" value={selectedUser.role || '—'} />
            <Detail label="Status" value={deriveTrackingStatus(selectedUser.lastSeenAt)} />
            <Detail label="Company" value={selectedUser.companyName || selectedUser.companyId || '—'} />
            <Detail label="Distributor" value={selectedUser.distributorName || selectedUser.distributorId || '—'} />
            <Detail label="Region" value={selectedUser.regionName || '—'} />
            <Detail label="Zone" value={selectedUser.zoneName || '—'} />
            <Detail label="Territory" value={selectedUser.territoryName || '—'} />
            <Detail label="Field" value={selectedUser.fieldName || '—'} />
            <Detail label="Latitude" value={fmtCoordinate(selectedUser.latitude)} />
            <Detail label="Longitude" value={fmtCoordinate(selectedUser.longitude)} />
            <Detail label="Speed" value={fmtSpeed(selectedUser.speed)} />
            <Detail label="Heading" value={fmtHeading(selectedUser.heading)} />
            <Detail label="Last seen" value={fmtDate(selectedUser.lastSeenAt)} />

            <View style={styles.actionRow}>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${selectedUser.latitude},${selectedUser.longitude}`)}
              >
                <Text style={styles.primaryBtnText}>Open in Maps</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Card>
    </ScrollView>
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

function Detail({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{String(value || '—')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 28, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 4, fontSize: 13, color: '#6b7280' },
  refreshBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fafafa' },
  refreshBtnText: { color: '#111827', fontWeight: '700', fontSize: 12 },
  metricRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { flexGrow: 1, minWidth: '22%', borderWidth: 1, borderColor: '#dbeafe', borderRadius: 14, backgroundColor: '#f8fbff', padding: 10 },
  metricLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase' },
  metricValue: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f172a' },
  error: { color: '#b91c1c', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sectionHint: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  listWrap: { marginTop: 12, gap: 8 },
  userCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#fafafa', padding: 12 },
  userCardActive: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  userCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  userName: { flex: 1, fontSize: 14, fontWeight: '800', color: '#111827' },
  userMeta: { marginTop: 4, fontSize: 12, color: '#4b5563' },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusOnline: { backgroundColor: '#dcfce7' },
  statusIdle: { backgroundColor: '#fef3c7' },
  statusOffline: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  empty: { color: '#6b7280', marginTop: 10 },
  detailWrap: { marginTop: 12, gap: 10 },
  detailRow: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fafafa', padding: 12 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  detailValue: { marginTop: 4, fontSize: 14, color: '#111827', fontWeight: '600' },
  actionRow: { marginTop: 6, flexDirection: 'row', gap: 8 },
  primaryBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#16a34a' },
  primaryBtnText: { color: '#ffffff', fontWeight: '800' },
});