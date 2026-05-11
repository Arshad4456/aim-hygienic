import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';
import Loader from '../../../../../../foundation/ui/Loader';

export default function SuppliersScreen() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await apiClient.get('/users?role=Supplier');
        if (!mounted) return;
        setSuppliers(data?.data?.users || []);
        setErr('');
      } catch (e) { if (mounted) setErr(e.message || 'Failed to load suppliers'); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const metrics = useMemo(() => {
    const active = suppliers.filter((s) => s.status === 'active').length;
    const withWarehouses = suppliers.filter((s) => s.supplierWarehouseName1 || s.supplierWarehouseName2).length;
    return [
      { label: 'Total Suppliers', value: fmt(suppliers.length) },
      { label: 'Active Suppliers', value: fmt(active) },
      { label: 'Linked Warehouses', value: fmt(withWarehouses) },
    ];
  }, [suppliers]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Supplier Master</Text>
        <Text style={styles.subtitle}>Maintain supplier profiles and warehouse linkages with live updates.</Text>
        <Text style={styles.refresh}>Auto-refreshing every 30 seconds</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <View style={styles.grid}>{metrics.map((m) => <Kpi key={m.label} label={m.label} value={m.value} />)}</View>
      </Card>
      <Card>
        <Text style={styles.h2}>Suppliers</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Supplier', 'Contact', 'Status', 'Warehouse Link 1', 'Warehouse Link 2']} />
            {suppliers.map((s) => <Row key={s._id} cols={[s.fullName, `${s.mobile || s.mobileNumber || '—'} ${s.email || ''}`.trim(), s.status || '—', s.supplierWarehouseName1 || '—', s.supplierWarehouseName2 || '—']} />)}
            {!suppliers.length ? <Text style={styles.empty}>No suppliers found. Add suppliers in User Management.</Text> : null}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function fmt(v) { return Number(v || 0).toLocaleString(); }
function Kpi({ label, value }) { return <View style={styles.kpi}><Text style={styles.kpiL}>{label}</Text><Text style={styles.kpiV}>{value}</Text></View>; }
function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 }, title: { fontSize: 20, fontWeight: '700' }, subtitle: { marginTop: 4, color: '#6b7280' }, refresh: { marginTop: 4, color: '#059669', fontSize: 12 }, err: { color: '#b91c1c', marginTop: 6 },
  grid: { marginTop: 10, gap: 8 }, kpi: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' }, kpiL: { fontSize: 12, color: '#6b7280' }, kpiV: { marginTop: 4, fontWeight: '700' },
  h2: { fontSize: 16, fontWeight: '700', marginBottom: 8 }, table: { minWidth: 920, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHead: { backgroundColor: '#f8fafc' }, tCell: { width: 184, padding: 8, fontSize: 12 }, empty: { padding: 10, color: '#6b7280' },
});