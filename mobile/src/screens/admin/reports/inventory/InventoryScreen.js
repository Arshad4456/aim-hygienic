import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function InventoryScreen() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState({ totalProducts: 0, warehouses: [] });
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      setErr('');
      try {
        const data = await apiClient.get('/reports/inventory');
        if (!mounted) return;
        setReport({
          totalProducts: data?.data?.totalProducts || 0,
          warehouses: data?.data?.warehouses || [],
        });
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load inventory report');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const metrics = useMemo(() => {
    const totalOnHand = report.warehouses.reduce((sum, row) => sum + Number(row.onHand || 0), 0);
    const totalMovements = report.warehouses.reduce((sum, row) => sum + Number(row.movementCount || 0), 0);
    return [
      { label: 'Total SKUs', value: formatNumber(report.totalProducts) },
      { label: 'Warehouses', value: formatNumber(report.warehouses.length) },
      { label: 'Units on Hand', value: formatNumber(totalOnHand) },
      { label: 'Movements Logged', value: formatNumber(totalMovements) },
    ];
  }, [report]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Inventory Health</Text>
        <Text style={styles.subtitle}>Monitor stock coverage, slow movers, and expiry exposure by warehouse.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}

        <View style={styles.metricsWrap}>{metrics.map((item) => <Metric key={item.label} {...item} />)}</View>

        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.tableWide}>
            <Row head cols={['Warehouse', 'Units on Hand', 'Inbound', 'Outbound', 'Last Movement']} />
            {!report.warehouses.length ? (
              <Text style={styles.empty}>No inventory movements found</Text>
            ) : report.warehouses.map((row) => (
              <Row
                key={row.warehouse}
                cols={[
                  row.warehouse || '—',
                  formatNumber(row.onHand),
                  formatNumber(row.inQty),
                  formatNumber(row.outQty),
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
  tableWide: { minWidth: 840, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 160, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  empty: { color: '#6b7280', padding: 10 },
});
