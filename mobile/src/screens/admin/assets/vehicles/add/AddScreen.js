import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../api/client';
import Button from '../../../../../ui/Button';
import Card from '../../../../../ui/Card';
import Loader from '../../../../../ui/Loader';

const TYPES = ['Motorbike', 'Scooter', 'Bicycle', 'Car', 'Microbus', 'Van', 'Pickup', 'Truck', 'Covered Van', 'Lorry', 'Mini Truck', 'Bus', 'Auto Rickshaw', 'CNG', 'Tractor', 'Ambulance', 'Other'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Octane', 'CNG', 'Electric'];
const OWNERSHIP = ['company', 'rental', 'leased'];
const STATUS = ['Active', 'Under Maintenance', 'Inactive'];

export default function AddScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({
    vehicleId: '', type: 'Motorbike', make: '', model: '', year: '', nickname: '', registrationNo: '', engineNo: '', chassisNo: '',
    color: '', ownershipType: 'company', assignedUserId: '', regionId: '', zoneId: '', areaId: '', fieldId: '', fuelType: 'Petrol',
    currentOdometer: '0', expectedKmPerLiter: '', status: 'Active', notes: '',
  });

  useEffect(() => { (async () => {
    try {
      const [u, r, z, a, f] = await Promise.all([apiClient.get('/users'), apiClient.get('/regions'), apiClient.get('/zones'), apiClient.get('/areas'), apiClient.get('/fields')]);
      setUsers((u.data?.users || []).filter((x) => String(x.role || '').toLowerCase() !== 'customer'));
      setRegions(r.data?.regions || []); setZones(z.data?.zones || []); setAreas(a.data?.areas || []); setFields(f.data?.fields || []);
    } finally { setLoading(false); }
  })(); }, []);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v, ...(k === 'regionId' ? { zoneId: '', areaId: '', fieldId: '' } : {}), ...(k === 'zoneId' ? { areaId: '', fieldId: '' } : {}), ...(k === 'areaId' ? { fieldId: '' } : {}) }));
  const region = useMemo(() => regions.find((x) => x.regionId === form.regionId), [regions, form.regionId]);
  const zone = useMemo(() => zones.find((x) => x.zoneId === form.zoneId), [zones, form.zoneId]);
  const area = useMemo(() => areas.find((x) => x.areaId === form.areaId), [areas, form.areaId]);
  const field = useMemo(() => fields.find((x) => x.fieldId === form.fieldId), [fields, form.fieldId]);
  const assignedUser = useMemo(() => users.find((u) => u._id === form.assignedUserId), [users, form.assignedUserId]);

  const onSave = async () => {
    if (!form.make || !form.model || !form.year || !form.registrationNo || !form.engineNo || !form.chassisNo || !form.regionId || !form.zoneId || !form.areaId) return Alert.alert('Missing data', 'Please fill required identity and location fields.');
    setSaving(true);
    try {
      await apiClient.post('/vehicles', {
        ...form,
        year: Number(form.year || 0),
        currentOdometer: Number(form.currentOdometer || 0),
        expectedKmPerLiter: Number(form.expectedKmPerLiter || 0),
        regionName: region?.name || '', zoneName: zone?.name || '', areaName: area?.name || '', fieldName: field?.name || '',
        assignedUserName: assignedUser ? (assignedUser.fullName || assignedUser.name || assignedUser.username || '') : '',
      });
      Alert.alert('Success', 'Vehicle added successfully.');
    } catch (e) { Alert.alert('Save failed', e.message || 'Failed to add vehicle'); }
    finally { setSaving(false); }
  };

  if (loading) return <Loader />;
  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Add Vehicle</Text>
    {['vehicleId','make','model','year','nickname','registrationNo','engineNo','chassisNo','color','currentOdometer','expectedKmPerLiter'].map((k) => <TextInput key={k} style={styles.input} placeholder={k} value={form[k]} onChangeText={(v) => setField(k, v)} keyboardType={['year','currentOdometer','expectedKmPerLiter'].includes(k) ? 'numeric' : 'default'} />)}
    <Text style={styles.label}>Notes</Text><TextInput style={[styles.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 }]} multiline value={form.notes} onChangeText={(v) => setField('notes', v)} placeholder="notes" />
    <Text style={styles.label}>Type</Text><View style={styles.wrap}>{TYPES.map((v) => <Pressable key={v} style={[styles.chip, form.type === v ? styles.active : null]} onPress={() => setField('type', v)}><Text style={form.type === v ? styles.activeTx : null}>{v}</Text></Pressable>)}</View>
    <Text style={styles.label}>Fuel Type</Text><View style={styles.wrap}>{FUEL_TYPES.map((v) => <Pressable key={v} style={[styles.chip, form.fuelType === v ? styles.active : null]} onPress={() => setField('fuelType', v)}><Text style={form.fuelType === v ? styles.activeTx : null}>{v}</Text></Pressable>)}</View>
    <Text style={styles.label}>Ownership</Text><View style={styles.wrap}>{OWNERSHIP.map((v) => <Pressable key={v} style={[styles.chip, form.ownershipType === v ? styles.active : null]} onPress={() => setField('ownershipType', v)}><Text style={form.ownershipType === v ? styles.activeTx : null}>{v}</Text></Pressable>)}</View>
    <Text style={styles.label}>Status</Text><View style={styles.wrap}>{STATUS.map((v) => <Pressable key={v} style={[styles.chip, form.status === v ? styles.active : null]} onPress={() => setField('status', v)}><Text style={form.status === v ? styles.activeTx : null}>{v}</Text></Pressable>)}</View>
    <Text style={styles.label}>Assigned User</Text><ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip, !form.assignedUserId ? styles.active : null]} onPress={() => setField('assignedUserId', '')}><Text style={!form.assignedUserId ? styles.activeTx : null}>Unassigned</Text></Pressable>{users.map((u) => <Pressable key={u._id} style={[styles.chip, form.assignedUserId === u._id ? styles.active : null]} onPress={() => setField('assignedUserId', u._id)}><Text style={form.assignedUserId === u._id ? styles.activeTx : null}>{u.fullName || u.name || u.username}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>Region</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{regions.map((r) => <Pressable key={r._id} style={[styles.chip, form.regionId === r.regionId ? styles.active : null]} onPress={() => setField('regionId', r.regionId)}><Text style={form.regionId === r.regionId ? styles.activeTx : null}>{r.name}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>Zone</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{zones.filter((z) => !form.regionId || z.regionId === form.regionId).map((z) => <Pressable key={z._id} style={[styles.chip, form.zoneId === z.zoneId ? styles.active : null]} onPress={() => setField('zoneId', z.zoneId)}><Text style={form.zoneId === z.zoneId ? styles.activeTx : null}>{z.name}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>Territory</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{areas.filter((a) => !form.zoneId || a.zoneId === form.zoneId).map((a) => <Pressable key={a._id} style={[styles.chip, form.areaId === a.areaId ? styles.active : null]} onPress={() => setField('areaId', a.areaId)}><Text style={form.areaId === a.areaId ? styles.activeTx : null}>{a.name}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>Field</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{fields.filter((f) => !form.areaId || f.territoryId === form.areaId).map((f) => <Pressable key={f._id} style={[styles.chip, form.fieldId === f.fieldId ? styles.active : null]} onPress={() => setField('fieldId', f.fieldId)}><Text style={form.fieldId === f.fieldId ? styles.activeTx : null}>{f.name}</Text></Pressable>)}</ScrollView>
    <Button title="Save Vehicle" onPress={onSave} loading={saving} style={{ marginTop: 14 }} />
  </Card></ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 12 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, label: { marginTop: 8, marginBottom: 6, fontWeight: '600' }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginBottom: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, active: { backgroundColor: '#059669', borderColor: '#059669' }, activeTx: { color: '#fff' } });