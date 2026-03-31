import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

const cards = [
  { title: 'Supplier Master', route: 'admin:procurement/suppliers' },
  { title: 'Purchase Orders', route: 'admin:procurement/purchase-orders' },
  { title: 'Goods Receipt (GRN)', route: 'admin:procurement/grn' },
  { title: 'Supplier Payments', route: 'admin:procurement/payments' },
];

export default function ProcurementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await apiClient.get('/procurement/summary');
        if (!mounted) return;
        setReport(data?.data || null);
        setErr('');
      } catch (e) { if (mounted) setErr(e.message || 'Failed to load procurement summary'); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const metrics = useMemo(() => [
    { label: 'Suppliers', value: formatNumber(report?.kpis?.totalSuppliers) },
    { label: 'POs', value: formatNumber(report?.kpis?.totalPurchaseOrders) },
    { label: 'GRNs', value: formatNumber(report?.kpis?.totalReceipts) },
    { label: 'Qty Received', value: formatNumber(report?.kpis?.totalQuantity) },
  ], [report]);

  if (loading) return <Loader />;

  return <ScrollView contentContainerStyle={styles.content}><Card>
    <Text style={styles.title}>ERP Procurement</Text>{err ? <Text style={styles.err}>{err}</Text> : null}
    <View style={styles.grid}>{metrics.map((m) => <Kpi key={m.label} label={m.label} value={m.value} />)}</View>
    <View style={styles.grid}>{cards.map((c) => <Pressable key={c.title} style={styles.linkCard} onPress={() => navigation?.navigate?.(c.route)}><Text style={styles.linkTitle}>{c.title}</Text></Pressable>)}</View>
  </Card></ScrollView>;
}

function Kpi({ label, value }) { return <View style={styles.kpi}><Text style={styles.kpiL}>{label}</Text><Text style={styles.kpiV}>{value}</Text></View>; }
function formatNumber(value) { return value === null || value === undefined ? '—' : Number(value).toLocaleString(); }

const styles = StyleSheet.create({ content: { padding: 12, gap: 12, paddingBottom: 26 }, title: { fontSize: 20, fontWeight: '700' }, err: { color: '#b91c1c', marginTop: 6 }, grid: { marginTop: 10, gap: 8 }, kpi: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' }, kpiL: { fontSize: 12, color: '#6b7280' }, kpiV: { marginTop: 4, fontWeight: '700' }, linkCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 }, linkTitle: { fontWeight: '600' } });
