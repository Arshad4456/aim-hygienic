import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../api/client';
import Card from '../../ui/Card';
import Loader from '../../ui/Loader';

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `₨ ${Number(value).toLocaleString()}`;
}

function Spark({ tone = 'emerald' }) {
  const color = {
    emerald: '#10b981',
    blue: '#3b82f6',
    amber: '#f59e0b',
    violet: '#8b5cf6',
  }[tone] || '#71717a';

  return (
    <View style={styles.sparkRow}>
      {[3, 5, 4, 6, 5, 7, 4].map((v, i) => (
        <View key={i} style={[styles.sparkBar, { height: v * 4, backgroundColor: color }]} />
      ))}
    </View>
  );
}

function BarList({ data = [], color = '#10b981', valueKey = 'value' }) {
  const max = Math.max(...data.map((item) => Number(item[valueKey] || 0)), 1);
  return (
    <View style={styles.stack}>
      {data.map((item, idx) => {
        const value = Number(item[valueKey] || 0);
        const width = Math.round((value / max) * 100);
        return (
          <View key={`${item.label || idx}-${idx}`}>
            <View style={styles.barMeta}>
              <Text style={styles.barLabel}>{item.label || `#${idx + 1}`}</Text>
              <Text style={styles.barValue}>{formatNumber(value)}</Text>
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${width}%`, backgroundColor: color }]} /></View>
          </View>
        );
      })}
    </View>
  );
}

function StackedBarList({ data = [] }) {
  const max = Math.max(...data.map((item) => Number(item.inbound || 0) + Number(item.outbound || 0)), 1);
  return (
    <View style={styles.stack}>
      {data.map((item, idx) => {
        const inbound = Number(item.inbound || 0);
        const outbound = Number(item.outbound || 0);
        const inPct = Math.round((inbound / max) * 100);
        const outPct = Math.round((outbound / max) * 100);
        return (
          <View key={`${item.label || idx}-${idx}`}>
            <View style={styles.barMeta}>
              <Text style={styles.barLabel}>{item.label || `#${idx + 1}`}</Text>
              <Text style={styles.barValue}>{formatNumber(inbound)} / {formatNumber(outbound)}</Text>
            </View>
            <View style={styles.trackRow}>
              <View style={[styles.fill, { width: `${inPct}%`, backgroundColor: '#3b82f6' }]} />
              <View style={[styles.fill, { width: `${outPct}%`, backgroundColor: '#f59e0b' }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
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

  const fallbackSeries = [
    { label: 'Mon', value: 0 }, { label: 'Tue', value: 0 }, { label: 'Wed', value: 0 },
    { label: 'Thu', value: 0 }, { label: 'Fri', value: 0 }, { label: 'Sat', value: 0 }, { label: 'Sun', value: 0 },
  ];

  const chartData = useMemo(() => ({
    salesTrend: overview?.charts?.salesTrend?.length ? overview.charts.salesTrend : fallbackSeries,
    inventoryFlow: overview?.charts?.inventoryFlow?.length ? overview.charts.inventoryFlow : fallbackSeries.map((i) => ({ ...i, inbound: 0, outbound: 0 })),
    dailyOrders: overview?.charts?.dailyOrders?.length ? overview.charts.dailyOrders : Array.from({ length: 14 }, (_, i) => ({ label: `Day ${i + 1}`, value: 0 })),
    weeklyRevenue: overview?.charts?.weeklyRevenue?.length ? overview.charts.weeklyRevenue : Array.from({ length: 8 }, (_, i) => ({ label: `W${i + 1}`, value: 0 })),
    monthlyRevenue: overview?.charts?.monthlyRevenue?.length ? overview.charts.monthlyRevenue : Array.from({ length: 12 }, (_, i) => ({ label: `M${i + 1}`, value: 0 })),
    yearlyRevenue: overview?.charts?.yearlyRevenue?.length ? overview.charts.yearlyRevenue : Array.from({ length: 3 }, (_, i) => ({ label: `Y${i + 1}`, value: 0 })),
  }), [overview]);

  const kpis = useMemo(() => ([
    { title: 'Sales Orders', value: formatNumber(overview?.kpis?.salesOrders), sub: `Units Sold: ${formatNumber(overview?.kpis?.salesQuantity)}`, tone: 'emerald' },
    { title: 'Inventory On Hand', value: formatNumber(overview?.kpis?.inventoryOnHand), sub: 'Net movements', tone: 'blue' },
    { title: 'Total Revenue', value: formatCurrency(overview?.kpis?.totalRevenue), sub: `Dispatched: ${formatNumber(overview?.kpis?.dispatchedOrders)}`, tone: 'emerald' },
    { title: 'Active Workforce', value: formatNumber(overview?.kpis?.activeUsers), sub: `Total Users: ${formatNumber(overview?.kpis?.totalUsers)}`, tone: 'blue' },
    { title: 'Tracked Vehicles', value: formatNumber(overview?.kpis?.trackedVehicles), sub: `Fleet: ${formatNumber(overview?.kpis?.totalVehicles)}`, tone: 'amber' },
    { title: 'Pending Expenses', value: formatNumber(overview?.kpis?.pendingExpenses), sub: `Total: ${formatCurrency(overview?.kpis?.expenseTotal)}`, tone: 'violet' },
  ]), [overview]);

  const moduleCards = useMemo(() => ([
    { title: 'Sales & Orders', value: formatNumber(overview?.modules?.salesOrders), sub: `${formatNumber(overview?.modules?.dispatchedOrders)} dispatched`, route: 'admin:order-management' },
    { title: 'Operations Command Center', value: 'Live', sub: 'Service health overview', route: 'admin:operations' },
    { title: 'Inventory & Warehousing', value: formatNumber(overview?.modules?.warehouses), sub: `${formatNumber(overview?.modules?.products)} products`, route: 'admin:warehouse-inventory' },
    { title: 'Logistics & Fleet', value: formatNumber(overview?.modules?.vehicles), sub: `${formatNumber(overview?.kpis?.trackedVehicles)} tracked`, route: 'admin:logistics' },
    { title: 'Finance & Expenses', value: formatCurrency(overview?.kpis?.expenseTotal), sub: `${formatNumber(overview?.kpis?.pendingExpenses)} pending`, route: 'admin:finance' },
    { title: 'HR & Users', value: formatNumber(overview?.kpis?.totalUsers), sub: `${formatNumber(overview?.kpis?.activeUsers)} active`, route: 'admin:hr' },
    { title: 'Returns & Claims', value: formatNumber(overview?.modules?.returns), sub: 'Claims in queue', route: 'admin:order-management/returns' },
    { title: 'Messages', value: formatNumber(overview?.modules?.messages), sub: 'Ops communications', route: 'admin:messages' },
    { title: 'Reports & Analytics', value: 'View', sub: 'Cross-module dashboards', route: 'admin:reports' },
  ]), [overview]);

  const actions = [
    { label: 'Users', route: 'admin:users' },
    { label: 'Products', route: 'admin:products' },
    { label: 'Orders', route: 'admin:order-management' },
    { label: 'Finance', route: 'admin:finance' },
  ];

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Dashboard Overview</Text>
        <Text style={styles.subtitle}>Same admin overview data source as website.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <View style={styles.grid2}>
        {kpis.map((item) => (
          <View key={item.title} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{item.title}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
            <Text style={styles.metricSub}>{item.sub}</Text>
            <Spark tone={item.tone} />
          </View>
        ))}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Module Intelligence</Text>
        <View style={styles.grid2}>
          {moduleCards.map((card) => (
            <Pressable key={card.title} style={styles.moduleCard} onPress={() => navigation?.navigate?.(card.route)}>
              <Text style={styles.metricLabel}>{card.title}</Text>
              <Text style={styles.metricValue}>{card.value}</Text>
              <Text style={styles.metricSub}>{card.sub}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionWrap}>
          {actions.map((action) => (
            <Pressable key={action.route} style={styles.actionBtn} onPress={() => navigation?.navigate?.(action.route)}>
              <Text style={styles.actionText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card><Text style={styles.sectionTitle}>Weekly Sales Trend</Text><BarList data={chartData.salesTrend} color="#10b981" /></Card>
      <Card><Text style={styles.sectionTitle}>Inventory Flow (Inbound / Outbound)</Text><StackedBarList data={chartData.inventoryFlow} /></Card>
      <Card><Text style={styles.sectionTitle}>Daily Orders (Last 14 Days)</Text><BarList data={chartData.dailyOrders} color="#6366f1" /></Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent Inventory Movements</Text>
        <View style={styles.stack}>
          {overview?.recent?.movements?.length
            ? overview.recent.movements.map((row) => (
                <View key={row._id || `${row.productId}-${row.createdAt}`} style={styles.listCard}>
                  <Text style={styles.itemTitle}>{row.productName || row.productId}</Text>
                  <Text style={styles.itemSub}>{row.warehouseName || row.warehouseId} • {row.movementType} • {formatNumber(row.quantity)}</Text>
                </View>
              ))
            : <Text style={styles.metricSub}>No recent movements.</Text>}
        </View>
      </Card>

      <Card><Text style={styles.sectionTitle}>Weekly Revenue (8 Weeks)</Text><BarList data={chartData.weeklyRevenue} color="#10b981" /></Card>
      <Card><Text style={styles.sectionTitle}>Monthly Revenue (12 Months)</Text><BarList data={chartData.monthlyRevenue} color="#f59e0b" /></Card>
      <Card><Text style={styles.sectionTitle}>Yearly Revenue (3 Years)</Text><BarList data={chartData.yearlyRevenue} color="#8b5cf6" /></Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        <View style={styles.stack}>
          {overview?.recent?.expenses?.length
            ? overview.recent.expenses.map((expense) => (
                <View key={expense._id} style={styles.listCard}>
                  <Text style={styles.itemTitle}>{expense.title}</Text>
                  <Text style={styles.itemSub}>{expense.category || 'Uncategorized'} • ₨ {formatNumber(expense.amount)}</Text>
                </View>
              ))
            : <Text style={styles.metricSub}>No recent expenses.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Stock Transfers</Text>
        <View style={styles.stack}>
          {overview?.recent?.transfers?.length
            ? overview.recent.transfers.map((t) => (
                <View key={t._id} style={styles.listCard}>
                  <Text style={styles.itemTitle}>{t.productName || t.productId}</Text>
                  <Text style={styles.itemSub}>{t.fromWarehouseName || t.fromWarehouseId} → {t.toWarehouseName || t.toWarehouseId}</Text>
                  <Text style={styles.itemSub}>Status: {t.status}</Text>
                </View>
              ))
            : <Text style={styles.metricSub}>No recent transfers.</Text>}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  error: { marginTop: 8, color: '#b91c1c' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { width: '48%', borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fff', padding: 10 },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontSize: 16, fontWeight: '700', color: '#111827' },
  metricSub: { marginTop: 3, fontSize: 12, color: '#52525b' },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 6, height: 28 },
  sparkBar: { width: 3, borderRadius: 4 },
  moduleCard: { width: '48%', borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fafafa', padding: 10 },
  actionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  actionText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  stack: { gap: 8 },
  track: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', marginTop: 4 },
  trackRow: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', marginTop: 4, flexDirection: 'row' },
  fill: { height: 8 },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 12, color: '#52525b' },
  barValue: { fontSize: 12, color: '#111827' },
  listCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  itemSub: { marginTop: 3, fontSize: 12, color: '#52525b' },
});