import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';
import Loader from '../../../../../../foundation/ui/Loader';

const EMPTY_FORM = { productId: '', warehouseId: '', movementType: 'ADJUSTMENT', quantity: '', reason: '' };

export default function LedgerScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const [productsRes, warehousesRes, movementsRes] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/warehouses'),
        apiClient.get('/inventory/movements'),
      ]);
      setProducts(productsRes.data?.products || []);
      setWarehouses(warehousesRes.data?.warehouses || []);
      setRows(movementsRes.data?.movements || []);
    } catch (e) {
      setErr(e.message || 'Failed to load inventory ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    setErr('');
    setSaving(true);
    try {
      await apiClient.post('/inventory/movements', { ...form, quantity: Number(form.quantity || 0) });
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setErr(e.message || 'Failed to create movement');
    } finally {
      setSaving(false);
    }
  };

  const onClear = async () => {
    Alert.alert('Clear Ledger', 'This will clear all inventory movements. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete('/inventory/movements/clear');
            await load();
          } catch (e) {
            setErr(e.message || 'Failed to clear ledger');
          }
        },
      },
    ]);
  };

  const productOptions = useMemo(() => products.map((p) => ({ value: p.productId, label: `${p.productId} - ${p.name}` })), [products]);
  const warehouseOptions = useMemo(() => warehouses.map((w) => ({ value: w.warehouseId, label: w.name })), [warehouses]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Inventory Ledger</Text>
        <Text style={styles.subtitle}>Track inventory movements and manual adjustments.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Text style={styles.label}>Product</Text>
        <PillRow options={productOptions} value={form.productId} onPick={(v) => setForm((s) => ({ ...s, productId: v }))} />
        <Text style={styles.label}>Warehouse</Text>
        <PillRow options={warehouseOptions} value={form.warehouseId} onPick={(v) => setForm((s) => ({ ...s, warehouseId: v }))} />
        <Text style={styles.label}>Movement Type</Text>
        <PillRow options={[{ value: 'IN', label: 'IN' }, { value: 'OUT', label: 'OUT' }, { value: 'ADJUSTMENT', label: 'ADJUSTMENT' }]} value={form.movementType} onPick={(v) => setForm((s) => ({ ...s, movementType: v }))} />
        <Text style={styles.label}>Quantity</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={String(form.quantity)} onChangeText={(v) => setForm((s) => ({ ...s, quantity: v }))} />
        <Text style={styles.label}>Reason</Text>
        <TextInput style={styles.input} value={form.reason} onChangeText={(v) => setForm((s) => ({ ...s, reason: v }))} />

        <View style={styles.actionRow}>
          <Pressable style={styles.primaryBtn} onPress={onCreate} disabled={saving}><Text style={styles.primaryText}>{saving ? 'Saving...' : 'Add Movement'}</Text></Pressable>
          <Pressable style={styles.dangerBtn} onPress={onClear}><Text style={styles.dangerText}>Clear Ledger</Text></Pressable>
        </View>
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Date', 'Product', 'Warehouse', 'Type', 'Quantity', 'Balance', 'Reason'].map((h) => <Text key={h} style={styles.headCell}>{h}</Text>)}
            </View>
            <View style={{ marginTop: 8, gap: 8 }}>
              {rows.length === 0 ? <Text style={styles.help}>No movements found.</Text> : rows.map((r) => (
                <View key={r._id} style={styles.dataRow}>
                  <Text style={styles.cell}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</Text>
                  <Text style={styles.cell}>{r.productName || r.productId || '-'}</Text>
                  <Text style={styles.cell}>{r.warehouseName || r.warehouseId || '-'}</Text>
                  <Text style={styles.cell}>{r.movementType || '-'}</Text>
                  <Text style={styles.cell}>{r.quantity ?? 0}</Text>
                  <Text style={styles.cell}>{r.runningBalance ?? r.balance ?? '-'}</Text>
                  <Text style={styles.cell}>{r.reason || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function PillRow({ options, value, onPick }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map((o) => (
        <Pressable key={`${o.value}`} style={[styles.chip, value === o.value ? styles.chipActive : null]} onPress={() => onPick(o.value)}>
          <Text style={[styles.chipText, value === o.value ? styles.chipTextActive : null]}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  label: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#374151' },
  input: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', color: '#111827' },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  chipText: { color: '#52525b', fontSize: 12 },
  chipTextActive: { color: '#047857', fontWeight: '700' },
  actionRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  dangerBtn: { flex: 1, borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#fff' },
  dangerText: { color: '#b91c1c', fontWeight: '700' },
  tableWrap: { minWidth: 1240 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 },
  headCell: { width: 170, fontSize: 12, fontWeight: '700', color: '#111827' },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8 },
  cell: { width: 170, fontSize: 12, color: '#374151' },
  help: { color: '#6b7280' },
});