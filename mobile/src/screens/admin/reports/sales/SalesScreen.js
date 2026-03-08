import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function SalesScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      setErr('');
      try {
        const data = await apiClient.get('/reports/sales');
        if (!mounted) return;
        setRows(data?.data?.regions || []);
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load sales report');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const highlights = useMemo(() => {
    const totalOrders = rows.reduce((sum, row) => sum + Number(row.orders || 0), 0);
    const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const topRegion = rows[0]?.region || '—';
    return [
      { label: 'Sales Orders', value: formatNumber(totalOrders) },
      { label: 'Units Sold', value: formatNumber(totalQuantity) },
      { label: 'Top Region', value: topRegion },
      { label: 'Regions Covered', value: formatNumber(rows.length) },
    ];
  }, [rows]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Sales Performance</Text>
        <Text style={styles.subtitle}>Revenue, order velocity, and regional performance snapshots.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}

        <View style={styles.metricsWrap}>{highlights.map((item) => <Metric key={item.label} {...item} />)}</View>

        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.table}>
            <Row head cols={['Region', 'Orders', 'Units Sold', 'Last Movement']} />
            {!rows.length ? (
              <Text style={styles.empty}>No sales movements found</Text>
            ) : rows.map((row) => (
              <Row
                key={row.region}
                cols={[
                  row.region || '—',
                  formatNumber(row.orders),
                  formatNumber(row.quantity),
                  row.lastMovementAt ? new Date(row.lastMovementAt).toLocaleDateString() : '—',
                ]}
              />
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
  table: { minWidth: 760, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 180, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  empty: { color: '#6b7280', padding: 10 },
});
