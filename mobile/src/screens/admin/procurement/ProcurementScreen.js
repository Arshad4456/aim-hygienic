import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

const cards = [
  { title: 'Supplier Master', description: 'Maintain supplier profiles and warehouse linkages.', route: 'admin:procurement/suppliers' },
  { title: 'Purchase Orders', description: 'Track purchase order creation and approvals.', route: 'admin:procurement/purchase-orders' },
  { title: 'Goods Receipt (GRN)', description: 'Record inbound receipts and update inventory.', route: 'admin:procurement/grn' },
  { title: 'Supplier Payments', description: 'Monitor supplier payment status and settlements.', route: 'admin:procurement/payments' },
];

export default function ProcurementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await apiClient.get('/reports/procurement');
        if (!mounted) return;
        setReport(data?.data || null);
        setErr('');
      } catch (e) {
        if (mounted) setErr(e.message || 'Failed to load procurement report');
      } finally { if (mounted) setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const metrics = useMemo(() => [
    { label: 'Total Suppliers', value: formatNumber(report?.kpis?.totalSuppliers) },
    { label: 'Active Suppliers', value: formatNumber(report?.kpis?.activeSuppliers) },
    { label: 'Purchase Receipts', value: formatNumber(report?.kpis?.totalReceipts) },
    { label: 'Total Qty Received', value: formatNumber(report?.kpis?.totalQuantity) },
  ], [report]);

  const chartData = useMemo(() => report?.inboundTrend?.length ? report.inboundTrend : [
    { label: 'Mon', quantity: 0 }, { label: 'Tue', quantity: 0 }, { label: 'Wed', quantity: 0 },
    { label: 'Thu', quantity: 0 }, { label: 'Fri', quantity: 0 }, { label: 'Sat', quantity: 0 }, { label: 'Sun', quantity: 0 },
  ], [report]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Procurement & Supplier Management</Text>
        <Text style={styles.subtitle}>Manage suppliers, purchase orders, GRNs, and payments with live inbound analytics.</Text>
        <Text style={styles.refresh}>Auto-refreshing every 30 seconds</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <View style={styles.grid}>{metrics.map((m) => <Kpi key={m.label} label={m.label} value={m.value} />)}</View>
        <View style={styles.grid}>{cards.map((c) => <Pressable key={c.title} style={styles.linkCard} onPress={() => navigation?.navigate?.(c.route)}><Text style={styles.linkTitle}>{c.title}</Text><Text style={styles.linkDesc}>{c.description}</Text></Pressable>)}</View>
      </Card>

      <Card>
        <Text style={styles.h2}>Inbound Receipts Trend (7 Days)</Text>
        {chartData.map((row) => <View key={row.label} style={styles.barRow}><Text>{row.label}</Text><Text>{formatNumber(row.quantity)}</Text></View>)}
      </Card>

      <Card>
        <Text style={styles.h2}>Recent Purchase Receipts</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Product', 'Warehouse', 'Quantity', 'Received']} />
            {(report?.recentPurchases || []).map((row) => <Row key={row._id} cols={[row.productName || row.productId, row.warehouseName || row.warehouseId, formatNumber(row.quantity), row.createdAt ? new Date(row.createdAt).toLocaleString() : '—']} />)}
            {!report?.recentPurchases?.length ? <Text style={styles.empty}>No purchase receipts recorded yet.</Text> : null}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function formatNumber(v) { return v === null || v === undefined ? '—' : Number(v).toLocaleString(); }
function Kpi({ label, value }) { return <View style={styles.kpi}><Text style={styles.kpiL}>{label}</Text><Text style={styles.kpiV}>{value}</Text></View>; }
function Row({ cols, head }) { return <View style={[styles.tRow, head && styles.tHead]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c || '—')}</Text>)}</View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' }, subtitle: { marginTop: 4, color: '#6b7280' }, refresh: { marginTop: 4, color: '#059669', fontSize: 12 }, err: { marginTop: 6, color: '#b91c1c' },
  grid: { marginTop: 10, gap: 8 }, kpi: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' }, kpiL: { fontSize: 12, color: '#6b7280' }, kpiV: { marginTop: 4, fontWeight: '700' },
  linkCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' }, linkTitle: { fontWeight: '700' }, linkDesc: { marginTop: 3, color: '#6b7280', fontSize: 12 },
  h2: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }, barRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingVertical: 7 },
  table: { minWidth: 760, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHead: { backgroundColor: '#f8fafc' }, tCell: { width: 190, padding: 8, fontSize: 12 }, empty: { padding: 10, color: '#6b7280' },
});