import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

export default function ZonesScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [regions, setRegions] = useState([]);
  const [search, setSearch] = useState('');
  const [regionId, setRegionId] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [z, r] = await Promise.all([
        apiClient.get(`/zones?search=${encodeURIComponent(search)}${regionId ? `&regionId=${encodeURIComponent(regionId)}` : ''}`),
        apiClient.get('/regions'),
      ]);
      setRows(z.data?.zones || []);
      setRegions(r.data?.regions || []);
    } finally { setLoading(false); }
  }, [search, regionId]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id) => { try { await apiClient.delete(`/zones/${id}`); load(); } catch (e) { Alert.alert('Delete failed', e.message); } };
  const onSave = async () => { try { await apiClient.put(`/zones/${edit._id}`, edit); setEdit(null); load(); } catch (e) { Alert.alert('Update failed', e.message); } };

  if (loading) return <Loader />;
  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Zone List</Text><TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search zone" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}><Pressable style={[styles.chip, !regionId ? styles.activeBg : null]} onPress={() => setRegionId('')}><Text style={!regionId ? styles.activeTx : null}>All Regions</Text></Pressable>{regions.map((r) => <Pressable key={r._id} style={[styles.chip, regionId === r.regionId ? styles.activeBg : null]} onPress={() => setRegionId(r.regionId)}><Text style={regionId === r.regionId ? styles.activeTx : null}>{r.name}</Text></Pressable>)}</ScrollView>
  </Card><Card><ScrollView horizontal><View style={{ minWidth: 760 }}><View style={styles.headRow}><Text style={styles.head}>ID</Text><Text style={styles.head}>Name</Text><Text style={styles.head}>Warehouse</Text><Text style={styles.head}>Region</Text><Text style={styles.head}>Action</Text></View>{rows.map((r) => <View key={r._id} style={styles.dataRow}><Text style={styles.cell}>{r.zoneId}</Text><Text style={styles.cell}>{r.name}</Text><Text style={styles.cell}>{r.warehouseName || '-'}</Text><Text style={styles.cell}>{r.regionName || '-'}</Text><View style={[styles.cell, { flexDirection: 'row', gap: 6 }]}><Pressable style={styles.btn} onPress={() => setEdit({ ...r })}><Text>Edit</Text></Pressable><Pressable style={styles.btn} onPress={() => onDelete(r._id)}><Text style={{ color: '#dc2626' }}>Delete</Text></Pressable></View></View>)}</View></ScrollView></Card>
  <Modal visible={Boolean(edit)} transparent animationType="slide" onRequestClose={() => setEdit(null)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.title}>Edit Zone</Text><TextInput style={styles.input} value={edit?.zoneId || ''} onChangeText={(v) => setEdit((s) => ({ ...s, zoneId: v }))} /><TextInput style={styles.input} value={edit?.name || ''} onChangeText={(v) => setEdit((s) => ({ ...s, name: v }))} /><TextInput style={styles.input} value={edit?.warehouseName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, warehouseName: v }))} /><TextInput style={styles.input} value={edit?.regionName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, regionName: v }))} /><View style={{ flexDirection: 'row', gap: 8 }}><Pressable style={styles.btn} onPress={onSave}><Text>Update</Text></Pressable><Pressable style={styles.btn} onPress={() => setEdit(null)}><Text>Cancel</Text></Pressable></View></View></View></Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 12, gap: 12 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginBottom: 8 }, wrap: { gap: 8 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, activeBg: { backgroundColor: '#059669', borderColor: '#059669' }, activeTx: { color: '#fff' }, headRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e4e4e7', paddingBottom: 6 }, head: { width: 150, fontWeight: '700' }, dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5', paddingVertical: 8 }, cell: { width: 150 }, btn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 12 }, modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 } });
