import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

export default function RegionsScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const [listRes, warehouseRes] = await Promise.all([
        apiClient.get(`/regions?search=${encodeURIComponent(search)}${warehouseId ? `&warehouseId=${encodeURIComponent(warehouseId)}` : ''}`),
        apiClient.get('/warehouses'),
      ]);
      setRows(listRes.data?.regions || []);
      setWarehouses(warehouseRes.data?.warehouses || []);
    } catch (e) {
      setErr(e.message || 'Failed to load regions');
    } finally {
      setLoading(false);
    }
  }, [search, warehouseId]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id) => {
    try {
      await apiClient.delete(`/regions/${id}`);
      load();
    } catch (e) {
      Alert.alert('Delete failed', e.message || 'Failed to delete region');
    }
  };

  const onSave = async () => {
    if (!edit?._id) return;
    try {
      await apiClient.put(`/regions/${edit._id}`, edit);
      setEdit(null);
      load();
    } catch (e) {
      Alert.alert('Update failed', e.message || 'Failed to update region');
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Region List</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search by ID, name or warehouse" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterWrap}>
          <Pressable style={[styles.chip, !warehouseId ? styles.chipActive : null]} onPress={() => setWarehouseId('')}><Text style={!warehouseId ? styles.chipTextActive : null}>All Warehouses</Text></Pressable>
          {warehouses.map((w) => <Pressable key={w._id} style={[styles.chip, warehouseId === w.warehouseId ? styles.chipActive : null]} onPress={() => setWarehouseId(w.warehouseId)}><Text style={warehouseId === w.warehouseId ? styles.chipTextActive : null}>{w.name}</Text></Pressable>)}
        </ScrollView>
      </Card>

      <Card>
        <ScrollView horizontal>
          <View style={styles.tableWrap}>
            <View style={styles.header}><Text style={styles.head}>ID</Text><Text style={styles.head}>Name</Text><Text style={styles.head}>Warehouse</Text><Text style={styles.head}>Status</Text><Text style={styles.head}>Actions</Text></View>
            {rows.length === 0 ? <Text style={styles.empty}>No regions found.</Text> : rows.map((r) => (
              <View style={styles.row} key={r._id}>
                <Text style={styles.cell}>{r.regionId || '-'}</Text><Text style={styles.cell}>{r.name || '-'}</Text><Text style={styles.cell}>{r.warehouseName || '-'}</Text><Text style={styles.cell}>{r.status || 'active'}</Text>
                <View style={[styles.cell, styles.actions]}>
                  <Pressable style={styles.btn} onPress={() => setEdit({ ...r })}><Text style={styles.btnText}>Edit</Text></Pressable>
                  <Pressable style={[styles.btn, styles.btnDelete]} onPress={() => onDelete(r._id)}><Text style={styles.btnDeleteText}>Delete</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(edit)} transparent animationType="slide" onRequestClose={() => setEdit(null)}>
        <View style={styles.overlay}><View style={styles.modal}><Text style={styles.title}>Edit Region</Text>
          <TextInput style={styles.input} value={edit?.regionId || ''} onChangeText={(v) => setEdit((s) => ({ ...s, regionId: v }))} placeholder="Region ID" />
          <TextInput style={styles.input} value={edit?.name || ''} onChangeText={(v) => setEdit((s) => ({ ...s, name: v }))} placeholder="Region Name" />
          <TextInput style={styles.input} value={edit?.warehouseName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, warehouseName: v }))} placeholder="Warehouse Name" />
          <View style={styles.modalActions}><Pressable style={styles.btn} onPress={onSave}><Text style={styles.btnText}>Update</Text></Pressable><Pressable style={styles.btn} onPress={() => setEdit(null)}><Text style={styles.btnText}>Cancel</Text></Pressable></View>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#18181b', marginBottom: 8 },
  err: { color: '#dc2626', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, backgroundColor: '#fff', marginBottom: 8 },
  filterWrap: { gap: 8 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  chipTextActive: { color: '#fff' },
  tableWrap: { minWidth: 740 },
  header: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e4e4e7', paddingBottom: 6 },
  head: { width: 140, fontWeight: '700', color: '#27272a' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5', paddingVertical: 8 },
  cell: { width: 140, color: '#3f3f46' },
  actions: { flexDirection: 'row', gap: 6 },
  btn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnText: { fontSize: 12, color: '#111827' },
  btnDelete: { borderColor: '#fecaca' },
  btnDeleteText: { color: '#dc2626', fontSize: 12 },
  empty: { color: '#71717a', paddingVertical: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 12 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
});
