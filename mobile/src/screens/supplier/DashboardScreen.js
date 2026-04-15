import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../auth/useAuth';
import apiClient from '../../api/client';
import Card from '../../ui/Card';
import Loader from '../../ui/Loader';
import DutyTrackingCard from '../../modules/tracking/DutyTrackingCard';

const dashboardLinks = [
  { title: 'Dashboard', route: 'supplier:dashboard' },
  { title: 'Primary Orders', route: 'supplier:primary-orders' },
];

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `₨ ${Number(value).toLocaleString()}`;
}

function totalItems(transaction) {
  return Array.isArray(transaction?.items)
    ? transaction.items.reduce((sum, item) => sum + Number(item?.quantity || item?.totalPacks || 0), 0)
    : 0;
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return dashboardLinks;
    return dashboardLinks.filter((item) => item.title.toLowerCase().includes(value));
  }, [query]);

  const userName = user?.fullName || user?.name || 'Supplier';
  const userRole = user?.role || 'Supplier';
  const userInitials = useMemo(() => {
    const parts = String(userName).split(' ').filter(Boolean);
    const first = parts[0]?.[0] || 'S';
    const second = parts[1]?.[0] || 'P';
    return `${first}${second}`.toUpperCase();
  }, [userName]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setError('');
        const txRes = await apiClient.get('/inventory/transactions/supplier/primary?limit=300');
        if (mounted) setRows(txRes?.data?.transactions || []);
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load supplier dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const assigned = rows.length;
    const podUploaded = rows.filter((item) => item?.podUrl).length;
    const pendingPod = rows.filter((item) => !item?.podUrl).length;
    const totalQty = rows.reduce((sum, item) => sum + totalItems(item), 0);
    const totalValue = rows.reduce((sum, item) => sum + Number(item?.grandTotal || item?.subtotal || 0), 0);
    return { assigned, podUploaded, pendingPod, totalQty, totalValue };
  }, [rows]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Text style={styles.companyName}>AIM HYGIENICS (PVT) LIMITED</Text>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.eyebrow}>SUPPLIER EXECUTION</Text>
            <Text style={styles.title}>Supplier Command Center</Text>
            <Text style={styles.subtitle}>View assigned primary orders, watch POD readiness, and share live location while duty is active.</Text>
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
        <View style={styles.metricCard}><Text style={styles.metricLabel}>Assigned Orders</Text><Text style={styles.metricValue}>{formatNumber(stats.assigned)}</Text><Text style={styles.metricNote}>Primary orders assigned by company admin.</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricLabel}>POD Uploaded</Text><Text style={styles.metricValue}>{formatNumber(stats.podUploaded)}</Text><Text style={styles.metricNote}>Orders with proof of delivery already uploaded.</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricLabel}>Pending POD</Text><Text style={styles.metricValue}>{formatNumber(stats.pendingPod)}</Text><Text style={styles.metricNote}>Orders waiting for supplier POD upload.</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricLabel}>Assigned Value</Text><Text style={styles.metricValue}>{formatCurrency(stats.totalValue)}</Text><Text style={styles.metricNote}>{formatNumber(stats.totalQty)} total quantity across assigned orders.</Text></View>
      </View>

      <DutyTrackingCard />

      <Card>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickWrap}>
          <Pressable style={styles.quickBtn} onPress={() => navigation?.navigate?.('supplier:primary-orders')}><Text style={styles.quickText}>Open Primary Orders</Text></Pressable>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Modules</Text>
        <Text style={styles.sectionHint}>Navigate supplier-side execution screens.</Text>
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
  modulesWrap: { marginTop: 10, gap: 8 },
  moduleItem: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 12 },
  moduleText: { color: '#111827', fontSize: 13 },
  empty: { color: '#6b7280', fontSize: 12, paddingVertical: 8 },
});
