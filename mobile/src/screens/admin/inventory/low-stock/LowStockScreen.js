import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function LowStockScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await apiClient.get('/inventory/low-stock');
      setRows(data?.lowStock || []);
    } catch (e) {
      setErr(e.message || 'Failed to load low stock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    if (!edit) return;
    try {
      const { data } = await apiClient.put(`/products/${edit.productDbId}`, {
        productId: edit.productId,
        name: edit.name,
        minStockLevel: Number(edit.minStockLevel || 0),
      });
      setRows((s) => s.map((r) => (r.productDbId === edit.productDbId ? { ...r, minStockLevel: data?.product?.minStockLevel } : r)));
      setEdit(null);
    } catch (e) {
      setErr(e.message || 'Failed to update min stock');
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Low Stock Alerts</Text>
        <Text style={styles.subtitle}>Products at or below minimum stock.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Product ID', 'Name', 'Warehouse', 'Available', 'Min Stock', 'Actions'].map((h) => <Text key={h} style={[styles.headCell, h === 'Actions' ? styles.colAction : styles.colData]}>{h}</Text>)}
            </View>
            <View style={{ marginTop: 8, gap: 8 }}>
              {rows.length === 0 ? <Text style={styles.help}>No low stock alerts.</Text> : rows.map((r) => (
                <View key={`${r.productDbId}-${r.warehouseId}`} style={styles.dataRow}>
                  <Text style={[styles.cell, styles.colData]}>{r.productId || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.name || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.warehouseName || r.warehouseId || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.availableStock ?? r.currentStock ?? 0}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.minStockLevel ?? 0}</Text>
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
            <Text style={styles.modalTitle}>Update Min Stock</Text>
            {edit ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.fieldLabel}>Product</Text>
                <Text style={styles.readOnly}>{edit.name} ({edit.productId})</Text>
                <Text style={styles.fieldLabel}>Min Stock Level</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={String(edit.minStockLevel ?? '')} onChangeText={(v) => setEdit((s) => ({ ...s, minStockLevel: v }))} />
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setEdit(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                  <Pressable style={styles.saveBtn} onPress={onSave}><Text style={styles.saveText}>Update</Text></Pressable>
                </View>
              </View>
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
  tableWrap: { minWidth: 1020 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 },
  headCell: { fontSize: 12, fontWeight: '700', color: '#111827' },
  colData: { width: 160 },
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
  fieldLabel: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#374151' },
  readOnly: { marginTop: 4, color: '#111827' },
  input: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  saveText: { color: '#fff', fontWeight: '700' },
});
