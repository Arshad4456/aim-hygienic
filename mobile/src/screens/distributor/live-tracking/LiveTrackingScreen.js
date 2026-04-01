import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';

function deriveStatus(lastSeenAt) {
  const ts = new Date(lastSeenAt || 0).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return 'unknown';
  const ageMin = (Date.now() - ts) / 60000;
  if (ageMin <= 5) return 'online';
  if (ageMin <= 60) return 'idle';
  return 'offline';
}

function formatDateTime(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString();
}

function formatRelative(value) {
  if (!value) return 'No sync yet';
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return 'No sync yet';
  const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 1) return 'Updated just now';
  if (diffMin < 60) return `Updated ${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

function formatSpeed(speed) {
  const n = Number(speed);
  if (!Number.isFinite(n)) return 'N/A';
  return `${(n * 3.6).toFixed(1)} km/h`;
}

function formatHeading(heading) {
  const n = Number(heading);
  if (!Number.isFinite(n)) return 'N/A';
  return `${Math.round(n)}°`;
}

function statusColors(status) {
  if (status === 'online') return { dot: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' };
  if (status === 'idle') return { dot: '#f59e0b', bg: '#fffbeb', border: '#fde68a', text: '#b45309' };
  if (status === 'offline') return { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' };
  return { dot: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', text: '#475569' };
}

function summaryOf(users) {
  return users.reduce(
    (acc, user) => {
      const status = deriveStatus(user.lastSeenAt);
      acc.total += 1;
      if (status === 'online') acc.online += 1;
      else if (status === 'idle') acc.idle += 1;
      else if (status === 'offline') acc.offline += 1;
      else acc.unknown += 1;
      return acc;
    },
    { total: 0, online: 0, idle: 0, offline: 0, unknown: 0 }
  );
}

export default function LiveTrackingScreen() {
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await apiClient.get('/location/live-users');
      const items = Array.isArray(res?.data?.data?.items) ? res.data.data.items : Array.isArray(res?.data?.items) ? res.data.items : [];
      setUsers(items);
      setLastRefreshedAt(new Date().toISOString());
      setSelectedId((prev) => prev || String(items[0]?.userId || ''));
    } catch (e) {
      setError(e.message || 'Failed to load live tracking');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const status = deriveStatus(user.lastSeenAt);
      const role = String(user.role || '').trim().toLowerCase();
      if (statusFilter && status !== statusFilter) return false;
      if (roleFilter && role !== roleFilter) return false;
      if (!q) return true;
      const haystack = [user.fullName, user.role, user.territoryName, user.fieldName, user.userId].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search, statusFilter, roleFilter]);

  useEffect(() => {
    if (!filtered.some((user) => String(user.userId) === String(selectedId))) {
      setSelectedId(String(filtered[0]?.userId || ''));
    }
  }, [filtered, selectedId]);

  const selectedUser = useMemo(() => filtered.find((item) => String(item.userId) === String(selectedId)) || filtered[0] || null, [filtered, selectedId]);
  const summary = useMemo(() => summaryOf(filtered), [filtered]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Card style={styles.heroCard}>
        <Text style={styles.eyebrow}>DISTRIBUTOR OPERATIONS</Text>
        <Text style={styles.title}>Live Tracking</Text>
        <Text style={styles.subtitle}>Monitor related salesmen and order bookers, check the latest sync, and open each location externally when needed.</Text>
        <View style={styles.heroMetaRow}>
          <Text style={styles.heroMeta}>Last refresh: {formatDateTime(lastRefreshedAt)}</Text>
          <Pressable style={styles.refreshBtn} onPress={load}><Text style={styles.refreshBtnText}>Refresh</Text></Pressable>
        </View>
      </Card>

      <View style={styles.kpiGrid}>
        <Metric label="Team" value={summary.total} color="#111827" />
        <Metric label="Online" value={summary.online} color="#047857" />
        <Metric label="Idle" value={summary.idle} color="#b45309" />
        <Metric label="Offline" value={summary.offline} color="#b91c1c" />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Filters</Text>
        <View style={styles.filterRow}>
          <Chip active={roleFilter === ''} onPress={() => setRoleFilter('')} label="All roles" />
          <Chip active={roleFilter === 'salesman'} onPress={() => setRoleFilter(roleFilter === 'salesman' ? '' : 'salesman')} label="Salesmen" />
          <Chip active={roleFilter === 'order booker'} onPress={() => setRoleFilter(roleFilter === 'order booker' ? '' : 'order booker')} label="Order bookers" />
        </View>
        <View style={styles.filterRow}>
          <Chip active={statusFilter === ''} onPress={() => setStatusFilter('')} label="All status" />
          <Chip active={statusFilter === 'online'} onPress={() => setStatusFilter(statusFilter === 'online' ? '' : 'online')} label="Online" />
          <Chip active={statusFilter === 'idle'} onPress={() => setStatusFilter(statusFilter === 'idle' ? '' : 'idle')} label="Idle" />
          <Chip active={statusFilter === 'offline'} onPress={() => setStatusFilter(statusFilter === 'offline' ? '' : 'offline')} label="Offline" />
        </View>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, role, territory, field..."
          placeholderTextColor="#6b7280"
        />
      </Card>

      {error ? <Card><Text style={styles.error}>{error}</Text></Card> : null}

      <Card>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Tracked team</Text>
            <Text style={styles.sectionHint}>{filtered.length} users visible in this mobile view.</Text>
          </View>
        </View>
        <View style={styles.listWrap}>
          {filtered.map((user) => {
            const status = deriveStatus(user.lastSeenAt);
            const colors = statusColors(status);
            const active = String(user.userId) === String(selectedUser?.userId);
            return (
              <Pressable key={`${user.userId}-${user.lastSeenAt || ''}`} style={[styles.userCard, active && styles.userCardActive]} onPress={() => setSelectedId(String(user.userId))}>
                <View style={styles.userCardTop}>
                  <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{String(user.fullName || 'U').slice(0, 2).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{user.fullName || user.userId || 'Tracked user'}</Text>
                    <Text style={styles.userMeta}>{user.role || '—'} • {user.territoryName || 'No territory'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <View style={[styles.statusDot, { backgroundColor: colors.dot }]} />
                    <Text style={[styles.statusText, { color: colors.text }]}>{status}</Text>
                  </View>
                </View>
                <Text style={styles.userSubMeta}>{user.fieldName || 'No field'} • {formatRelative(user.lastSeenAt)}</Text>
              </Pressable>
            );
          })}
          {!filtered.length ? <Text style={styles.empty}>No tracked team members found for the selected filters.</Text> : null}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Selected user details</Text>
        {selectedUser ? (
          <View style={styles.detailGrid}>
            <Detail label="Name" value={selectedUser.fullName || '—'} />
            <Detail label="Role" value={selectedUser.role || '—'} />
            <Detail label="Last seen" value={formatDateTime(selectedUser.lastSeenAt)} helper={formatRelative(selectedUser.lastSeenAt)} />
            <Detail label="Territory / Field" value={[selectedUser.territoryName, selectedUser.fieldName].filter(Boolean).join(' • ') || '—'} />
            <Detail label="Speed" value={formatSpeed(selectedUser.speed)} />
            <Detail label="Heading" value={formatHeading(selectedUser.heading)} />
            <Pressable
              style={styles.mapOpenBtn}
              onPress={() => {
                const lat = Number(selectedUser.latitude);
                const lng = Number(selectedUser.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                  Linking.openURL(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`);
                }
              }}
            >
              <Text style={styles.mapOpenText}>Open latest location in map</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.empty}>Select a tracked user first.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

function Metric({ label, value, color }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Detail({ label, value, helper }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
      {helper ? <Text style={styles.detailHelper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 28, gap: 12 },
  heroCard: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  eyebrow: { color: '#a7f3d0', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { marginTop: 6, fontSize: 24, fontWeight: '800', color: '#ffffff' },
  subtitle: { marginTop: 6, color: '#cbd5e1', lineHeight: 20 },
  heroMetaRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  heroMeta: { color: '#e2e8f0', fontSize: 12, flex: 1 },
  refreshBtn: { borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 9 },
  refreshBtnText: { color: '#0f172a', fontWeight: '700' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { flexBasis: '48%', flexGrow: 1, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  metricLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  metricValue: { marginTop: 8, fontSize: 24, fontWeight: '800' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sectionHint: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  chipText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#166534' },
  search: { marginTop: 12, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 12, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  listWrap: { marginTop: 12, gap: 10 },
  userCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, backgroundColor: '#fafafa', padding: 12 },
  userCardActive: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  userCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: '#fff', fontWeight: '800' },
  userName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  userMeta: { marginTop: 2, color: '#6b7280', fontSize: 12 },
  userSubMeta: { marginTop: 8, color: '#4b5563', fontSize: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  detailGrid: { marginTop: 12, gap: 10 },
  detailItem: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#fafafa', padding: 12 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { marginTop: 6, fontSize: 14, fontWeight: '700', color: '#111827' },
  detailHelper: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  mapOpenBtn: { marginTop: 4, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center' },
  mapOpenText: { color: '#1d4ed8', fontWeight: '700' },
  error: { color: '#b91c1c', fontSize: 13 },
  empty: { color: '#6b7280', fontSize: 12, paddingVertical: 8 },
});