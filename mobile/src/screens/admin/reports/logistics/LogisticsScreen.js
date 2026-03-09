import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function LogisticsScreen() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState({ vehicleCount: 0, transferCounts: [] });
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      setErr('');
      try {
        const data = await apiClient.get('/reports/logistics');
        if (!mounted) return;
        setReport({
          vehicleCount: data?.data?.vehicleCount || 0,
          transferCounts: data?.data?.transferCounts || [],
        });
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load logistics report');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const metrics = useMemo(() => {
    const totalTransfers = report.transferCounts.reduce((sum, row) => sum + Number(row.count || 0), 0);
    return [
      { label: 'Vehicles Tracked', value: formatNumber(report.vehicleCount) },
      { label: 'Transfers Logged', value: formatNumber(totalTransfers) },
      { label: 'Status Buckets', value: formatNumber(report.transferCounts.length) },
      { label: 'Active Transfers', value: formatNumber(activeTransfers(report.transferCounts)) },
    ];
  }, [report]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Logistics & Delivery</Text>
        <Text style={styles.subtitle}>Route performance, fleet utilization, and delivery efficiency.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}

        <View style={styles.metricsWrap}>{metrics.map((item) => <Metric key={item.label} {...item} />)}</View>

        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.table}>
            <Row head cols={['Transfer Status', 'Count']} />
            {!report.transferCounts.length ? (
              <Text style={styles.empty}>No stock transfers found</Text>
            ) : report.transferCounts.map((row) => (
              <Row key={row.status} cols={[row.status || '—', formatNumber(row.count)]} />
            ))}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString();
}

function activeTransfers(rows) {
  return rows.reduce((sum, row) => {
    if (String(row.status || '').toLowerCase() === 'completed') return sum;
    return sum + Number(row.count || 0);
  }, 0);
}

function Metric({ label, value }) {
  return <View style={styles.metricCard}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function Row({ cols, head }) {
  return <View style={[styles.row, head ? styles.head : null]}>{cols.map((c, i) => <Text key={`${i}-${c}`} style={styles.cell}>{String(c)}</Text>)}</View>;
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  err: { marginTop: 8, color: '#b91c1c' },
  metricsWrap: { marginTop: 12, gap: 8 },
  metricCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontWeight: '700', color: '#111827' },
  table: { minWidth: 640, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 300, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  empty: { color: '#6b7280', padding: 10 },
});