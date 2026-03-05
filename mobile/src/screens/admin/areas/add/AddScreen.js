import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Button from '../../../../ui/Button';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const STATUS = ['active', 'inactive'];

export default function AddScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ areaId: '', name: '', warehouseId: '', regionId: '', zoneId: '', status: 'active' });

  useEffect(() => { (async () => {
    try { const [w, r, z] = await Promise.all([apiClient.get('/warehouses'), apiClient.get('/regions'), apiClient.get('/zones')]); setWarehouses(w.data?.warehouses || []); setRegions(r.data?.regions || []); setZones(z.data?.zones || []); }
    finally { setLoading(false); }
  })(); }, []);

  const warehouse = useMemo(() => warehouses.find((w) => w.warehouseId === form.warehouseId), [warehouses, form.warehouseId]);
  const region = useMemo(() => regions.find((r) => r.regionId === form.regionId), [regions, form.regionId]);
  const zone = useMemo(() => zones.find((z) => z.zoneId === form.zoneId), [zones, form.zoneId]);
  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onSave = async () => {
    if (!form.areaId || !form.name || !form.warehouseId || !form.regionId || !form.zoneId) return Alert.alert('Missing data', 'Please fill required fields.');
    setSaving(true);
    try {
      await apiClient.post('/areas', { areaId: form.areaId.trim(), name: form.name.trim(), warehouseId: form.warehouseId, warehouseName: warehouse?.name || '', regionId: form.regionId, regionName: region?.name || '', zoneId: form.zoneId, zoneName: zone?.name || '', status: form.status });
      Alert.alert('Success', 'Territory saved successfully.');
      setForm({ areaId: '', name: '', warehouseId: '', regionId: '', zoneId: '', status: 'active' });
    } catch (e) { Alert.alert('Save failed', e.message); } finally { setSaving(false); }
  };

  if (loading) return <Loader />;
  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Add Territory</Text>
    <TextInput style={styles.input} placeholder="Territory ID" value={form.areaId} onChangeText={(v) => setField('areaId', v)} />
    <TextInput style={styles.input} placeholder="Territory Name" value={form.name} onChangeText={(v) => setField('name', v)} />
    <Text style={styles.label}>Warehouse</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{warehouses.map((w) => <Pressable key={w._id} style={[styles.chip, form.warehouseId === w.warehouseId ? styles.active : null]} onPress={() => setField('warehouseId', w.warehouseId)}><Text style={form.warehouseId === w.warehouseId ? styles.activeTx : null}>{w.name}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>Region</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{regions.filter((r) => !form.warehouseId || r.warehouseId === form.warehouseId).map((r) => <Pressable key={r._id} style={[styles.chip, form.regionId === r.regionId ? styles.active : null]} onPress={() => setField('regionId', r.regionId)}><Text style={form.regionId === r.regionId ? styles.activeTx : null}>{r.name}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>Zone</Text><ScrollView horizontal contentContainerStyle={styles.wrap}>{zones.filter((z) => !form.regionId || z.regionId === form.regionId).map((z) => <Pressable key={z._id} style={[styles.chip, form.zoneId === z.zoneId ? styles.active : null]} onPress={() => setField('zoneId', z.zoneId)}><Text style={form.zoneId === z.zoneId ? styles.activeTx : null}>{z.name}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>Status</Text><View style={styles.wrap}>{STATUS.map((s) => <Pressable key={s} style={[styles.chip, form.status === s ? styles.active : null]} onPress={() => setField('status', s)}><Text style={form.status === s ? styles.activeTx : null}>{s}</Text></Pressable>)}</View>
    <Button title="Save Territory" onPress={onSave} loading={saving} style={{ marginTop: 12 }} />
  </Card></ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 12 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, label: { marginTop: 8, marginBottom: 6, fontWeight: '600' }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginBottom: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, active: { backgroundColor: '#059669', borderColor: '#059669' }, activeTx: { color: '#fff' } });