import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import apiClient from '../../../../../api/client';
import Button from '../../../../../ui/Button';
import Card from '../../../../../ui/Card';
import Loader from '../../../../../ui/Loader';

const TYPES = ['Motorbike', 'Car', 'Pickup', 'Truck', 'Van'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Octane', 'CNG', 'Electric'];

export default function AddScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({
    vehicleId: '', type: 'Motorbike', make: '', model: '', year: '', nickname: '', registrationNo: '', engineNo: '', chassisNo: '',
    regionId: '', zoneId: '', areaId: '', fieldId: '', fuelType: 'Petrol', currentOdometer: '0', status: 'Active',
  });

  useEffect(() => { (async () => {
    try {
      const [r, z, a, f] = await Promise.all([apiClient.get('/regions'), apiClient.get('/zones'), apiClient.get('/areas'), apiClient.get('/fields')]);
      setRegions(r.data?.regions || []); setZones(z.data?.zones || []); setAreas(a.data?.areas || []); setFields(f.data?.fields || []);
    } finally { setLoading(false); }
  })(); }, []);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const region = useMemo(() => regions.find((x) => x.regionId === form.regionId), [regions, form.regionId]);
  const zone = useMemo(() => zones.find((x) => x.zoneId === form.zoneId), [zones, form.zoneId]);
  const area = useMemo(() => areas.find((x) => x.areaId === form.areaId), [areas, form.areaId]);
  const field = useMemo(() => fields.find((x) => x.fieldId === form.fieldId), [fields, form.fieldId]);

  const onSave = async () => {
    if (!form.make || !form.model || !form.year || !form.registrationNo || !form.engineNo || !form.chassisNo || !form.regionId || !form.zoneId || !form.areaId) {
      Alert.alert('Missing data', 'Please fill all required vehicle identity and location fields.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/vehicles', {
        ...form,
        year: Number(form.year || 0),
        currentOdometer: Number(form.currentOdometer || 0),
        regionName: region?.name || '', zoneName: zone?.name || '', areaName: area?.name || '', fieldName: field?.name || '',
      });
      Alert.alert('Success', 'Vehicle added successfully.');
      setForm({ vehicleId: '', type: 'Motorbike', make: '', model: '', year: '', nickname: '', registrationNo: '', engineNo: '', chassisNo: '', regionId: '', zoneId: '', areaId: '', fieldId: '', fuelType: 'Petrol', currentOdometer: '0', status: 'Active' });
    } catch (e) { Alert.alert('Save failed', e.message || 'Failed to add vehicle'); }
    finally { setSaving(false); }
  };

  if (loading) return <Loader />;
  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Add Vehicle</Text>
    {['vehicleId','make','model','year','nickname','registrationNo','engineNo','chassisNo','currentOdometer'].map((k) => <TextInput key={k} style={styles.input} placeholder={k} value={form[k]} onChangeText={(v) => setField(k, v)} keyboardType={k === 'year' || k === 'currentOdometer' ? 'numeric' : 'default'} />)}
    <Text style={styles.label}>Type</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{TYPES.map((v) => <Text key={v} style={[styles.chip, form.type === v ? styles.active : null]} onPress={() => setField('type', v)}>{v}</Text>)}</ScrollView>
    <Text style={styles.label}>Fuel Type</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{FUEL_TYPES.map((v) => <Text key={v} style={[styles.chip, form.fuelType === v ? styles.active : null]} onPress={() => setField('fuelType', v)}>{v}</Text>)}</ScrollView>
    <Text style={styles.label}>Region</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{regions.map((r) => <Text key={r._id} style={[styles.chip, form.regionId === r.regionId ? styles.active : null]} onPress={() => setField('regionId', r.regionId)}>{r.name}</Text>)}</ScrollView>
    <Text style={styles.label}>Zone</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{zones.filter((z) => !form.regionId || z.regionId === form.regionId).map((z) => <Text key={z._id} style={[styles.chip, form.zoneId === z.zoneId ? styles.active : null]} onPress={() => setField('zoneId', z.zoneId)}>{z.name}</Text>)}</ScrollView>
    <Text style={styles.label}>Territory</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{areas.filter((a) => !form.zoneId || a.zoneId === form.zoneId).map((a) => <Text key={a._id} style={[styles.chip, form.areaId === a.areaId ? styles.active : null]} onPress={() => setField('areaId', a.areaId)}>{a.name}</Text>)}</ScrollView>
    <Text style={styles.label}>Field (optional)</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{fields.filter((f) => !form.areaId || f.territoryId === form.areaId).map((f) => <Text key={f._id} style={[styles.chip, form.fieldId === f.fieldId ? styles.active : null]} onPress={() => setField('fieldId', f.fieldId)}>{f.name}</Text>)}</ScrollView>
    <Button title="Save Vehicle" onPress={onSave} loading={saving} style={{ marginTop: 14 }} />
  </Card></ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 12 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, label: { marginTop: 8, marginBottom: 6, fontWeight: '600' }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginBottom: 8 }, wrap: { gap: 8 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, active: { backgroundColor: '#059669', color: '#fff', borderColor: '#059669' } });
