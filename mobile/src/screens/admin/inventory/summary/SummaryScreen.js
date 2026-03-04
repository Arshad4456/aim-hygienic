import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function SummaryScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      setErr('');
      setLoading(true);
      try {
        const [summaryRes, warehouseRes, productsRes] = await Promise.all([
          apiClient.get(`/inventory/summary${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),
          apiClient.get('/warehouses'),
          apiClient.get('/products'),
        ]);
        setRows(summaryRes.data?.summary || []);
        setWarehouses(warehouseRes.data?.warehouses || []);
        setProducts(productsRes.data?.products || []);
      } catch (e) {
        setErr(e.message || 'Failed to load summary');
      } finally {
        setLoading(false);
      }
    })();
  }, [warehouseId]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.productId, p])), [products]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Stock Summary</Text>
        <Text style={styles.subtitle}>Real-time stock by warehouse.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Text style={styles.label}>Select Warehouse</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Pressable style={[styles.chip, !warehouseId ? styles.chipActive : null]} onPress={() => setWarehouseId('')}><Text style={[styles.chipText, !warehouseId ? styles.chipTextActive : null]}>All warehouses</Text></Pressable>
          {warehouses.map((w) => (
            <Pressable key={w._id} style={[styles.chip, warehouseId === w.warehouseId ? styles.chipActive : null]} onPress={() => setWarehouseId(w.warehouseId)}>
              <Text style={[styles.chipText, warehouseId === w.warehouseId ? styles.chipTextActive : null]}>{w.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Product', 'Warehouse', 'Quantity', 'Min Stock'].map((h) => <Text key={h} style={styles.headCell}>{h}</Text>)}
            </View>
            <View style={{ marginTop: 8, gap: 8 }}>
              {rows.length === 0 ? <Text style={styles.help}>No stock data.</Text> : rows.map((row, idx) => {
                const product = productMap.get(row?._id?.productId);
                return (
                  <View key={`${row?._id?.productId}-${row?._id?.warehouseId}-${idx}`} style={styles.dataRow}>
                    <Text style={styles.cell}>{row.productName || row?._id?.productId || '-'}</Text>
                    <Text style={styles.cell}>{row.warehouseName || row?._id?.warehouseId || '-'}</Text>
                    <Text style={styles.cell}>{row.quantity ?? 0}</Text>
                    <Text style={styles.cell}>{product?.minStockLevel ?? 0}</Text>
                  </View>
                );
              })}
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
  label: { marginTop: 10, marginBottom: 4, fontSize: 12, fontWeight: '600', color: '#374151' },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  chipText: { color: '#52525b', fontSize: 12 },
  chipTextActive: { color: '#047857', fontWeight: '700' },
  tableWrap: { minWidth: 800 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 },
  headCell: { width: 190, fontSize: 12, fontWeight: '700', color: '#111827' },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8 },
  cell: { width: 190, fontSize: 12, color: '#374151' },
  help: { color: '#6b7280' },
});