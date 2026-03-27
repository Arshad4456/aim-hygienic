import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import useCompanyScope from '../hooks/useCompanyScope';

const STATUS = ['', 'active', 'inactive'];

export default function AreasScreen() {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany, loadingCompanies } = useCompanyScope();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [filters, setFilters] = useState({ search: '', regionId: '', zoneId: '', status: '' });
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.regionId) params.set('regionId', filters.regionId);
      if (filters.zoneId) params.set('zoneId', filters.zoneId);
      if (selectedCompany?.companyId) params.set('companyId', selectedCompany.companyId);
      const qp = selectedCompany?.companyId ? `?companyId=${encodeURIComponent(selectedCompany.companyId)}` : '';
      const [a, r, z] = await Promise.all([apiClient.get(`/areas?${params.toString()}`), apiClient.get(`/regions${qp}`), apiClient.get(`/zones${qp}`)]);
      let list = a.data?.areas || [];
      if (filters.status) list = list.filter((x) => String(x.status || 'active').toLowerCase() === filters.status);
      setRows(list); setRegions(r.data?.regions || []); setZones(z.data?.zones || []);
    } finally { setLoading(false); }
  }, [filters, selectedCompany?.companyId]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id) => { try { await apiClient.delete(`/areas/${id}`); load(); } catch (e) { Alert.alert('Delete failed', e.message); } };
  const onSave = async () => { try { await apiClient.put(`/areas/${edit._id}`, edit); setEdit(null); load(); } catch (e) { Alert.alert('Update failed', e.message); } };

  if (loading || loadingCompanies) return <Loader />;
  const setFilter = (k, v) => setFilters((s) => ({ ...s, [k]: v, ...(k === 'regionId' ? { zoneId: '' } : {}) }));

  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Territory List</Text>
    <Text style={styles.label}>Company filter</Text><ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip, !companyDocId ? styles.activeBg : null, !canSelectCompany ? styles.disabled : null]} onPress={() => setCompanyDocId('')} disabled={!canSelectCompany}><Text style={!companyDocId ? styles.activeTx : null}>{canSelectCompany ? 'All Companies' : 'Company by role'}</Text></Pressable>{companies.map((c) => <Pressable key={c._id || c.companyId} style={[styles.chip, companyDocId === (c._id || c.companyId) ? styles.activeBg : null, !canSelectCompany ? styles.disabled : null]} onPress={() => setCompanyDocId(c._id || c.companyId)} disabled={!canSelectCompany}><Text style={companyDocId === (c._id || c.companyId) ? styles.activeTx : null}>{c.name}</Text></Pressable>)}</ScrollView>
<TextInput style={styles.input} value={filters.search} onChangeText={(v) => setFilter('search', v)} placeholder="Search territory" />
    <Text style={styles.label}>Region filter</Text><ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip, !filters.regionId ? styles.activeBg : null]} onPress={() => setFilter('regionId', '')}><Text style={!filters.regionId ? styles.activeTx : null}>All Regions</Text></Pressable>{regions.map((r) => <Pressable key={r._id} style={[styles.chip, filters.regionId === r.regionId ? styles.activeBg : null]} onPress={() => setFilter('regionId', r.regionId)}><Text style={filters.regionId === r.regionId ? styles.activeTx : null}>{r.name}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>Zone filter</Text><ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip, !filters.zoneId ? styles.activeBg : null]} onPress={() => setFilter('zoneId', '')}><Text style={!filters.zoneId ? styles.activeTx : null}>All Zones</Text></Pressable>{zones.filter((z) => !filters.regionId || z.regionId === filters.regionId).map((z) => <Pressable key={z._id} style={[styles.chip, filters.zoneId === z.zoneId ? styles.activeBg : null]} onPress={() => setFilter('zoneId', z.zoneId)}><Text style={filters.zoneId === z.zoneId ? styles.activeTx : null}>{z.name}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>Status filter</Text><View style={styles.wrap}>{STATUS.map((s) => <Pressable key={s || 'all'} style={[styles.chip, filters.status === s ? styles.activeBg : null]} onPress={() => setFilter('status', s)}><Text style={filters.status === s ? styles.activeTx : null}>{s || 'All status'}</Text></Pressable>)}</View>
  </Card>
  <Card><ScrollView horizontal><View style={{ minWidth: 1060 }}><View style={styles.headRow}><Text style={styles.head}>ID</Text><Text style={styles.head}>Name</Text><Text style={styles.head}>Warehouse</Text><Text style={styles.head}>Region</Text><Text style={styles.head}>Zone</Text><Text style={styles.head}>Status</Text><Text style={styles.head}>Action</Text></View>{rows.map((r) => <View style={styles.dataRow} key={r._id}><Text style={styles.cell}>{r.areaId}</Text><Text style={styles.cell}>{r.name}</Text><Text style={styles.cell}>{r.warehouseName || '-'}</Text><Text style={styles.cell}>{r.regionName || '-'}</Text><Text style={styles.cell}>{r.zoneName || '-'}</Text><Text style={styles.cell}>{r.status || 'active'}</Text><View style={[styles.cell, { flexDirection: 'row', gap: 6 }]}><Pressable style={styles.btn} onPress={() => setEdit({ ...r })}><Text>Edit</Text></Pressable><Pressable style={styles.btn} onPress={() => onDelete(r._id)}><Text style={{ color: '#dc2626' }}>Delete</Text></Pressable></View></View>)}</View></ScrollView></Card>
  <Modal visible={Boolean(edit)} transparent animationType="slide" onRequestClose={() => setEdit(null)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.title}>Edit Territory</Text><TextInput style={styles.input} value={edit?.areaId || ''} onChangeText={(v) => setEdit((s) => ({ ...s, areaId: v }))} /><TextInput style={styles.input} value={edit?.name || ''} onChangeText={(v) => setEdit((s) => ({ ...s, name: v }))} /><TextInput style={styles.input} value={edit?.warehouseName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, warehouseName: v }))} /><TextInput style={styles.input} value={edit?.regionName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, regionName: v }))} /><TextInput style={styles.input} value={edit?.zoneName || ''} onChangeText={(v) => setEdit((s) => ({ ...s, zoneName: v }))} /><Text style={styles.label}>Status</Text><View style={styles.wrap}>{['active','inactive'].map((s)=><Pressable key={s} style={[styles.chip, edit?.status===s?styles.activeBg:null]} onPress={()=>setEdit((st)=>({...st,status:s}))}><Text style={edit?.status===s?styles.activeTx:null}>{s}</Text></Pressable>)}</View><View style={{ flexDirection: 'row', gap: 8 }}><Pressable style={styles.btn} onPress={onSave}><Text>Update</Text></Pressable><Pressable style={styles.btn} onPress={() => setEdit(null)}><Text>Cancel</Text></Pressable></View></View></View></Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 12, gap: 12 }, disabled: { opacity: 0.7 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, label: { marginBottom: 6, marginTop: 4, fontWeight: '600' }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginBottom: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, activeBg: { backgroundColor: '#059669', borderColor: '#059669' }, activeTx: { color: '#fff' }, headRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e4e4e7', paddingBottom: 6 }, head: { width: 145, fontWeight: '700' }, dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5', paddingVertical: 8 }, cell: { width: 145 }, btn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 12 }, modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 } });