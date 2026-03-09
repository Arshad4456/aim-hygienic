import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function PurchaseOrdersScreen() {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [movementData, warehouseData] = await Promise.all([
          apiClient.get('/inventory/movements?movementType=PURCHASE_IN'),
          apiClient.get('/warehouses'),
        ]);
        if (!mounted) return;
        setMovements(movementData?.data?.movements || []);
        setWarehouses(warehouseData?.data?.warehouses || []);
        setErr('');
      } catch (e) { if (mounted) setErr(e.message || 'Failed to load purchase order data'); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const groupedOrders = useMemo(() => {
    const map = new Map();
    movements.forEach((movement) => {
      const key = movement.referenceId || 'Unassigned';
      const entry = map.get(key) || { referenceId: key, receiptCount: 0, totalQuantity: 0, latestAt: null };
      entry.receiptCount += 1;
      entry.totalQuantity += Number(movement.quantity || 0);
      const createdAt = movement.createdAt ? new Date(movement.createdAt) : null;
      if (createdAt && (!entry.latestAt || createdAt > entry.latestAt)) entry.latestAt = createdAt;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => (b.latestAt || 0) - (a.latestAt || 0));
  }, [movements]);

  const metrics = useMemo(() => {
    const totalQty = movements.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    return [
      { label: 'Purchase Orders', value: fmt(groupedOrders.length) },
      { label: 'Inbound Receipts', value: fmt(movements.length) },
      { label: 'Total Quantity', value: fmt(totalQty) },
      { label: 'Warehouses', value: fmt(warehouses.length) },
    ];
  }, [groupedOrders.length, movements, warehouses.length]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Purchase Orders</Text>
        <Text style={styles.subtitle}>Track inbound procurement receipts and warehouse coverage in real time.</Text>
        <Text style={styles.refresh}>Auto-refreshing every 30 seconds</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <View style={styles.grid}>{metrics.map((m) => <Kpi key={m.label} label={m.label} value={m.value} />)}</View>
      </Card>
      <Card>
        <Text style={styles.h2}>Receipt Summary by PO</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['PO Reference', 'Receipt Count', 'Total Quantity', 'Latest Receipt']} />
            {groupedOrders.map((o) => <Row key={o.referenceId} cols={[o.referenceId, fmt(o.receiptCount), fmt(o.totalQuantity), o.latestAt ? o.latestAt.toLocaleString() : '—']} />)}
            {!groupedOrders.length ? <Text style={styles.empty}>No purchase receipts found.</Text> : null}
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
  h2: { fontSize: 16, fontWeight: '700', marginBottom: 8 }, table: { minWidth: 760, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHead: { backgroundColor: '#f8fafc' }, tCell: { width: 190, padding: 8, fontSize: 12 }, empty: { padding: 10, color: '#6b7280' },
});
