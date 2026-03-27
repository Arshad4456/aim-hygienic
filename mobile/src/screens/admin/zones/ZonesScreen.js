import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import useCompanyScope from '../hooks/useCompanyScope';

const STATUS = ['', 'active', 'inactive'];

export default function ZonesScreen() {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany, loadingCompanies } = useCompanyScope();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [filters, setFilters] = useState({ search: '', warehouseId: '', regionId: '', status: '' });
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.warehouseId) params.set('warehouseId', filters.warehouseId);
      if (filters.regionId) params.set('regionId', filters.regionId);
      if (selectedCompany?.companyId) params.set('companyId', selectedCompany.companyId);
      const qp = selectedCompany?.companyId ? `?companyId=${encodeURIComponent(selectedCompany.companyId)}` : '';
      const [z, w, r] = await Promise.all([
        apiClient.get(`/zones?${params.toString()}`),
        apiClient.get(`/warehouses${qp}`),
        apiClient.get(`/regions${qp}`),
      ]);
      let list = z.data?.zones || [];
      if (filters.status) list = list.filter((x) => String(x.status || 'active').toLowerCase() === filters.status);
      setRows(list);
      setWarehouses(w.data?.warehouses || []);
      setRegions(r.data?.regions || []);
    } finally { setLoading(false); }
  }, [filters, selectedCompany?.companyId]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id) => { try { await apiClient.delete(`/zones/${id}`); load(); } catch (e) { Alert.alert('Delete failed', e.message); } };
  const onSave = async () => { try { await apiClient.put(`/zones/${edit._id}`, edit); setEdit(null); load(); } catch (e) { Alert.alert('Update failed', e.message); } };

  if (loading || loadingCompanies) return <Loader />;
  const setFilter = (k, v) => setFilters((s) => ({ ...s, [k]: v }));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Zone List</Text>
        <TextInput style={styles.input} value={filters.search} onChangeText={(v) => setFilter('search', v)} placeholder="Search zone" />

        <Text style={styles.label}>Company filter</Text>
        <ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip, !companyDocId ? styles.activeBg : null, !canSelectCompany ? styles.disabled : null]} onPress={() => setCompanyDocId('')} disabled={!canSelectCompany}><Text style={!companyDocId ? styles.activeTx : null}>{canSelectCompany ? 'All Companies' : 'Company by role'}</Text></Pressable>{companies.map((c) => <Pressable key={c._id || c.companyId} style={[styles.chip, companyDocId === (c._id || c.companyId) ? styles.activeBg : null, !canSelectCompany ? styles.disabled : null]} onPress={() => setCompanyDocId(c._id || c.companyId)} disabled={!canSelectCompany}><Text style={companyDocId === (c._id || c.companyId) ? styles.activeTx : null}>{c.name}</Text></Pressable>)}</ScrollView>
        <Text style={styles.label}>Warehouse filter</Text>
        <ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip, !filters.warehouseId ? styles.activeBg : null]} onPress={() => setFilter('warehouseId', '')}><Text style={!filters.warehouseId ? styles.activeTx : null}>All Warehouses</Text></Pressable>{warehouses.map((w) => <Pressable key={w._id} style={[styles.chip, filters.warehouseId === w.warehouseId ? styles.activeBg : null]} onPress={() => setFilter('warehouseId', w.warehouseId)}><Text style={filters.warehouseId === w.warehouseId ? styles.activeTx : null}>{w.name}</Text></Pressable>)}</ScrollView>
        <Text style={styles.label}>Region filter</Text>
        <ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip, !filters.regionId ? styles.activeBg : null]} onPress={() => setFilter('regionId', '')}><Text style={!filters.regionId ? styles.activeTx : null}>All Regions</Text></Pressable>{regions.filter((r) => !filters.warehouseId || r.warehouseId === filters.warehouseId).map((r) => <Pressable key={r._id} style={[styles.chip, filters.regionId === r.regionId ? styles.activeBg : null]} onPress={() => setFilter('regionId', r.regionId)}><Text style={filters.regionId === r.regionId ? styles.activeTx : null}>{r.name}</Text></Pressable>)}</ScrollView>
        <Text style={styles.label}>Status filter</Text>
        <View style={styles.wrap}>{STATUS.map((st) => <Pressable key={st || 'all'} style={[styles.chip, filters.status === st ? styles.activeBg : null]} onPress={() => setFilter('status', st)}><Text style={filters.status === st ? styles.activeTx : null}>{st || 'All status'}</Text></Pressable>)}</View>
      </Card>
      <Card><ScrollView horizontal><View style={{ minWidth: 900 }}><View style={styles.headRow}><Text style={styles.head}>ID</Text><Text style={styles.head}>Name</Text><Text style={styles.head}>Warehouse</Text><Text style={styles.head}>Region</Text><Text style={styles.head}>Status</Text><Text style={styles.head}>Action</Text></View>{rows.map((r) => <View key={r._id} style={styles.dataRow}><Text style={styles.cell}>{r.zoneId}</Text><Text style={styles.cell}>{r.name}</Text><Text style={styles.cell}>{r.warehouseName || '-'}</Text><Text style={styles.cell}>{r.regionName || '-'}</Text><Text style={styles.cell}>{r.status || 'active'}</Text><View style={[styles.cell, { flexDirection: 'row', gap: 6 }]}><Pressable style={styles.btn} onPress={() => setEdit({ ...r })}><Text>Edit</Text></Pressable><Pressable style={styles.btn} onPress={() => onDelete(r._id)}><Text style={{ color: '#dc2626' }}>Delete</Text></Pressable></View></View>)}</View></ScrollView></Card>
      <Modal visible={Boolean(edit)} transparent animationType="slide" onRequestClose={() => setEdit(null)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.title}>Edit Zone</Text><TextInput style={styles.input} value={edit?.zoneId || ''} onChangeText={(v) => setEdit((s) => ({ ...s, zoneId: v }))} /><TextInput style={styles.input} value={edit?.name || ''} onChangeText={(v) => setEdit((s) => ({ ...s, name: v }))} /><TextInput style={styles.input} value={edit?.warehouseName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, warehouseName: v }))} /><TextInput style={styles.input} value={edit?.regionName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, regionName: v }))} /><Text style={styles.label}>Status</Text><View style={styles.wrap}>{['active','inactive'].map((st)=><Pressable key={st} style={[styles.chip, edit?.status===st?styles.activeBg:null]} onPress={()=>setEdit((s)=>({...s,status:st}))}><Text style={edit?.status===st?styles.activeTx:null}>{st}</Text></Pressable>)}</View><View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><Pressable style={styles.btn} onPress={onSave}><Text>Update</Text></Pressable><Pressable style={styles.btn} onPress={() => setEdit(null)}><Text>Cancel</Text></Pressable></View></View></View></Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 12, gap: 12 }, disabled: { opacity: 0.7 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, label: { marginBottom: 6, marginTop: 4, fontWeight: '600' }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginBottom: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, activeBg: { backgroundColor: '#059669', borderColor: '#059669' }, activeTx: { color: '#fff' }, headRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e4e4e7', paddingBottom: 6 }, head: { width: 145, fontWeight: '700' }, dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5', paddingVertical: 8 }, cell: { width: 145 }, btn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 12 }, modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 } });