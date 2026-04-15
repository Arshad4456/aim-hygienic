import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../auth/useAuth';
import apiClient from '../../api/client';
import Card from '../../ui/Card';
import Loader from '../../ui/Loader';

const dashboardLinks = [
  { title: 'Dashboard', route: 'brandManager:dashboard' },
  { title: 'Primary Order Request', route: 'brandManager:primary-order-request' },
  { title: 'Primary Sale Orders', route: 'brandManager:orders' },
  { title: 'Return Stock', route: 'brandManager:return-stock' },
  { title: 'Messages', route: 'brandManager:messages' },
  { title: 'Account Settings', route: 'brandManager:settings' },
  { title: 'Change Password', route: 'brandManager:settings/change-password' },
];

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `₨ ${Number(value).toLocaleString()}`;
}

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [orders, setOrders] = useState([]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return dashboardLinks;
    return dashboardLinks.filter((item) => item.title.toLowerCase().includes(value));
  }, [query]);

  const userName = user?.fullName || user?.name || 'Brand Manager';
  const userRole = user?.role || 'Brand Manager';
  const userInitials = useMemo(() => {
    const parts = String(userName).split(' ').filter(Boolean);
    const first = parts[0]?.[0] || 'B';
    const second = parts[1]?.[0] || 'M';
    return `${first}${second}`.toUpperCase();
  }, [userName]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setError('');
        const [overviewRes, ordersRes] = await Promise.allSettled([
          apiClient.get('/dashboard/overview'),
          apiClient.get('/orders?family=company_supply'),
        ]);
        if (!mounted) return;
        if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value?.data || null);
        if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value?.data?.orders || []);
        const failure = [overviewRes, ordersRes].find((item) => item.status === 'rejected');
        if (failure) setError(failure.reason?.message || 'Some dashboard signals could not be loaded');
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load brand manager dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => ([
    { label: 'Primary sale orders', value: formatNumber(orders.length), note: 'Company-direct brand supply orders in current scope.' },
    { label: 'Revenue pulse', value: formatCurrency(overview?.kpis?.totalRevenue), note: 'Shared company revenue signal for direct brand channels.' },
    { label: 'Products', value: formatNumber(overview?.modules?.products), note: 'Products available across company stock and direct brand supply.' },
    { label: 'Return queue', value: formatNumber(overview?.modules?.returns), note: 'Return and claims visibility for direct-channel follow-up.' },
  ]), [orders.length, overview]);

  const quickActions = [
    { label: 'Primary Order Request', route: 'brandManager:primary-order-request' },
    { label: 'Primary Sale Orders', route: 'brandManager:orders' },
    { label: 'Return Stock', route: 'brandManager:return-stock' },
    { label: 'Messages', route: 'brandManager:messages' },
  ];

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Text style={styles.companyName}>AIM HYGIENICS (PVT) LIMITED</Text>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.eyebrow}>DIRECT BRAND CHANNEL</Text>
            <Text style={styles.title}>Brand Manager Command Center</Text>
            <Text style={styles.subtitle}>Track direct brand supply, request new stock, watch return pressure, and stay linked to company operations from mobile.</Text>
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
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickWrap}>
          {quickActions.map((action) => (
            <Pressable key={action.route} style={styles.quickBtn} onPress={() => navigation?.navigate?.(action.route)}>
              <Text style={styles.quickText}>{action.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.quickBtn} onPress={() => navigation?.navigate?.('brandManager:settings')}>
            <Text style={styles.quickText}>Account Settings</Text>
          </Pressable>
          <Pressable style={[styles.quickBtn, styles.logoutBtn]} onPress={async () => { await logout(); }}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Modules</Text>
        <Text style={styles.sectionHint}>Navigate the company-side modules available to Brand Manager.</Text>
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
  heroCard: { backgroundColor: '#fff8eb', borderColor: '#fde68a' },
  companyName: { fontSize: 10, color: '#92400e', fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  eyebrow: { fontSize: 10, color: '#b45309', fontWeight: '800', letterSpacing: 0.7 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  subtitle: { marginTop: 4, color: '#6b7280', lineHeight: 18 },
  userMeta: { marginTop: 8, color: '#52525b', fontSize: 12 },
  avatar: { width: 42, height: 42, borderRadius: 999, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#b45309', fontWeight: '700' },
  search: { marginTop: 12, borderWidth: 1, borderColor: '#fcd34d', borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  error: { marginTop: 10, color: '#b91c1c', fontSize: 12 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { width: '47%', borderWidth: 1, borderColor: '#fde68a', borderRadius: 16, backgroundColor: '#fffef7', padding: 14 },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#a16207', textTransform: 'uppercase' },
  metricValue: { marginTop: 8, fontSize: 20, fontWeight: '800', color: '#111827' },
  metricNote: { marginTop: 8, color: '#6b7280', fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionHint: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  quickWrap: { marginTop: 10, gap: 8 },
  quickBtn: { borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, backgroundColor: '#fff8eb', paddingHorizontal: 12, paddingVertical: 12 },
  quickText: { fontSize: 13, color: '#111827', fontWeight: '700' },
  logoutBtn: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  logoutText: { fontSize: 13, color: '#b91c1c', fontWeight: '700' },
  modulesWrap: { marginTop: 10, gap: 8 },
  moduleItem: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 12 },
  moduleText: { color: '#111827', fontSize: 13 },
  empty: { color: '#6b7280', fontSize: 12, paddingVertical: 8 },
});
