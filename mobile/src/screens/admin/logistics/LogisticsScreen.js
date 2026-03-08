import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

const cards = [
  { title: 'Route Planning', description: 'Design routes by warehouse, zone, and area coverage.', route: 'admin:logistics/routes' },
  { title: 'Dispatch & Delivery', description: 'Assign vehicles and drivers to delivery runs.', route: 'admin:logistics/dispatch' },
  { title: 'Vehicle Assignment', description: 'Maintain vehicle master and delivery capacity.', route: 'admin:assets/vehicles' },
];

export default function LogisticsScreen({ navigation }) {
  const [report, setReport] = useState(null);
  const [dispatchQueue, setDispatchQueue] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async (showLoading = false) => {
      if (showLoading && mounted) setLoading(true);
      if (mounted) setErr('');
      try {
        const [logisticsData, dispatchData] = await Promise.all([apiClient.get('/reports/logistics'), apiClient.get('/orders/dispatch')]);
        if (!mounted) return;
        setReport(logisticsData?.data || null);
        setDispatchQueue(dispatchData?.data?.orders || []);
      } catch (e) {
        if (mounted) setErr(e.message || 'Failed to load logistics data');
      } finally {
        if (showLoading && mounted) setLoading(false);
      }
    };
    load(true);
    const interval = setInterval(() => load(false), 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const transferSummary = useMemo(() => {
    const base = report?.transferCounts || [];
    return base.map((row) => ({ status: row.status, count: Number(row.count || 0) })).sort((a, b) => b.count - a.count);
  }, [report]);

  const metrics = useMemo(() => [
    { label: 'Vehicles Available', value: formatNumber(report?.vehicleCount) },
    { label: 'Transfers Tracked', value: formatNumber(transferSummary.reduce((sum, row) => sum + row.count, 0)) },
    { label: 'Transfers (Top Status)', value: transferSummary[0] ? `${transferSummary[0].status} (${transferSummary[0].count})` : '—' },
    { label: 'Dispatch Queue', value: formatNumber(dispatchQueue.length) },
  ], [report, transferSummary, dispatchQueue.length]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Distribution & Logistics</Text>
        <Text style={styles.subtitle}>Plan routes, dispatch deliveries, and track fleet utilization.</Text>
        <Text style={styles.refresh}>Auto-refreshing every 30 seconds</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}

        <View style={styles.grid}>{metrics.map((m) => <Metric key={m.label} label={m.label} value={m.value} />)}</View>

        <View style={styles.grid}>
          {cards.map((c) => (
            <Pressable key={c.title} style={styles.quickLink} onPress={() => navigation?.navigate?.(c.route)}>
              <Text style={styles.quickTitle}>{c.title}</Text>
              <Text style={styles.quickDesc}>{c.description}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.h2}>Transfer Status Mix</Text>
        <Text style={styles.hint}>Snapshot of stock transfer statuses across logistics operations.</Text>
        <View style={styles.table}>
          <Row head cols={['Status', 'Count']} />
          {transferSummary.map((row) => <Row key={row.status} cols={[row.status, formatNumber(row.count)]} />)}
          {!transferSummary.length ? <Text style={styles.empty}>No transfer status data available.</Text> : null}
        </View>
      </Card>
    </ScrollView>
  );
}

function formatNumber(value) { return value === null || value === undefined ? '—' : Number(value).toLocaleString(); }
function Metric({ label, value }) { return <View style={styles.metric}><Text style={styles.metricL}>{label}</Text><Text style={styles.metricV}>{value}</Text></View>; }
function Row({ cols, head }) { return <View style={[styles.row, head ? styles.head : null]}>{cols.map((c, i) => <Text key={i} style={styles.cell}>{String(c)}</Text>)}</View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  refresh: { marginTop: 4, color: '#059669', fontSize: 12 },
  err: { marginTop: 8, color: '#b91c1c' },
  grid: { marginTop: 10, gap: 8 },
  metric: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  metricL: { fontSize: 12, color: '#6b7280' },
  metricV: { marginTop: 4, fontWeight: '700' },
  quickLink: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  quickDesc: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  h2: { fontSize: 16, fontWeight: '700', color: '#111827' },
  hint: { marginTop: 2, color: '#6b7280', fontSize: 12 },
  table: { marginTop: 8, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: '50%', paddingHorizontal: 10, paddingVertical: 8, fontSize: 12 },
  empty: { color: '#6b7280', padding: 10 },
});
