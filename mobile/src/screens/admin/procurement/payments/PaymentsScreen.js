import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function PaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await apiClient.get('/expenses');
        if (!mounted) return;
        const expenseRows = data?.data?.expenses || [];
        setPayments(expenseRows.filter((row) => row.vendorName));
        setErr('');
      } catch (e) { if (mounted) setErr(e.message || 'Failed to load supplier payments'); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const metrics = useMemo(() => {
    const totalPaid = payments.filter((row) => ['approved', 'paid'].includes(String(row.status || '').toLowerCase())).reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const pendingCount = payments.filter((row) => String(row.status || '').toLowerCase() === 'pending').length;
    return [
      { label: 'Supplier Payments', value: fmt(payments.length) },
      { label: 'Pending Payments', value: fmt(pendingCount) },
      { label: 'Paid/Approved Amount', value: money(totalPaid) },
    ];
  }, [payments]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Supplier Payments</Text>
        <Text style={styles.subtitle}>Track supplier invoices, due dates, and payment status in real time.</Text>
        <Text style={styles.refresh}>Auto-refreshing every 30 seconds</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <View style={styles.grid}>{metrics.map((m) => <Kpi key={m.label} label={m.label} value={m.value} />)}</View>
      </Card>
      <Card>
        <Text style={styles.h2}>Payment Ledger</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Supplier', 'Category', 'Amount', 'Status', 'Mode', 'Reference', 'Date']} />
            {payments.map((p) => <Row key={p._id} cols={[p.vendorName, p.category || '—', money(p.amount), p.status || '—', p.paymentMode || '—', p.paymentReference || '—', p.expenseDate ? new Date(p.expenseDate).toLocaleDateString() : '—']} />)}
            {!payments.length ? <Text style={styles.empty}>No supplier payment records yet.</Text> : null}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function fmt(v) { return v === null || v === undefined ? '—' : Number(v).toLocaleString(); }
function money(v) { return `₨ ${Number(v || 0).toLocaleString()}`; }
function Kpi({ label, value }) { return <View style={styles.kpi}><Text style={styles.kpiL}>{label}</Text><Text style={styles.kpiV}>{value}</Text></View>; }
function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 }, title: { fontSize: 20, fontWeight: '700' }, subtitle: { marginTop: 4, color: '#6b7280' }, refresh: { marginTop: 4, color: '#059669', fontSize: 12 }, err: { color: '#b91c1c', marginTop: 6 },
  grid: { marginTop: 10, gap: 8 }, kpi: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' }, kpiL: { fontSize: 12, color: '#6b7280' }, kpiV: { marginTop: 4, fontWeight: '700' },
  h2: { fontSize: 16, fontWeight: '700', marginBottom: 8 }, table: { minWidth: 900, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHead: { backgroundColor: '#f8fafc' }, tCell: { width: 128, padding: 8, fontSize: 12 }, empty: { padding: 10, color: '#6b7280' },
});
