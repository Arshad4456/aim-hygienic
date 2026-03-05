import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Button from '../../../../ui/Button';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const STATUS = ['active', 'inactive'];

export default function AddScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ regionId: '', name: '', warehouseDocId: '', status: 'active' });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/warehouses');
        setWarehouses(data?.warehouses || []);
      } catch (e) {
        setErr(e.message || 'Failed to load warehouses');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w._id === form.warehouseDocId),
    [form.warehouseDocId, warehouses]
  );

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onSave = async () => {
    if (!form.regionId.trim() || !form.name.trim() || !form.warehouseDocId) {
      Alert.alert('Missing data', 'Region ID, Region Name and Warehouse are required.');
      return;
    }
    setSaving(true);
    setErr('');
    setOk('');
    try {
      await apiClient.post('/regions', {
        regionId: form.regionId.trim(),
        name: form.name.trim(),
        warehouseId: selectedWarehouse?.warehouseId || '',
        warehouseName: selectedWarehouse?.name || '',
        companyId: selectedWarehouse?.companyId || '',
        companyName: selectedWarehouse?.companyName || '',
        status: form.status,
      });
      setOk('Region saved successfully.');
      setForm({ regionId: '', name: '', warehouseDocId: '', status: 'active' });
    } catch (e) {
      setErr(e.message || 'Failed to save region');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Add Region</Text>
        <Text style={styles.sub}>Each region connects to a warehouse.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}

        <Text style={styles.label}>Region ID</Text>
        <TextInput style={styles.input} value={form.regionId} onChangeText={(v) => setField('regionId', v)} placeholder="Region ID" />

        <Text style={styles.label}>Region Name</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setField('name', v)} placeholder="Region Name" />

        <Text style={styles.label}>Warehouse Name</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
          {warehouses.map((w) => (
            <Text key={w._id} style={[styles.chip, form.warehouseDocId === w._id ? styles.chipActive : null]} onPress={() => setField('warehouseDocId', w._id)}>
              {w.name}
            </Text>
          ))}
        </ScrollView>

        <Text style={styles.label}>Status</Text>
        <View style={styles.row}>{STATUS.map((s) => <Text key={s} style={[styles.chip, form.status === s ? styles.chipActive : null]} onPress={() => setField('status', s)}>{s}</Text>)}</View>

        <Button title={saving ? 'Saving...' : 'Save Region'} onPress={onSave} loading={saving} style={{ marginTop: 14 }} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#18181b' },
  sub: { marginTop: 4, color: '#71717a' },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '600', color: '#3f3f46' },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 12, minHeight: 42 },
  chipsWrap: { gap: 8, paddingVertical: 4 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, color: '#3f3f46' },
  chipActive: { backgroundColor: '#059669', borderColor: '#059669', color: '#fff' },
  err: { marginTop: 8, color: '#dc2626' },
  ok: { marginTop: 8, color: '#059669' },
});