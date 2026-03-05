import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

export default function AreasScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);
  const [search, setSearch] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, z] = await Promise.all([apiClient.get(`/areas?search=${encodeURIComponent(search)}${zoneId ? `&zoneId=${encodeURIComponent(zoneId)}` : ''}`), apiClient.get('/zones')]);
      setRows(a.data?.areas || []);
      setZones(z.data?.zones || []);
    } finally { setLoading(false); }
  }, [search, zoneId]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id) => { try { await apiClient.delete(`/areas/${id}`); load(); } catch (e) { Alert.alert('Delete failed', e.message); } };
  const onSave = async () => { try { await apiClient.put(`/areas/${edit._id}`, edit); setEdit(null); load(); } catch (e) { Alert.alert('Update failed', e.message); } };

  if (loading) return <Loader />;

  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Territory List</Text><TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search territory" /><ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip, !zoneId ? styles.activeBg : null]} onPress={() => setZoneId('')}><Text style={!zoneId ? styles.activeTx : null}>All Zones</Text></Pressable>{zones.map((z) => <Pressable key={z._id} style={[styles.chip, zoneId === z.zoneId ? styles.activeBg : null]} onPress={() => setZoneId(z.zoneId)}><Text style={zoneId === z.zoneId ? styles.activeTx : null}>{z.name}</Text></Pressable>)}</ScrollView></Card>
  <Card><ScrollView horizontal><View style={{ minWidth: 900 }}><View style={styles.headRow}><Text style={styles.head}>ID</Text><Text style={styles.head}>Name</Text><Text style={styles.head}>Warehouse</Text><Text style={styles.head}>Region</Text><Text style={styles.head}>Zone</Text><Text style={styles.head}>Action</Text></View>{rows.map((r) => <View style={styles.dataRow} key={r._id}><Text style={styles.cell}>{r.areaId}</Text><Text style={styles.cell}>{r.name}</Text><Text style={styles.cell}>{r.warehouseName || '-'}</Text><Text style={styles.cell}>{r.regionName || '-'}</Text><Text style={styles.cell}>{r.zoneName || '-'}</Text><View style={[styles.cell, { flexDirection: 'row', gap: 6 }]}><Pressable style={styles.btn} onPress={() => setEdit({ ...r })}><Text>Edit</Text></Pressable><Pressable style={styles.btn} onPress={() => onDelete(r._id)}><Text style={{ color: '#dc2626' }}>Delete</Text></Pressable></View></View>)}</View></ScrollView></Card>
  <Modal visible={Boolean(edit)} transparent animationType="slide" onRequestClose={() => setEdit(null)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.title}>Edit Territory</Text><TextInput style={styles.input} value={edit?.areaId || ''} onChangeText={(v) => setEdit((s) => ({ ...s, areaId: v }))} /><TextInput style={styles.input} value={edit?.name || ''} onChangeText={(v) => setEdit((s) => ({ ...s, name: v }))} /><TextInput style={styles.input} value={edit?.warehouseName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, warehouseName: v }))} /><TextInput style={styles.input} value={edit?.regionName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, regionName: v }))} /><TextInput style={styles.input} value={edit?.zoneName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, zoneName: v }))} /><View style={{ flexDirection: 'row', gap: 8 }}><Pressable style={styles.btn} onPress={onSave}><Text>Update</Text></Pressable><Pressable style={styles.btn} onPress={() => setEdit(null)}><Text>Cancel</Text></Pressable></View></View></View></Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 12, gap: 12 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginBottom: 8 }, wrap: { gap: 8 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, activeBg: { backgroundColor: '#059669', borderColor: '#059669' }, activeTx: { color: '#fff' }, headRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e4e4e7', paddingBottom: 6 }, head: { width: 145, fontWeight: '700' }, dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5', paddingVertical: 8 }, cell: { width: 145 }, btn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 12 }, modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 } });