import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function ComplianceScreen() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState({ adjustmentCount: 0, returnCount: 0, messageCount: 0 });
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      setErr('');
      try {
        const data = await apiClient.get('/reports/compliance');
        if (!mounted) return;
        setReport({
          adjustmentCount: data?.data?.adjustmentCount || 0,
          returnCount: data?.data?.returnCount || 0,
          messageCount: data?.data?.messageCount || 0,
        });
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load compliance report');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const metrics = useMemo(() => [
    { label: 'Inventory Adjustments', value: formatNumber(report.adjustmentCount) },
    { label: 'Returns Logged', value: formatNumber(report.returnCount) },
    { label: 'Compliance Messages', value: formatNumber(report.messageCount) },
    { label: 'Audit Records', value: formatNumber(report.adjustmentCount + report.returnCount) },
  ], [report]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Compliance & Quality</Text>
        <Text style={styles.subtitle}>Audit readiness, QC performance, and non-conformance tracking.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}

        <View style={styles.metricsWrap}>{metrics.map((item) => <Metric key={item.label} {...item} />)}</View>

        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.table}>
            <Row head cols={['Compliance Signal', 'Count']} />
            {[
              { label: 'Inventory Adjustments', value: report.adjustmentCount },
              { label: 'Returns Logged', value: report.returnCount },
              { label: 'Compliance Messages', value: report.messageCount },
            ].map((row) => (
              <Row key={row.label} cols={[row.label, formatNumber(row.value)]} />
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
  table: { minWidth: 640, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 300, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
});
