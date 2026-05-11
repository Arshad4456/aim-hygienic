import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../../infrastructure/api/client';
import Card from '../../../../../foundation/ui/Card';
import Loader from '../../../../../foundation/ui/Loader';

const fallbackServiceHealth = [
  { title: 'Fleet Tracking Coverage', value: 0, note: '0/0 vehicles reporting' },
  { title: 'Warehouse Activity', value: 0, note: '0/0 active in last 14 days' },
  { title: 'Order Approval Rate', value: 0, note: '0 of 0 orders' },
  { title: 'Transfer Completion', value: 0, note: '0/0 transfers closed' },
];

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
}

export default function OperationsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operations, setOperations] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setError('');
        const res = await apiClient.get('/dashboard/operations');
        if (mounted) setOperations(res.data || null);
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load operations dashboard');
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

  const healthStats = useMemo(() => {
    const kpis = operations?.kpis || {};
    return [
      { label: 'Order Fill Rate', value: formatPercent(kpis.orderFillRate), sub: `${formatNumber(kpis.dispatchedOrders)} dispatched` },
      { label: 'On-Time Dispatch', value: formatPercent(kpis.onTimeDispatchRate), sub: `${formatNumber(kpis.totalOrders)} total orders` },
      { label: 'Cycle Time (hrs)', value: formatNumber(kpis.cycleTimeHours), sub: `${formatNumber(kpis.completedOrders)} completed` },
      { label: 'Backlog Orders', value: formatNumber(kpis.backlogOrders), sub: 'Pending approvals' },
    ];
  }, [operations]);

  const serviceHealth = operations?.serviceHealth?.length ? operations.serviceHealth : fallbackServiceHealth;
  const alerts = operations?.alerts || [];
  const focusItems = operations?.focusItems || [];
  const pipeline = operations?.pipeline || [];
  const regions = operations?.regionalCompletion || [];

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Operations Command Center</Text>
        <Text style={styles.subtitle}>Live snapshot of service levels, logistics readiness, and daily execution.</Text>
        <Text style={styles.updated}>Updated every 30 minutes</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <View style={styles.grid2}>
        {healthStats.map((stat) => (
          <View key={stat.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{stat.label}</Text>
            <Text style={styles.metricValue}>{stat.value}</Text>
            <Text style={styles.metricSub}>{stat.sub}</Text>
          </View>
        ))}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Service Health</Text>
        <Text style={styles.sectionSub}>Coverage and utilization by operations. Target ≥ 90%</Text>
        <View style={styles.stack}>
          {serviceHealth.map((item) => (
            <View key={item.title}>
              <View style={styles.barMeta}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.metricSub}>{item.note}</Text>
              </View>
              <View style={styles.track}><View style={[styles.fill, { width: `${Number(item.value || 0)}%`, backgroundColor: Number(item.value || 0) >= 90 ? '#10b981' : '#f59e0b' }]} /></View>
              <Text style={styles.valueRight}>{item.value}%</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Critical Alerts</Text>
        <View style={styles.stack}>
          {alerts.length ? alerts.map((alert, index) => (
            <View key={`${alert.title}-${index}`} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{alert.title}</Text>
              <Text style={styles.metricSub}>{alert.severity} • {alert.detail}</Text>
            </View>
          )) : <Text style={styles.metricSub}>No critical alerts right now.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Today’s Focus</Text>
        <View style={styles.stack}>
          {focusItems.length ? focusItems.map((item, index) => (
            <View key={`${item.title}-${index}`} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.metricSub}>{item.owner} • {item.time}</Text>
            </View>
          )) : <Text style={styles.metricSub}>No focus items available.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Order Execution Pipeline</Text>
        <Text style={styles.sectionSub}>Total orders: {formatNumber(operations?.kpis?.totalOrders)}</Text>
        <View style={styles.grid2}>
          {pipeline.length ? pipeline.map((stage) => (
            <View key={stage.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{stage.label}</Text>
              <Text style={styles.metricValue}>{formatNumber(stage.value)}</Text>
            </View>
          )) : <Text style={styles.metricSub}>Pipeline data will appear once orders are captured.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Regional Order Completion</Text>
        <Text style={styles.sectionSub}>Completion rate for the last 14 days.</Text>
        <View style={styles.stack}>
          {regions.length ? regions.map((row, i) => (
            <View key={`${row.region}-${i}`} style={styles.itemCard}>
              <View style={styles.barMeta}>
                <Text style={styles.itemTitle}>{row.region} Region</Text>
                <Text style={styles.metricSub}>{row.value}%</Text>
              </View>
              <View style={styles.track}><View style={[styles.fill, { width: `${Number(row.value || 0)}%`, backgroundColor: Number(row.value || 0) >= 85 ? '#10b981' : '#f59e0b' }]} /></View>
              <Text style={styles.metricSub}>{formatNumber(row.orders)} orders</Text>
            </View>
          )) : <Text style={styles.metricSub}>Regional activity data will appear once sales dispatch activity is recorded.</Text>}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  updated: { marginTop: 8, color: '#059669', fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionSub: { marginBottom: 8, fontSize: 12, color: '#6b7280' },
  error: { marginTop: 8, color: '#b91c1c' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { width: '48%', borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fff', padding: 10 },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontSize: 17, fontWeight: '700', color: '#111827' },
  metricSub: { marginTop: 3, fontSize: 12, color: '#52525b' },
  stack: { gap: 8 },
  itemCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', marginTop: 6 },
  fill: { height: 8 },
  valueRight: { marginTop: 3, fontSize: 11, color: '#6b7280', textAlign: 'right' },
});