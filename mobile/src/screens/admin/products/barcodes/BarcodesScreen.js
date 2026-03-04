import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function BarcodesScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      setErr('');
      setLoading(true);
      try {
        const { data } = await apiClient.get('/products/barcodes');
        setRows(data?.products || []);
      } catch (e) {
        setErr(e.message || 'Failed to load barcodes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Product Barcode List</Text>
        <Text style={styles.subtitle}>View barcode values for products.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Product ID', 'Name', 'Category', 'Sub-Category', 'Size', 'Barcode'].map((h) => <Text key={h} style={styles.headCell}>{h}</Text>)}
            </View>
            <View style={{ gap: 8, marginTop: 8 }}>
              {rows.length === 0 ? <Text style={styles.help}>No barcodes found.</Text> : rows.map((r) => (
                <View key={r._id} style={styles.dataRow}>
                  <Text style={styles.cell}>{r.productId || '-'}</Text>
                  <Text style={styles.cell}>{r.name || '-'}</Text>
                  <Text style={styles.cell}>{r.category || '-'}</Text>
                  <Text style={styles.cell}>{r.subCategory || '-'}</Text>
                  <Text style={styles.cell}>{r.size || '-'}</Text>
                  <Text style={styles.cell}>{r.barcode || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  tableWrap: { minWidth: 920 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 8 },
  headCell: { width: 150, fontSize: 12, fontWeight: '700', color: '#111827' },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8 },
  cell: { width: 150, fontSize: 12, color: '#374151' },
  help: { color: '#6b7280', fontSize: 13 },
});
