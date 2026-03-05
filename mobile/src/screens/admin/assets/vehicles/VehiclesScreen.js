import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const STATUS_OPTIONS = ['', 'Active', 'Under Maintenance', 'Inactive'];

export default function VehiclesScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [filters, setFilters] = useState({ search: '', type: '', fuelType: '', status: '', assignedUserId: '', regionId: '', zoneId: '', areaId: '' });
  const [viewRow, setViewRow] = useState(null);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (String(v || '').trim()) params.set(k, String(v).trim()); });
      const [vRes, uRes, rRes, zRes, aRes] = await Promise.all([
        apiClient.get(`/vehicles?${params.toString()}`), apiClient.get('/users'), apiClient.get('/regions'), apiClient.get('/zones'), apiClient.get('/areas'),
      ]);
      setRows(vRes.data?.vehicles || []);
      setUsers((uRes.data?.users || []).filter((x) => String(x.role || '').toLowerCase() !== 'customer'));
      setRegions(rRes.data?.regions || []);
      setZones(zRes.data?.zones || []);
      setAreas(aRes.data?.areas || []);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const userMap = useMemo(() => new Map(users.map((u) => [u._id, u])), [users]);
  const setFilter = (k, v) => setFilters((s) => ({ ...s, [k]: v, ...(k === 'regionId' ? { zoneId: '', areaId: '' } : {}), ...(k === 'zoneId' ? { areaId: '' } : {}) }));

  const onDelete = async (id) => { try { await apiClient.delete(`/vehicles/${id}`); load(); } catch (e) { Alert.alert('Delete failed', e.message); } };
  const onSave = async () => {
    if (!edit?._id) return;
    try {
      const region = regions.find((r) => r.regionId === edit.regionId);
      const zone = zones.find((z) => z.zoneId === edit.zoneId);
      const area = areas.find((a) => a.areaId === edit.areaId);
      const assigned = users.find((u) => u._id === edit.assignedUserId);
      await apiClient.put(`/vehicles/${edit._id}`, { ...edit, year: Number(edit.year || 0), currentOdometer: Number(edit.currentOdometer || 0), expectedKmPerLiter: Number(edit.expectedKmPerLiter || 0), regionName: region?.name || edit.regionName || '', zoneName: zone?.name || edit.zoneName || '', areaName: area?.name || edit.areaName || '', assignedUserName: assigned ? (assigned.fullName || assigned.name || assigned.username || '') : '' });
      setEdit(null); load();
    } catch (e) { Alert.alert('Update failed', e.message); }
  };

  if (loading) return <Loader />;

  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Vehicle List</Text>
    <TextInput style={styles.input} value={filters.search} onChangeText={(v) => setFilter('search', v)} placeholder="search by reg/make/model/nickname" />
    <View style={styles.wrap}>{['type','fuelType'].map((k)=><TextInput key={k} style={[styles.input,{flex:1,minWidth:140,marginBottom:0}]} placeholder={k} value={filters[k]} onChangeText={(v)=>setFilter(k,v)} />)}</View>
    <Text style={styles.label}>Status / Assigned User filters</Text>
    <ScrollView horizontal contentContainerStyle={styles.wrap}>{STATUS_OPTIONS.map((s)=><Pressable key={s||'all'} style={[styles.chip, filters.status===s?styles.active:null]} onPress={()=>setFilter('status',s)}><Text style={filters.status===s?styles.activeTx:null}>{s||'All status'}</Text></Pressable>)}</ScrollView>
    <ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip,!filters.assignedUserId?styles.active:null]} onPress={()=>setFilter('assignedUserId','')}><Text style={!filters.assignedUserId?styles.activeTx:null}>All assigned users</Text></Pressable>{users.map((u)=><Pressable key={u._id} style={[styles.chip,filters.assignedUserId===u._id?styles.active:null]} onPress={()=>setFilter('assignedUserId',u._id)}><Text style={filters.assignedUserId===u._id?styles.activeTx:null}>{u.fullName||u.name||u.username}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>Region / Zone / Territory filters</Text>
    <ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip,!filters.regionId?styles.active:null]} onPress={()=>setFilter('regionId','')}><Text style={!filters.regionId?styles.activeTx:null}>All regions</Text></Pressable>{regions.map((r)=><Pressable key={r._id} style={[styles.chip,filters.regionId===r.regionId?styles.active:null]} onPress={()=>setFilter('regionId',r.regionId)}><Text style={filters.regionId===r.regionId?styles.activeTx:null}>{r.name}</Text></Pressable>)}</ScrollView>
    <ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip,!filters.zoneId?styles.active:null]} onPress={()=>setFilter('zoneId','')}><Text style={!filters.zoneId?styles.activeTx:null}>All zones</Text></Pressable>{zones.filter((z)=>!filters.regionId||z.regionId===filters.regionId).map((z)=><Pressable key={z._id} style={[styles.chip,filters.zoneId===z.zoneId?styles.active:null]} onPress={()=>setFilter('zoneId',z.zoneId)}><Text style={filters.zoneId===z.zoneId?styles.activeTx:null}>{z.name}</Text></Pressable>)}</ScrollView>
    <ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip,!filters.areaId?styles.active:null]} onPress={()=>setFilter('areaId','')}><Text style={!filters.areaId?styles.activeTx:null}>All territories</Text></Pressable>{areas.filter((a)=>!filters.zoneId||a.zoneId===filters.zoneId).map((a)=><Pressable key={a._id} style={[styles.chip,filters.areaId===a.areaId?styles.active:null]} onPress={()=>setFilter('areaId',a.areaId)}><Text style={filters.areaId===a.areaId?styles.activeTx:null}>{a.name}</Text></Pressable>)}</ScrollView>
  </Card>
  <Card><ScrollView horizontal><View style={{ minWidth: 1320 }}><View style={styles.headRow}><Text style={styles.head}>Vehicle</Text><Text style={styles.head}>Registration</Text><Text style={styles.head}>Assigned</Text><Text style={styles.head}>Region/Zone/Territory</Text><Text style={styles.head}>Fuel</Text><Text style={styles.head}>Odometer</Text><Text style={styles.head}>Status</Text><Text style={styles.head}>Actions</Text></View>{rows.map((v)=><View key={v._id} style={styles.dataRow}><Text style={styles.cell}>{`${v.make||''} ${v.model||''}`.trim() || '-'}</Text><Text style={styles.cell}>{v.registrationNo || '-'}</Text><Text style={styles.cell}>{v.assignedUserName || userMap.get(v.assignedUserId)?.name || 'Unassigned'}</Text><Text style={styles.cell}>{`${v.regionName||'-'} / ${v.zoneName||'-'} / ${v.areaName||'-'}`}</Text><Text style={styles.cell}>{v.fuelType || '-'}</Text><Text style={styles.cell}>{Number(v.currentOdometer || 0)}</Text><Text style={styles.cell}>{v.status || '-'}</Text><View style={[styles.cell,{flexDirection:'row',gap:6}]}><Pressable style={styles.btn} onPress={()=>setViewRow(v)}><Text>View</Text></Pressable><Pressable style={styles.btn} onPress={()=>setEdit({...v})}><Text>Edit</Text></Pressable><Pressable style={styles.btn} onPress={()=>onDelete(v._id)}><Text style={{color:'#dc2626'}}>Delete</Text></Pressable></View></View>)}</View></ScrollView></Card>
  <Modal visible={Boolean(viewRow)} transparent animationType="slide" onRequestClose={()=>setViewRow(null)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.title}>Vehicle Detail</Text>{viewRow ? <ScrollView style={{maxHeight:420}}>{[['Type',viewRow.type],['Make',viewRow.make],['Model',viewRow.model],['Year',viewRow.year],['Registration',viewRow.registrationNo],['Engine No',viewRow.engineNo],['Chassis No',viewRow.chassisNo],['Color',viewRow.color],['Ownership',viewRow.ownershipType],['Assigned User',viewRow.assignedUserName || 'Unassigned'],['Fuel Type',viewRow.fuelType],['Current Odometer',viewRow.currentOdometer],['Expected KM/L',viewRow.expectedKmPerLiter],['Status',viewRow.status],['Region',viewRow.regionName],['Zone',viewRow.zoneName],['Territory',viewRow.areaName],['Notes',viewRow.notes]].map(([k,v]) => <Text key={k} style={styles.detailLine}>{k}: {String(v || '-')}</Text>)}</ScrollView> : null}<Pressable style={styles.btn} onPress={()=>setViewRow(null)}><Text>Close</Text></Pressable></View></View></Modal>
  <Modal visible={Boolean(edit)} transparent animationType="slide" onRequestClose={()=>setEdit(null)}><View style={styles.overlay}><View style={styles.modal}><ScrollView style={{maxHeight:460}}><Text style={styles.title}>Edit Vehicle</Text>{['type','make','model','year','registrationNo','engineNo','chassisNo','fuelType','currentOdometer','expectedKmPerLiter','status','color','ownershipType','notes'].map((k)=><TextInput key={k} style={styles.input} value={String(edit?.[k] ?? '')} onChangeText={(v)=>setEdit((s)=>({...s,[k]:v}))} placeholder={k} />)}<Text style={styles.label}>Assigned User</Text><ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip,!edit?.assignedUserId?styles.active:null]} onPress={()=>setEdit((s)=>({...s,assignedUserId:''}))}><Text style={!edit?.assignedUserId?styles.activeTx:null}>Unassigned</Text></Pressable>{users.map((u)=><Pressable key={u._id} style={[styles.chip,edit?.assignedUserId===u._id?styles.active:null]} onPress={()=>setEdit((s)=>({...s,assignedUserId:u._id}))}><Text style={edit?.assignedUserId===u._id?styles.activeTx:null}>{u.fullName||u.name||u.username}</Text></Pressable>)}</ScrollView><Text style={styles.label}>Region/Zone/Territory</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{regions.map((r)=><Pressable key={r._id} style={[styles.chip,edit?.regionId===r.regionId?styles.active:null]} onPress={()=>setEdit((s)=>({...s,regionId:r.regionId,zoneId:'',areaId:''}))}><Text style={edit?.regionId===r.regionId?styles.activeTx:null}>{r.name}</Text></Pressable>)}</ScrollView><ScrollView horizontal contentContainerStyle={styles.wrap}>{zones.filter((z)=>!edit?.regionId||z.regionId===edit.regionId).map((z)=><Pressable key={z._id} style={[styles.chip,edit?.zoneId===z.zoneId?styles.active:null]} onPress={()=>setEdit((s)=>({...s,zoneId:z.zoneId,areaId:''}))}><Text style={edit?.zoneId===z.zoneId?styles.activeTx:null}>{z.name}</Text></Pressable>)}</ScrollView><ScrollView horizontal contentContainerStyle={styles.wrap}>{areas.filter((a)=>!edit?.zoneId||a.zoneId===edit.zoneId).map((a)=><Pressable key={a._id} style={[styles.chip,edit?.areaId===a.areaId?styles.active:null]} onPress={()=>setEdit((s)=>({...s,areaId:a.areaId}))}><Text style={edit?.areaId===a.areaId?styles.activeTx:null}>{a.name}</Text></Pressable>)}</ScrollView></ScrollView><View style={{flexDirection:'row',gap:8,marginTop:8}}><Pressable style={styles.btn} onPress={onSave}><Text>Save Changes</Text></Pressable><Pressable style={styles.btn} onPress={()=>setEdit(null)}><Text>Cancel</Text></Pressable></View></View></View></Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 12, gap: 12 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, label: { marginBottom: 6, marginTop: 4, fontWeight: '600' }, detailLine: { color: '#374151', marginBottom: 6 }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginBottom: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, active: { backgroundColor: '#059669', borderColor: '#059669' }, activeTx: { color: '#fff' }, headRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e4e4e7', paddingBottom: 6 }, head: { width: 165, fontWeight: '700' }, dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5', paddingVertical: 8 }, cell: { width: 165 }, btn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 12 }, modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 } });
