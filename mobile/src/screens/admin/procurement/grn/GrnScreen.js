import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function GrnScreen() {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await apiClient.get('/inventory/movements?movementType=PURCHASE_IN');
        if (!mounted) return;
        setMovements(data?.data?.movements || []);
        setErr('');
      } catch (e) { if (mounted) setErr(e.message || 'Failed to load GRN data'); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const metrics = useMemo(() => {
    const totalQty = movements.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todaysReceipts = movements.filter((row) => row.createdAt && new Date(row.createdAt) >= today);
    const todaysQty = todaysReceipts.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    return [
      { label: 'Receipts Logged', value: fmt(movements.length) },
      { label: 'Total Quantity', value: fmt(totalQty) },
      { label: 'Today Receipts', value: fmt(todaysReceipts.length) },
      { label: 'Today Quantity', value: fmt(todaysQty) },
    ];
  }, [movements]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Goods Receipt (GRN)</Text>
        <Text style={styles.subtitle}>Record received goods, QC status, batches, and warehouse placement.</Text>
        <Text style={styles.refresh}>Auto-refreshing every 30 seconds</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <View style={styles.grid}>{metrics.map((m) => <Kpi key={m.label} label={m.label} value={m.value} />)}</View>
      </Card>
      <Card>
        <Text style={styles.h2}>Recent GRN Receipts</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Product', 'Warehouse', 'Quantity', 'Reference', 'Received']} />
            {movements.slice(0, 10).map((r) => <Row key={r._id} cols={[r.productName || r.productId, r.warehouseName || r.warehouseId, fmt(r.quantity), r.referenceId || '—', r.createdAt ? new Date(r.createdAt).toLocaleString() : '—']} />)}
            {!movements.length ? <Text style={styles.empty}>No receipts yet. Link GRN entries to purchase orders and inventory movements.</Text> : null}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function fmt(v) { return v === null || v === undefined ? '—' : Number(v).toLocaleString(); }
function Kpi({ label, value }) { return <View style={styles.kpi}><Text style={styles.kpiL}>{label}</Text><Text style={styles.kpiV}>{value}</Text></View>; }
function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 }, title: { fontSize: 20, fontWeight: '700' }, subtitle: { marginTop: 4, color: '#6b7280' }, refresh: { marginTop: 4, color: '#059669', fontSize: 12 }, err: { color: '#b91c1c', marginTop: 6 },
  grid: { marginTop: 10, gap: 8 }, kpi: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' }, kpiL: { fontSize: 12, color: '#6b7280' }, kpiV: { marginTop: 4, fontWeight: '700' },
  h2: { fontSize: 16, fontWeight: '700', marginBottom: 8 }, table: { minWidth: 860, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHead: { backgroundColor: '#f8fafc' }, tCell: { width: 172, padding: 8, fontSize: 12 }, empty: { padding: 10, color: '#6b7280' },
});
