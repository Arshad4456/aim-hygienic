import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const EMPTY_FORM = {
  warehouseId: '',
  fromEntityName: '',
  toEntityName: '',
  note: '',
  extraDiscPer: '0',
  advTaxPer: '0',
  whTaxPer: '0',
  expense: '0',
  items: [{ productId: '', totalPacks: '', unitPrice: '', totalPrice: '', manufactureDate: '', expiryDate: '' }],
};

const REQUEST_ACTIONS = [
  { label: 'Approve', status: 'APPROVED' },
  { label: 'Dispatch', status: 'DISPATCHED' },
  { label: 'Deliver', status: 'DELIVERED' },
  { label: 'Reject', status: 'REJECTED' },
];

function normalizePayload(form, transactionType) {
  const normalizedItems = (form.items || [])
    .filter((item) => item.productId && Number(item.totalPacks || 0) > 0)
    .map((item) => ({
      productId: item.productId,
      totalPacks: Number(item.totalPacks || 0),
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.totalPrice || 0),
      manufactureDate: item.manufactureDate || undefined,
      expiryDate: item.expiryDate || undefined,
    }));

  return {
    transactionType,
    warehouseId: form.warehouseId,
    fromEntityName: form.fromEntityName,
    toEntityName: form.toEntityName,
    note: form.note,
    extraDiscPer: Number(form.extraDiscPer || 0),
    advTaxPer: Number(form.advTaxPer || 0),
    whTaxPer: Number(form.whTaxPer || 0),
    expense: Number(form.expense || 0),
    items: normalizedItems,
  };
}

export default function InventoryTransactionModule({ title, subtitle, transactionType, showDates = false }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [edit, setEdit] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [warehousesRes, productsRes, txRes] = await Promise.all([
        apiClient.get('/warehouses'),
        apiClient.get('/products'),
        apiClient.get(`/inventory/transactions?transactionType=${transactionType}`),
      ]);
      setWarehouses(warehousesRes.data?.warehouses || []);
      setProducts(productsRes.data?.products || []);
      setRows(txRes.data?.transactions || []);
    } catch (e) {
      setErr(e.message || 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [transactionType]);

  const onAddItem = () => {
    setForm((s) => ({ ...s, items: [...s.items, { productId: '', totalPacks: '', unitPrice: '', totalPrice: '', manufactureDate: '', expiryDate: '' }] }));
  };

  const onItemChange = (index, patch) => {
    setForm((s) => ({
      ...s,
      items: s.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const onCreate = async () => {
    setSaving(true);
    setErr('');
    try {
      await apiClient.post('/inventory/transactions', normalizePayload(form, transactionType));
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setErr(e.message || 'Failed to create stock transaction');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (id) => {
    Alert.alert('Delete transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/inventory/transactions/${id}`);
            await load();
          } catch (e) {
            setErr(e.message || 'Failed to delete transaction');
          }
        },
      },
    ]);
  };

  const onMarkRead = async (id) => {
    try {
      await apiClient.put(`/inventory/transactions/${id}/mark-read`);
      await load();
    } catch (e) {
      setErr(e.message || 'Failed to mark request as read');
    }
  };

  const onChangeRequest = async (id, status) => {
    try {
      await apiClient.put(`/inventory/transactions/${id}/request-status`, { status });
      await load();
    } catch (e) {
      setErr(e.message || `Failed to set status ${status}`);
    }
  };

  const onSaveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    setErr('');
    try {
      await apiClient.put(`/inventory/transactions/${edit._id}`, normalizePayload(edit, transactionType));
      setEdit(null);
      await load();
    } catch (e) {
      setErr(e.message || 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  const warehouseOptions = useMemo(() => warehouses.map((w) => ({ value: w.warehouseId, label: w.name })), [warehouses]);
  const productOptions = useMemo(() => products.map((p) => ({ value: p.productId, label: `${p.productId} - ${p.name}` })), [products]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Text style={styles.label}>Warehouse</Text>
        <PillRow options={warehouseOptions} value={form.warehouseId} onPick={(v) => setForm((s) => ({ ...s, warehouseId: v }))} />
        <Text style={styles.label}>From Entity</Text>
        <TextInput style={styles.input} value={form.fromEntityName} onChangeText={(v) => setForm((s) => ({ ...s, fromEntityName: v }))} />
        <Text style={styles.label}>To Entity</Text>
        <TextInput style={styles.input} value={form.toEntityName} onChangeText={(v) => setForm((s) => ({ ...s, toEntityName: v }))} />

        {form.items.map((item, index) => (
          <View key={`item-${index}`} style={styles.itemBlock}>
            <Text style={styles.itemTitle}>Product Detail #{index + 1}</Text>
            <PillRow options={productOptions} value={item.productId} onPick={(v) => onItemChange(index, { productId: v })} />
            <TextInput style={styles.input} keyboardType="numeric" placeholder="Total Packs" value={String(item.totalPacks)} onChangeText={(v) => onItemChange(index, { totalPacks: v })} />
            <TextInput style={styles.input} keyboardType="numeric" placeholder="Unit Price" value={String(item.unitPrice)} onChangeText={(v) => onItemChange(index, { unitPrice: v })} />
            <TextInput style={styles.input} keyboardType="numeric" placeholder="Total Price" value={String(item.totalPrice)} onChangeText={(v) => onItemChange(index, { totalPrice: v })} />
            {showDates ? (
              <>
                <TextInput style={styles.input} placeholder="Manufacture Date (YYYY-MM-DD)" value={item.manufactureDate || ''} onChangeText={(v) => onItemChange(index, { manufactureDate: v })} />
                <TextInput style={styles.input} placeholder="Expiry Date (YYYY-MM-DD)" value={item.expiryDate || ''} onChangeText={(v) => onItemChange(index, { expiryDate: v })} />
              </>
            ) : null}
          </View>
        ))}
        <Pressable style={styles.secondaryBtn} onPress={onAddItem}><Text style={styles.secondaryText}>+ Add Product Detail</Text></Pressable>

        <Text style={styles.label}>Note</Text>
        <TextInput style={styles.input} value={form.note} onChangeText={(v) => setForm((s) => ({ ...s, note: v }))} />

        <View style={styles.actionRow}>
          <Pressable style={styles.primaryBtn} onPress={onCreate} disabled={saving}><Text style={styles.primaryText}>{saving ? 'Saving...' : 'Submit'}</Text></Pressable>
        </View>
      </Card>

      <Card>
        <Text style={styles.ledgerTitle}>{title} Ledger</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Code', 'Date', 'Warehouse', 'From', 'To', 'Products', 'Qty', 'Status', 'Action'].map((h) => (
                <Text key={h} style={[styles.headCell, h === 'Action' ? styles.colAction : styles.colData]}>{h}</Text>
              ))}
            </View>
            <View style={{ gap: 8, marginTop: 8 }}>
              {rows.length === 0 ? <Text style={styles.help}>No records found.</Text> : rows.map((row) => (
                <View key={row._id} style={styles.dataRow}>
                  <Text style={[styles.cell, styles.colData]}>{row.transactionCode || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{row.transactionAt ? new Date(row.transactionAt).toLocaleDateString() : '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{row.warehouseName || row.warehouseId || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{row.fromEntityName || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{row.toEntityName || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{(row.items || []).map((i) => i.productId).join(', ') || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{(row.items || []).reduce((sum, i) => sum + Number(i.totalPacks || 0), 0)}</Text>
                  <Text style={[styles.cell, styles.colData]}>{row.requestStatus || '-'}</Text>
                  <View style={[styles.actionCell, styles.colAction]}>
                    <Pressable style={styles.actionBtn} onPress={() => setEdit({ ...row, items: (row.items || []).map((i) => ({ ...i, manufactureDate: i.manufactureDate ? String(i.manufactureDate).slice(0, 10) : '', expiryDate: i.expiryDate ? String(i.expiryDate).slice(0, 10) : '' })) })}><Text style={styles.actionText}>Edit</Text></Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => onMarkRead(row._id)}><Text style={styles.actionText}>Read</Text></Pressable>
                    {REQUEST_ACTIONS.map((a) => <Pressable key={a.status} style={styles.actionBtn} onPress={() => onChangeRequest(row._id, a.status)}><Text style={styles.actionText}>{a.label}</Text></Pressable>)}
                    <Pressable style={styles.deleteBtn} onPress={() => onDelete(row._id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(edit)} transparent animationType="slide" onRequestClose={() => setEdit(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Transaction</Text>
            {edit ? (
              <>
                <Text style={styles.label}>From Entity</Text>
                <TextInput style={styles.input} value={edit.fromEntityName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, fromEntityName: v }))} />
                <Text style={styles.label}>To Entity</Text>
                <TextInput style={styles.input} value={edit.toEntityName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, toEntityName: v }))} />
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setEdit(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                  <Pressable style={styles.saveBtn} onPress={onSaveEdit}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text></Pressable>
                </View>
              </>
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
  itemBlock: { marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 8, backgroundColor: '#fff' },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  actionRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  secondaryText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  ledgerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  tableWrap: { minWidth: 1800 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 },
  headCell: { fontSize: 12, fontWeight: '700', color: '#111827' },
  colData: { width: 170 },
  colAction: { width: 260 },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8, alignItems: 'center' },
  cell: { fontSize: 12, color: '#374151' },
  actionCell: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  actionBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#f9fafb' },
  actionText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  deleteBtn: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#fef2f2' },
  deleteText: { fontSize: 11, fontWeight: '700', color: '#991b1b' },
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