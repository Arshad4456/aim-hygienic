import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function VehiclesScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/vehicles?search=${encodeURIComponent(search)}`);
      setRows(data?.vehicles || []);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id) => { try { await apiClient.delete(`/vehicles/${id}`); load(); } catch (e) { Alert.alert('Delete failed', e.message); } };
  const onSave = async () => { try { await apiClient.put(`/vehicles/${edit._id}`, edit); setEdit(null); load(); } catch (e) { Alert.alert('Update failed', e.message); } };

  if (loading) return <Loader />;

  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Vehicle List</Text><TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search by reg no, make, model" /></Card>
    <Card><ScrollView horizontal><View style={{ minWidth: 1160 }}><View style={styles.headRow}><Text style={styles.head}>Reg No</Text><Text style={styles.head}>Type</Text><Text style={styles.head}>Vehicle</Text><Text style={styles.head}>Region</Text><Text style={styles.head}>Zone</Text><Text style={styles.head}>Territory</Text><Text style={styles.head}>Fuel</Text><Text style={styles.head}>Odometer</Text><Text style={styles.head}>Action</Text></View>{rows.map((r) => <View key={r._id} style={styles.dataRow}><Text style={styles.cell}>{r.registrationNo || '-'}</Text><Text style={styles.cell}>{r.type || '-'}</Text><Text style={styles.cell}>{`${r.make || ''} ${r.model || ''}`.trim() || '-'}</Text><Text style={styles.cell}>{r.regionName || '-'}</Text><Text style={styles.cell}>{r.zoneName || '-'}</Text><Text style={styles.cell}>{r.areaName || '-'}</Text><Text style={styles.cell}>{r.fuelType || '-'}</Text><Text style={styles.cell}>{Number(r.currentOdometer || 0)}</Text><View style={[styles.cell, { flexDirection: 'row', gap: 6 }]}><Pressable style={styles.btn} onPress={() => setEdit({ ...r })}><Text>Edit</Text></Pressable><Pressable style={styles.btn} onPress={() => onDelete(r._id)}><Text style={{ color: '#dc2626' }}>Delete</Text></Pressable></View></View>)}</View></ScrollView></Card>
    <Modal visible={Boolean(edit)} transparent animationType="slide" onRequestClose={() => setEdit(null)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.title}>Edit Vehicle</Text>{['make','model','registrationNo','engineNo','chassisNo','type','fuelType','currentOdometer','status'].map((k) => <TextInput key={k} style={styles.input} value={String(edit?.[k] ?? '')} onChangeText={(v) => setEdit((s) => ({ ...s, [k]: v }))} placeholder={k} />)}<View style={{ flexDirection: 'row', gap: 8 }}><Pressable style={styles.btn} onPress={onSave}><Text>Update</Text></Pressable><Pressable style={styles.btn} onPress={() => setEdit(null)}><Text>Cancel</Text></Pressable></View></View></View></Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 12, gap: 12 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginBottom: 8 }, headRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e4e4e7', paddingBottom: 6 }, head: { width: 128, fontWeight: '700' }, dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5', paddingVertical: 8 }, cell: { width: 128 }, btn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 12 }, modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 } });
