import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Button from '../../../../ui/Button';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';
import useCompanyScope from '../../hooks/useCompanyScope';

const STATUS = ['active', 'inactive'];

export default function AddScreen() {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany, loadingCompanies } = useCompanyScope();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [form, setForm] = useState({ zoneId: '', name: '', warehouseId: '', regionId: '', status: 'active' });

  useEffect(() => { (async () => {
    try {
      const qp = selectedCompany?.companyId ? `?companyId=${encodeURIComponent(selectedCompany.companyId)}` : '';
      const [w, r] = await Promise.all([apiClient.get(`/warehouses${qp}`), apiClient.get(`/regions${qp}`)]);
      setWarehouses(w.data?.warehouses || []);
      setRegions(r.data?.regions || []);
    } finally { setLoading(false); }
  })(); }, [selectedCompany?.companyId]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const warehouse = useMemo(() => warehouses.find((w) => w.warehouseId === form.warehouseId), [warehouses, form.warehouseId]);
  const region = useMemo(() => regions.find((r) => r.regionId === form.regionId), [regions, form.regionId]);

  const onSave = async () => {
    if (!form.zoneId.trim() || !form.name.trim() || !form.warehouseId || !form.regionId) return Alert.alert('Missing data', 'Please fill required fields.');
    setSaving(true);
    try {
      await apiClient.post('/zones', {
        zoneId: form.zoneId.trim(),
        name: form.name.trim(),
        warehouseId: form.warehouseId,
        warehouseName: warehouse?.name || '',
        regionId: form.regionId,
        regionName: region?.name || '',
        companyId: selectedCompany?.companyId || warehouse?.companyId || '',
        companyName: selectedCompany?.name || warehouse?.companyName || '',
        status: form.status,
      });
      Alert.alert('Success', 'Zone saved successfully.');
      setForm({ zoneId: '', name: '', warehouseId: '', regionId: '', status: 'active' });
    } catch (e) { Alert.alert('Save failed', e.message || 'Failed to save zone'); }
    finally { setSaving(false); }
  };

  if (loading || loadingCompanies) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Add Zone</Text>

        <Text style={styles.label}>Company</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}>{companies.map((c) => <Pressable key={c._id || c.companyId} style={[styles.chip, companyDocId === (c._id || c.companyId) ? styles.active : null, !canSelectCompany ? styles.disabled : null]} onPress={() => setCompanyDocId(c._id || c.companyId)} disabled={!canSelectCompany}><Text style={companyDocId === (c._id || c.companyId) ? styles.activeText : null}>{c.name}</Text></Pressable>)}</ScrollView>
        <TextInput style={styles.input} placeholder="Zone ID" value={form.zoneId} onChangeText={(v) => setField('zoneId', v)} />
        <TextInput style={styles.input} placeholder="Zone Name" value={form.name} onChangeText={(v) => setField('name', v)} />

        <Text style={styles.label}>Warehouse</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}>{warehouses.map((w) => <Pressable key={w._id} style={[styles.chip, form.warehouseId === w.warehouseId ? styles.active : null]} onPress={() => setField('warehouseId', w.warehouseId)}><Text style={form.warehouseId === w.warehouseId ? styles.activeText : null}>{w.name}</Text></Pressable>)}</ScrollView>

        <Text style={styles.label}>Region</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}>{regions.filter((r) => !form.warehouseId || r.warehouseId === form.warehouseId).map((r) => <Pressable key={r._id} style={[styles.chip, form.regionId === r.regionId ? styles.active : null]} onPress={() => setField('regionId', r.regionId)}><Text style={form.regionId === r.regionId ? styles.activeText : null}>{r.name}</Text></Pressable>)}</ScrollView>

        <Text style={styles.label}>Status</Text>
        <View style={styles.wrap}>{STATUS.map((st) => <Pressable key={st} style={[styles.chip, form.status === st ? styles.active : null]} onPress={() => setField('status', st)}><Text style={form.status === st ? styles.activeText : null}>{st}</Text></Pressable>)}</View>

        <Button title="Save Zone" onPress={onSave} loading={saving} style={{ marginTop: 12 }} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12 }, title: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, label: { marginTop: 8, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, minHeight: 42, paddingHorizontal: 12, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, disabled: { opacity: 0.7 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, active: { backgroundColor: '#059669', borderColor: '#059669' }, activeText: { color: '#fff' },
});