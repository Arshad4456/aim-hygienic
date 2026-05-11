import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';
import Loader from '../../../../../../foundation/ui/Loader';

function PriceField({ label, value, onChangeText, disabled = false }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, disabled ? styles.inputDisabled : null]}
        editable={!disabled}
        keyboardType="numeric"
        value={String(value ?? '')}
        onChangeText={onChangeText}
      />
    </View>
  );
}

export default function PriceChangeScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await apiClient.get('/products');
      setRows(data?.products || []);
    } catch (e) {
      setErr(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      const payload = {
        ...editRow,
        retailPrice: Number(editRow.retailPrice || 0),
        wholesalePrice: Number(editRow.wholesalePrice || 0),
        tradePrice: Number(editRow.tradePrice || 0),
        taxablePrice: Number(editRow.taxablePrice || 0),
        costPrice: Number(editRow.costPrice || 0),
        customerPrice: Number(editRow.wholesalePrice || 0),
      };
      const { data } = await apiClient.put(`/products/${editRow._id}`, payload);
      setRows((s) => s.map((r) => (r._id === editRow._id ? (data?.product || payload) : r)));
      setEditRow(null);
    } catch (e) {
      Alert.alert('Update Failed', e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Price Change</Text>
        <Text style={styles.subtitle}>Update current pricing fields for any product.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Product ID', 'Name', 'Category', 'Retail', 'Wholesale', 'Trade', 'Taxable', 'Cost', 'Actions'].map((h) => (
                <Text key={h} style={[styles.headCell, h === 'Actions' ? styles.colAction : styles.colData]}>{h}</Text>
              ))}
            </View>
            <View style={{ marginTop: 8, gap: 8 }}>
              {rows.length === 0 ? <Text style={styles.help}>No products found.</Text> : rows.map((r) => (
                <View key={r._id} style={styles.dataRow}>
                  <Text style={[styles.cell, styles.colData]}>{r.productId || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.name || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.category || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.retailPrice ?? 0}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.wholesalePrice ?? 0}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.tradePrice ?? 0}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.taxablePrice ?? 0}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.costPrice ?? 0}</Text>
                  <View style={styles.actionCell}>
                    <Pressable style={styles.editBtn} onPress={() => setEditRow({ ...r })}><Text style={styles.editText}>Edit</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(editRow)} transparent animationType="slide" onRequestClose={() => setEditRow(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Prices</Text>
            {editRow ? (
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                <PriceField label="Product ID" value={editRow.productId} onChangeText={() => {}} disabled />
                <PriceField label="Product Name" value={editRow.name} onChangeText={() => {}} disabled />
                <PriceField label="Retail Price" value={editRow.retailPrice} onChangeText={(v) => setEditRow((s) => ({ ...s, retailPrice: v }))} />
                <PriceField label="Wholesale Price" value={editRow.wholesalePrice} onChangeText={(v) => setEditRow((s) => ({ ...s, wholesalePrice: v }))} />
                <PriceField label="Trade Price" value={editRow.tradePrice} onChangeText={(v) => setEditRow((s) => ({ ...s, tradePrice: v }))} />
                <PriceField label="Taxable Price" value={editRow.taxablePrice} onChangeText={(v) => setEditRow((s) => ({ ...s, taxablePrice: v }))} />
                <PriceField label="Cost Price" value={editRow.costPrice} onChangeText={(v) => setEditRow((s) => ({ ...s, costPrice: v }))} />
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setEditRow(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                  <Pressable style={styles.saveBtn} onPress={onSave} disabled={saving}><Text style={styles.saveText}>{saving ? 'Updating...' : 'Update'}</Text></Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  tableWrap: { minWidth: 1160 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 },
  headCell: { fontSize: 12, color: '#111827', fontWeight: '700' },
  colData: { width: 120 },
  colAction: { width: 120 },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8, alignItems: 'center' },
  cell: { fontSize: 12, color: '#374151' },
  actionCell: { width: 120 },
  editBtn: { backgroundColor: '#e0f2fe', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  editText: { color: '#075985', fontWeight: '700', fontSize: 12 },
  help: { color: '#6b7280', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  input: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', color: '#111827' },
  inputDisabled: { backgroundColor: '#f4f4f5' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});