import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../../../../foundation/auth/useAuth';
import apiClient from '../../../../../infrastructure/api/client';
import Card from '../../../../../foundation/ui/Card';
import Loader from '../../../../../foundation/ui/Loader';

const dashboardLinks = [
  { title: 'Dashboard', route: 'warehouseManager:dashboard' },
  { title: 'Order Management', route: 'warehouseManager:order-management' },
  { title: 'Warehouse & Inventory', route: 'warehouseManager:warehouse-inventory' },
  { title: 'Live Tracking', route: 'admin:live-tracking' },
  { title: 'Company Logistics', route: 'admin:logistics' },
];

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inventoryReport, setInventoryReport] = useState(null);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [dispatchRows, setDispatchRows] = useState([]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return dashboardLinks;
    return dashboardLinks.filter((item) => item.title.toLowerCase().includes(value));
  }, [query]);

  const userName = user?.fullName || user?.name || 'Warehouse Manager';
  const userRole = user?.role || 'Warehouse Manager';
  const userInitials = useMemo(() => {
    const parts = String(userName).split(' ').filter(Boolean);
    const first = parts[0]?.[0] || 'W';
    const second = parts[1]?.[0] || 'M';
    return `${first}${second}`.toUpperCase();
  }, [userName]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setError('');
        const [inventoryRes, ledgerRes, dispatchRes] = await Promise.allSettled([
          apiClient.get('/reports/inventory'),
          apiClient.get('/inventory/ledger?ownerType=company'),
          apiClient.get('/inventory/company-dispatches?status=all'),
        ]);
        if (!mounted) return;
        if (inventoryRes.status === 'fulfilled') setInventoryReport(inventoryRes.value?.data?.module || inventoryRes.value?.data || null);
        if (ledgerRes.status === 'fulfilled') setLedgerRows(ledgerRes.value?.data?.rows || []);
        if (dispatchRes.status === 'fulfilled') setDispatchRows(dispatchRes.value?.data?.rows || dispatchRes.value?.data?.dispatches || []);
        const failure = [inventoryRes, ledgerRes, dispatchRes].find((item) => item.status === 'rejected');
        if (failure) setError(failure.reason?.message || 'Some warehouse signals could not be loaded');
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load warehouse dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
  }, []);

  const received = useMemo(() => ledgerRows.filter((row) => String(row?.direction || '').toLowerCase() === 'in'), [ledgerRows]);
  const outbound = useMemo(() => ledgerRows.filter((row) => String(row?.direction || '').toLowerCase() === 'out'), [ledgerRows]);
  const adjustments = useMemo(() => ledgerRows.filter((row) => ['adjustment_in', 'adjustment_out'].includes(String(row?.movementType || '').toLowerCase())), [ledgerRows]);
  const riskRows = useMemo(() => ledgerRows.filter((row) => ['damage_out', 'expiry_out'].includes(String(row?.movementType || '').toLowerCase())), [ledgerRows]);

  const metrics = useMemo(() => ([
    { label: 'Inventory lines', value: formatNumber(inventoryReport?.kpis?.[0]?.value || ledgerRows.length), note: 'Warehouse ledger-backed stock picture.' },
    { label: 'Inbound rows', value: formatNumber(received.length), note: 'Goods receipts and transfer-ins into company stock.' },
    { label: 'Dispatches', value: formatNumber(dispatchRows.length), note: 'Company dispatch notes prepared for outbound delivery.' },
    { label: 'Risk rows', value: formatNumber(riskRows.length), note: 'Damage and expiry rows needing action.' },
  ]), [inventoryReport, ledgerRows.length, received.length, dispatchRows.length, riskRows.length]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Text style={styles.companyName}>AIM HYGIENICS (PVT) LIMITED</Text>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.eyebrow}>WAREHOUSE CONTROL</Text>
            <Text style={styles.title}>Warehouse Manager Command Center</Text>
            <Text style={styles.subtitle}>See stock movement, dispatch readiness, and warehouse risk from one mobile dashboard instead of only module buttons.</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>{userInitials}</Text></View>
        </View>
        <Text style={styles.userMeta}>{userName} • {userRole}</Text>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search this dashboard..."
          placeholderTextColor="#6b7280"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <View style={styles.grid2}>
        {metrics.map((item) => (
          <View key={item.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
            <Text style={styles.metricNote}>{item.note}</Text>
          </View>
        ))}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Operational Snapshot</Text>
        <View style={styles.stack}>
          <View style={styles.rowCard}><Text style={styles.rowLabel}>Goods receipts captured</Text><Text style={styles.rowValue}>{formatNumber(received.length)}</Text></View>
          <View style={styles.rowCard}><Text style={styles.rowLabel}>Outbound ledger rows</Text><Text style={styles.rowValue}>{formatNumber(outbound.length)}</Text></View>
          <View style={styles.rowCard}><Text style={styles.rowLabel}>Stock adjustments</Text><Text style={styles.rowValue}>{formatNumber(adjustments.length)}</Text></View>
          <View style={styles.rowCard}><Text style={styles.rowLabel}>Damage / expiry</Text><Text style={styles.rowValue}>{formatNumber(riskRows.length)}</Text></View>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickWrap}>
          <Pressable style={styles.quickBtn} onPress={() => navigation?.navigate?.('warehouseManager:warehouse-inventory')}><Text style={styles.quickText}>Open Inventory</Text></Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation?.navigate?.('warehouseManager:order-management')}><Text style={styles.quickText}>Dispatch Preparation</Text></Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation?.navigate?.('admin:logistics')}><Text style={styles.quickText}>Company Logistics</Text></Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation?.navigate?.('admin:live-tracking')}><Text style={styles.quickText}>Live Tracking</Text></Pressable>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Modules</Text>
        <Text style={styles.sectionHint}>Navigate all pages assigned to this dashboard.</Text>
        <View style={styles.modulesWrap}>
          {filtered.map((item) => (
            <Pressable key={item.route} style={styles.moduleItem} onPress={() => navigation?.navigate?.(item.route)}>
              <Text style={styles.moduleText}>{item.title}</Text>
            </Pressable>
          ))}
          {!filtered.length ? <Text style={styles.empty}>No match found.</Text> : null}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26, gap: 12 },
  heroCard: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  companyName: { fontSize: 10, color: '#1d4ed8', fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  eyebrow: { fontSize: 10, color: '#2563eb', fontWeight: '800', letterSpacing: 0.7 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  subtitle: { marginTop: 4, color: '#6b7280', lineHeight: 18 },
  userMeta: { marginTop: 8, color: '#52525b', fontSize: 12 },
  avatar: { width: 42, height: 42, borderRadius: 999, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1d4ed8', fontWeight: '700' },
  search: { marginTop: 12, borderWidth: 1, borderColor: '#93c5fd', borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  error: { marginTop: 10, color: '#b91c1c', fontSize: 12 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { width: '47%', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 16, backgroundColor: '#f8fbff', padding: 14 },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' },
  metricValue: { marginTop: 8, fontSize: 20, fontWeight: '800', color: '#111827' },
  metricNote: { marginTop: 8, color: '#6b7280', fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionHint: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  quickWrap: { marginTop: 10, gap: 8 },
  quickBtn: { borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 12 },
  quickText: { fontSize: 13, color: '#111827', fontWeight: '700' },
  stack: { marginTop: 10, gap: 8 },
  rowCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 12 },
  rowLabel: { color: '#111827', fontSize: 13 },
  rowValue: { color: '#111827', fontSize: 13, fontWeight: '800' },
  modulesWrap: { marginTop: 10, gap: 8 },
  moduleItem: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 12 },
  moduleText: { color: '#111827', fontSize: 13 },
  empty: { color: '#6b7280', fontSize: 12, paddingVertical: 8 },
});
