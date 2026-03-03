import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../api/client';
import Card from '../../ui/Card';
import Loader from '../../ui/Loader';

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `Rs. ${Number(value).toLocaleString()}`;
}

function MetricCard({ label, value, sub }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  );
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setError('');
        const res = await apiClient.get('/dashboard/overview');
        if (mounted) setOverview(res.data || null);
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load dashboard overview');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const timer = setInterval(load, 30000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const metrics = useMemo(() => ([
    {
      label: 'Sales Orders',
      value: formatNumber(overview?.kpis?.salesOrders),
      sub: `Units Sold: ${formatNumber(overview?.kpis?.salesQuantity)}`,
    },
    {
      label: 'Inventory On Hand',
      value: formatNumber(overview?.kpis?.inventoryOnHand),
      sub: 'Net movements',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(overview?.kpis?.totalRevenue),
      sub: `Dispatched: ${formatNumber(overview?.kpis?.dispatchedOrders)}`,
    },
    {
      label: 'Active Workforce',
      value: formatNumber(overview?.kpis?.activeUsers),
      sub: `Total Users: ${formatNumber(overview?.kpis?.totalUsers)}`,
    },
    {
      label: 'Tracked Vehicles',
      value: formatNumber(overview?.kpis?.trackedVehicles),
      sub: `Fleet: ${formatNumber(overview?.kpis?.totalVehicles)}`,
    },
    {
      label: 'Pending Expenses',
      value: formatNumber(overview?.kpis?.pendingExpenses),
      sub: `Total: ${formatCurrency(overview?.kpis?.expenseTotal)}`,
    },
  ]), [overview]);

  const modules = useMemo(() => ([
    { label: 'Sales & Orders', value: formatNumber(overview?.modules?.salesOrders) },
    { label: 'Warehouses', value: formatNumber(overview?.modules?.warehouses) },
    { label: 'Products', value: formatNumber(overview?.modules?.products) },
    { label: 'Returns', value: formatNumber(overview?.modules?.returns) },
    { label: 'Messages', value: formatNumber(overview?.modules?.messages) },
  ]), [overview]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Dashboard Overview</Text>
        <Text style={styles.subtitle}>Real-time admin summary from /dashboard/overview</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <View style={styles.metricGrid}>
        {metrics.map((item) => <MetricCard key={item.label} {...item} />)}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Module Snapshot</Text>
        <View style={styles.moduleWrap}>
          {modules.map((item) => (
            <View key={item.label} style={styles.moduleCard}>
              <Text style={styles.moduleLabel}>{item.label}</Text>
              <Text style={styles.moduleValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  error: { marginTop: 8, color: '#b91c1c' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
  },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 6, fontSize: 18, color: '#111827', fontWeight: '700' },
  metricSub: { marginTop: 4, fontSize: 12, color: '#52525b' },
  moduleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moduleCard: {
    width: '48%',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 10,
    padding: 10,
  },
  moduleLabel: { fontSize: 12, color: '#52525b' },
  moduleValue: { marginTop: 4, fontSize: 16, fontWeight: '700', color: '#111827' },
});
