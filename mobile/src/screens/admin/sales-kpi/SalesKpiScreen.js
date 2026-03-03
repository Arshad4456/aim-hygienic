import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function TrendBars({ data = [] }) {
  if (!data.length) return <Text style={styles.help}>No trend data available.</Text>;
  const max = Math.max(...data.map((row) => Number(row.value || row.orders || row.quantity || 0)), 1);

  return (
    <View style={styles.trendWrap}>
      {data.slice(0, 7).map((row, idx) => {
        const val = Number(row.value || row.orders || row.quantity || 0);
        const height = Math.max(8, Math.round((val / max) * 70));
        return (
          <View key={`${row.label || idx}-${idx}`} style={styles.trendBarBlock}>
            <View style={styles.trendTrack}>
              <View style={[styles.trendBar, { height }]} />
            </View>
            <Text numberOfLines={1} style={styles.trendLabel}>{row.label || row.day || `#${idx + 1}`}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function SalesKpiScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get('/sales-kpi/summary');
        if (mounted) setData(res.data || null);
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load sales KPI');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = data?.summary || null;
  const regions = data?.regions || [];
  const topProducts = data?.topProducts || [];
  const topWarehouses = data?.topWarehouses || [];
  const trend = data?.trend || [];

  const metrics = useMemo(() => ([
    { label: 'Sales Orders', value: formatNumber(summary?.orders) },
    { label: 'Units Sold', value: formatNumber(summary?.quantity) },
    { label: 'Orders (7d)', value: formatNumber(summary?.weekOrders) },
    { label: 'Units (7d)', value: formatNumber(summary?.weekQuantity) },
    { label: 'Regions Covered', value: formatNumber(summary?.regions) },
    { label: 'WoW %', value: summary?.weekOverWeek !== undefined ? `${summary.weekOverWeek}%` : '—' },
  ]), [summary]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Sales KPI</Text>
        <Text style={styles.subtitle}>Sales velocity, regional contribution and top movers.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <View style={styles.metricGrid}>
        {metrics.map((item) => (
          <View key={item.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Weekly Sales Trend</Text>
        <TrendBars data={trend} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Regional Contribution</Text>
        <View style={styles.stack}>
          {regions.length
            ? regions.map((row, index) => (
                <View key={`${row.region}-${index}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{row.region}</Text>
                  <Text style={styles.itemSub}>Orders: {formatNumber(row.orders)} • Units: {formatNumber(row.quantity)}</Text>
                </View>
              ))
            : <Text style={styles.help}>No regional sales data available.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Top Products</Text>
        <View style={styles.stack}>
          {topProducts.length
            ? topProducts.map((row, index) => (
                <View key={`${row.name || row.product}-${index}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{row.name || row.product || 'Product'}</Text>
                  <Text style={styles.itemSub}>Orders: {formatNumber(row.orders)} • Units: {formatNumber(row.quantity)}</Text>
                </View>
              ))
            : <Text style={styles.help}>No top products yet.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Top Warehouses</Text>
        <View style={styles.stack}>
          {topWarehouses.length
            ? topWarehouses.map((row, index) => (
                <View key={`${row.name || row.warehouse}-${index}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{row.name || row.warehouse || 'Warehouse'}</Text>
                  <Text style={styles.itemSub}>Orders: {formatNumber(row.orders)} • Units: {formatNumber(row.quantity)}</Text>
                </View>
              ))
            : <Text style={styles.help}>No warehouse ranking available.</Text>}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  error: { marginTop: 8, color: '#b91c1c' },
  help: { color: '#6b7280', fontSize: 13 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fff', padding: 10 },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontSize: 17, fontWeight: '700', color: '#111827' },
  trendWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 6 },
  trendBarBlock: { flex: 1, alignItems: 'center' },
  trendTrack: { height: 76, width: 18, borderRadius: 9, backgroundColor: '#e4e4e7', justifyContent: 'flex-end', overflow: 'hidden' },
  trendBar: { width: 18, backgroundColor: '#10b981' },
  trendLabel: { marginTop: 5, fontSize: 10, color: '#52525b' },
  stack: { gap: 8 },
  itemCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  itemSub: { marginTop: 4, color: '#52525b', fontSize: 12 },
});
