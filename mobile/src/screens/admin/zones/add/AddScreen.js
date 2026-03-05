import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import apiClient from '../../../../api/client';
import Button from '../../../../ui/Button';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function AddScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [form, setForm] = useState({ zoneId: '', name: '', warehouseId: '', regionId: '', status: 'active' });

  useEffect(() => { (async () => {
    try {
      const [w, r] = await Promise.all([apiClient.get('/warehouses'), apiClient.get('/regions')]);
      setWarehouses(w.data?.warehouses || []);
      setRegions(r.data?.regions || []);
    } catch (e) { setErr(e.message || 'Failed to load master data'); }
    finally { setLoading(false); }
  })(); }, []);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const warehouse = useMemo(() => warehouses.find((w) => w.warehouseId === form.warehouseId), [warehouses, form.warehouseId]);
  const region = useMemo(() => regions.find((r) => r.regionId === form.regionId), [regions, form.regionId]);

  const onSave = async () => {
    if (!form.zoneId.trim() || !form.name.trim() || !form.warehouseId || !form.regionId) {
      Alert.alert('Missing data', 'Zone ID, Name, Warehouse and Region are required.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/zones', { zoneId: form.zoneId.trim(), name: form.name.trim(), warehouseId: form.warehouseId, warehouseName: warehouse?.name || '', regionId: form.regionId, regionName: region?.name || '', status: form.status });
      setForm({ zoneId: '', name: '', warehouseId: '', regionId: '', status: 'active' });
      Alert.alert('Success', 'Zone saved successfully.');
    } catch (e) { Alert.alert('Save failed', e.message || 'Failed to save zone'); }
    finally { setSaving(false); }
  };

  if (loading) return <Loader />;

  return <ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Add Zone</Text>{err ? <Text style={styles.err}>{err}</Text> : null}
    <TextInput style={styles.input} placeholder="Zone ID" value={form.zoneId} onChangeText={(v) => setField('zoneId', v)} />
    <TextInput style={styles.input} placeholder="Zone Name" value={form.name} onChangeText={(v) => setField('name', v)} />
    <Text style={styles.label}>Warehouse</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}>{warehouses.map((w) => <Text key={w._id} style={[styles.chip, form.warehouseId === w.warehouseId ? styles.active : null]} onPress={() => setField('warehouseId', w.warehouseId)}>{w.name}</Text>)}</ScrollView>
    <Text style={styles.label}>Region</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}>{regions.map((r) => <Text key={r._id} style={[styles.chip, form.regionId === r.regionId ? styles.active : null]} onPress={() => setField('regionId', r.regionId)}>{r.name}</Text>)}</ScrollView>
    <Button title="Save Zone" onPress={onSave} loading={saving} style={{ marginTop: 14 }} />
  </Card></ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 12 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, err: { color: '#dc2626' }, label: { marginTop: 8, marginBottom: 6, fontWeight: '600' }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginTop: 8 }, wrap: { gap: 8 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, active: { backgroundColor: '#059669', color: '#fff', borderColor: '#059669' } });