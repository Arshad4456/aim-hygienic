import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function SuppliersScreen() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await apiClient.get('/procurement/suppliers');
        if (!mounted) return;
        setSuppliers(data?.data?.suppliers || []);
      } catch (e) { if (mounted) setErr(e.message || 'Failed to load suppliers'); }
      finally { if (mounted) setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <Loader />;
  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Supplier Master</Text>{err ? <Text style={styles.err}>{err}</Text> : null}
    <View style={styles.table}><Row head cols={['Code', 'Supplier', 'Contact', 'Terms', 'Status']} />{suppliers.map((s) => <Row key={s._id} cols={[s.supplierCode, s.name, s.phone || s.email || '—', s.paymentTerms || '—', s.status]} />)}</View>
  </Card></ScrollView>;
}

function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }
const styles = StyleSheet.create({ content: { padding: 12 }, title: { fontSize: 20, fontWeight: '700' }, err: { color: '#b91c1c', marginTop: 6 }, table: { marginTop: 10, borderWidth: 1, borderColor: '#e4e4e7' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHead: { backgroundColor: '#f8fafc' }, tCell: { width: 110, padding: 6, fontSize: 11 } });
