import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function TrendChart({ data }) {
  if (!data.length) return <Text style={styles.help}>No trend data available.</Text>;
  const max = Math.max(...data.map((item) => Number(item.orders || 0)), 1);
  return (
    <View style={styles.stack}>
      {data.map((item, index) => {
        const pct = Math.round((Number(item.orders || 0) / max) * 100);
        return (
          <View key={`${item.day || index}-${index}`}>
            <View style={styles.barMeta}>
              <Text style={styles.barLabel}>{formatDate(item.day)}</Text>
              <Text style={styles.barValue}>{formatNumber(item.orders)} / {formatNumber(item.quantity)}</Text>
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: '#10b981' }]} /></View>
          </View>
        );
      })}
    </View>
  );
}

function InsightCard({ title, rows, labelKey, valueKey }) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.stack}>
        {rows.length
          ? rows.map((row, index) => (
              <View key={`${row[labelKey] || index}-${index}`} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{row[labelKey]}</Text>
                <Text style={styles.itemSub}>{formatNumber(row[valueKey])} Units</Text>
              </View>
            ))
          : <Text style={styles.help}>No data available.</Text>}
      </View>
    </Card>
  );
}

export default function SalesKpiScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [regions, setRegions] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topWarehouses, setTopWarehouses] = useState([]);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError('');
        const res = await apiClient.get('/sales-kpi/summary');
        const data = res.data || {};
        if (!mounted) return;
        setSummary(data.summary || null);
        setRegions(data.regions || []);
        setTopProducts(data.topProducts || []);
        setTopWarehouses(data.topWarehouses || []);
        setTrend(data.trend || []);
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

  const metrics = useMemo(() => {
    const avgDaily = summary?.weekQuantity ? Math.round(summary.weekQuantity / 7) : null;
    return [
      { label: 'Sales Orders', value: formatNumber(summary?.orders) },
      { label: 'Units Sold', value: formatNumber(summary?.quantity) },
      { label: 'Orders (Last 7 Days)', value: formatNumber(summary?.weekOrders) },
      { label: 'Units (Last 7 Days)', value: formatNumber(summary?.weekQuantity) },
      { label: 'Regions Covered', value: formatNumber(summary?.regions) },
      { label: 'Avg Daily Units', value: avgDaily !== null ? formatNumber(avgDaily) : '—' },
      { label: 'Week-over-Week', value: summary?.weekOverWeek !== undefined ? `${summary.weekOverWeek}%` : '—' },
      { label: 'Top Region', value: regions[0]?.region || '—' },
    ];
  }, [summary, regions]);

  const regionMix = useMemo(() => regions.slice(0, 5), [regions]);

  if (loading) return <Loader />;

  const totalMix = regionMix.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Sales KPI Dashboard</Text>
        <Text style={styles.subtitle}>Track sales velocity, regional contribution, and product performance in real time.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <View style={styles.grid2}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
          </View>
        ))}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Weekly Sales Trend</Text>
        <Text style={styles.sectionSub}>Orders and units sold in the last 7 days.</Text>
        <TrendChart data={trend} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Regional Contribution</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeadCell, styles.colRegion]}>Region</Text>
          <Text style={[styles.tableHeadCell, styles.colNumeric]}>Orders</Text>
          <Text style={[styles.tableHeadCell, styles.colNumeric]}>Units</Text>
          <Text style={[styles.tableHeadCell, styles.colDate]}>Last</Text>
        </View>
        <View style={styles.stack}>
          {regions.length ? regions.map((row, index) => (
            <View key={`${row.region}-${index}`} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colRegion]}>{row.region || '—'}</Text>
              <Text style={[styles.tableCell, styles.colNumeric]}>{formatNumber(row.orders)}</Text>
              <Text style={[styles.tableCell, styles.colNumeric]}>{formatNumber(row.quantity)}</Text>
              <Text style={[styles.tableCell, styles.colDate]}>{formatDate(row.lastMovementAt)}</Text>
            </View>
          )) : <Text style={styles.help}>No regional sales data available.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Regional Mix</Text>
        <View style={styles.stack}>
          {regionMix.length ? regionMix.map((row, i) => {
            const pct = Math.round((Number(row.quantity || 0) / totalMix) * 100);
            const color = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e'][i % 5];
            return (
              <View key={`${row.region}-${i}`}>
                <View style={styles.barMeta}><Text style={styles.barLabel}>{row.region}</Text><Text style={styles.barValue}>{pct}%</Text></View>
                <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} /></View>
              </View>
            );
          }) : <Text style={styles.help}>No regional mix data available.</Text>}
        </View>
      </Card>

      <InsightCard title="Top Products" rows={topProducts} labelKey="product" valueKey="quantity" />
      <InsightCard title="Top Warehouses" rows={topWarehouses} labelKey="warehouse" valueKey="quantity" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  error: { marginTop: 8, color: '#b91c1c' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionSub: { marginBottom: 8, fontSize: 12, color: '#6b7280' },
  help: { color: '#6b7280', fontSize: 13 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { width: '48%', borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fff', padding: 10 },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontSize: 17, fontWeight: '700', color: '#111827' },
  stack: { gap: 8 },
  itemCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  itemSub: { marginTop: 3, fontSize: 12, color: '#52525b' },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 12, color: '#52525b' },
  barValue: { fontSize: 12, color: '#111827' },
  track: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', marginTop: 4 },
  fill: { height: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableHeadCell: { fontSize: 12, fontWeight: '700', color: '#111827' },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  tableCell: { fontSize: 12, color: '#374151' },
  colRegion: { flex: 1.3 },
  colNumeric: { flex: 0.8, textAlign: 'right' },
  colDate: { flex: 1, textAlign: 'right' },
});
