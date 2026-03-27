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
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ regionId: '', name: '', warehouseDocId: '', status: 'active' });

  useEffect(() => {
    (async () => {
      try {
        const qp = selectedCompany?.companyId ? `?companyId=${encodeURIComponent(selectedCompany.companyId)}` : '';
        const { data } = await apiClient.get(`/warehouses${qp}`);
        setWarehouses(data?.warehouses || []);
      } catch (e) {
        setErr(e.message || 'Failed to load warehouses');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCompany?.companyId]);

  const selectedWarehouse = useMemo(() => warehouses.find((w) => w._id === form.warehouseDocId), [form.warehouseDocId, warehouses]);
  const selected = useMemo(() => selectedCompany || companies[0] || null, [selectedCompany, companies]);
  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onSave = async () => {
    if (!form.regionId.trim() || !form.name.trim() || !form.warehouseDocId) {
      Alert.alert('Missing data', 'Region ID, Region Name and Warehouse are required.');
      return;
    }
    if (!selected?.companyId) {
      setErr('Please select a company.');
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
        companyId: selected.companyId,
        companyName: selected.name || '',
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

  if (loading || loadingCompanies) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Add Region</Text>
        <Text style={styles.sub}>Each region connects to a warehouse.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}

        <Text style={styles.label}>Select Company</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
          {companies.map((c) => (
            <Pressable key={c._id || c.companyId} onPress={() => setCompanyDocId(c._id || c.companyId)} disabled={!canSelectCompany}>
              <Text style={[styles.chip, companyDocId === (c._id || c.companyId) ? styles.chipActive : null, !canSelectCompany ? styles.chipDisabled : null]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Region ID</Text>
        <TextInput style={styles.input} value={form.regionId} onChangeText={(v) => setField('regionId', v)} placeholder="Region ID" />

        <Text style={styles.label}>Region Name</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setField('name', v)} placeholder="Region Name" />

        <Text style={styles.label}>Warehouse Name</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
          {warehouses.map((w) => (
            <Pressable key={w._id} onPress={() => setField('warehouseDocId', w._id)}>
              <Text style={[styles.chip, form.warehouseDocId === w._id ? styles.chipActive : null]}>{w.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Status</Text>
        <View style={styles.row}>{STATUS.map((s) => <Pressable key={s} onPress={() => setField('status', s)}><Text style={[styles.chip, form.status === s ? styles.chipActive : null]}>{s}</Text></Pressable>)}</View>

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
  chipDisabled: { opacity: 0.7 },
  err: { marginTop: 8, color: '#dc2626' },
  ok: { marginTop: 8, color: '#059669' },
});