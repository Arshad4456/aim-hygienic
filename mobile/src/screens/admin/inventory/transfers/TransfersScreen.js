import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const EMPTY_FORM = { productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', note: '' };

export default function TransfersScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [edit, setEdit] = useState(null);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const [productsRes, warehousesRes, transfersRes] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/warehouses'),
        apiClient.get('/inventory/transfers'),
      ]);
      setProducts(productsRes.data?.products || []);
      setWarehouses(warehousesRes.data?.warehouses || []);
      setRows(transfersRes.data?.transfers || []);
    } catch (e) {
      setErr(e.message || 'Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    setSaving(true);
    setErr('');
    try {
      await apiClient.post('/inventory/transfers', { ...form, quantity: Number(form.quantity || 0) });
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setErr(e.message || 'Failed to create transfer');
    } finally {
      setSaving(false);
    }
  };

  const onSaveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    setErr('');
    try {
      await apiClient.put(`/inventory/transfers/${edit._id}`, { ...edit, quantity: Number(edit.quantity || 0) });
      setEdit(null);
      await load();
    } catch (e) {
      setErr(e.message || 'Failed to update transfer');
    } finally {
      setSaving(false);
    }
  };

  const productOptions = useMemo(() => products.map((p) => ({ value: p.productId, label: `${p.productId} - ${p.name}` })), [products]);
  const warehouseOptions = useMemo(() => warehouses.map((w) => ({ value: w.warehouseId, label: w.name })), [warehouses]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Warehouse Transfers</Text>
        <Text style={styles.subtitle}>Create and track warehouse-to-warehouse stock movement.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Text style={styles.label}>Product</Text>
        <PillRow options={productOptions} value={form.productId} onPick={(v) => setForm((s) => ({ ...s, productId: v }))} />
        <Text style={styles.label}>From Warehouse</Text>
        <PillRow options={warehouseOptions} value={form.fromWarehouseId} onPick={(v) => setForm((s) => ({ ...s, fromWarehouseId: v }))} />
        <Text style={styles.label}>To Warehouse</Text>
        <PillRow options={warehouseOptions.filter((w) => w.value !== form.fromWarehouseId)} value={form.toWarehouseId} onPick={(v) => setForm((s) => ({ ...s, toWarehouseId: v }))} />
        <Text style={styles.label}>Quantity</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={String(form.quantity)} onChangeText={(v) => setForm((s) => ({ ...s, quantity: v }))} />
        <Text style={styles.label}>Note</Text>
        <TextInput style={styles.input} value={form.note} onChangeText={(v) => setForm((s) => ({ ...s, note: v }))} />
        <Pressable style={styles.primaryBtn} onPress={onCreate} disabled={saving}><Text style={styles.primaryText}>{saving ? 'Saving...' : 'Create Transfer'}</Text></Pressable>
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Product', 'From', 'To', 'Qty', 'Status', 'Status Time', 'Note', 'Actions'].map((h) => (
                <Text key={h} style={[styles.headCell, h === 'Actions' ? styles.colAction : styles.colData]}>{h}</Text>
              ))}
            </View>
            <View style={{ marginTop: 8, gap: 8 }}>
              {rows.length === 0 ? <Text style={styles.help}>No transfers yet.</Text> : rows.map((r) => (
                <View key={r._id} style={styles.dataRow}>
                  <Text style={[styles.cell, styles.colData]}>{r.productName || r.productId || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.fromWarehouseName || r.fromWarehouseId || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.toWarehouseName || r.toWarehouseId || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.quantity ?? 0}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.status || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.note || '-'}</Text>
                  <View style={styles.actionCell}><Pressable style={styles.editBtn} onPress={() => setEdit({ ...r })}><Text style={styles.editText}>Edit</Text></Pressable></View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(edit)} transparent animationType="slide" onRequestClose={() => setEdit(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Transfer</Text>
            {edit ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.label}>Status</Text>
                <PillRow options={[{ value: 'pending', label: 'pending' }, { value: 'approved', label: 'approved' }, { value: 'transit-in', label: 'transit-in' }, { value: 'completed', label: 'completed' }]} value={edit.status} onPick={(v) => setEdit((s) => ({ ...s, status: v }))} />
                <Text style={styles.label}>Quantity</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={String(edit.quantity ?? '')} onChangeText={(v) => setEdit((s) => ({ ...s, quantity: v }))} />
                <Text style={styles.label}>Note</Text>
                <TextInput style={styles.input} value={edit.note || ''} onChangeText={(v) => setEdit((s) => ({ ...s, note: v }))} />
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setEdit(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                  <Pressable style={styles.saveBtn} onPress={onSaveEdit} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Update'}</Text></Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
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
  primaryBtn: { marginTop: 10, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  tableWrap: { minWidth: 1360 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 },
  headCell: { fontSize: 12, fontWeight: '700', color: '#111827' },
  colData: { width: 170 },
  colAction: { width: 120 },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8, alignItems: 'center' },
  cell: { fontSize: 12, color: '#374151' },
  actionCell: { width: 120 },
  editBtn: { backgroundColor: '#e0f2fe', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  editText: { color: '#075985', fontWeight: '700', fontSize: 12 },
  help: { color: '#6b7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  saveText: { color: '#fff', fontWeight: '700' },
});
