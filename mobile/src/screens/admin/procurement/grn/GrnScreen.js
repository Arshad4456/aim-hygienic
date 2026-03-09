import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function GrnScreen() {
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiClient.get('/procurement/grn');
        if (!mounted) return;
        setReceipts(data?.data?.receipts || []);
      } catch (e) { if (mounted) setErr(e.message || 'Failed to load GRN data'); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <Loader />;
  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Goods Receipt</Text>{err ? <Text style={styles.err}>{err}</Text> : null}
    <View style={styles.table}><Row head cols={['GRN #', 'PO #', 'Supplier', 'Qty']} />{receipts.map((r) => <Row key={r._id} cols={[r.grnNumber, r.poNumber, r.supplierName, Number(r.totalReceivedQty || 0).toLocaleString()]} />)}</View>
  </Card></ScrollView>;
}

function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }
const styles = StyleSheet.create({ content: { padding: 12 }, title: { fontSize: 20, fontWeight: '700' }, err: { color: '#b91c1c', marginTop: 6 }, table: { marginTop: 10, borderWidth: 1, borderColor: '#e4e4e7' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHead: { backgroundColor: '#f8fafc' }, tCell: { width: 120, padding: 6, fontSize: 11 } });
