import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

function Field({ label, value, onChangeText, keyboardType = 'default' }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType={keyboardType} />
    </View>
  );
}

export default function AddScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({ warehouseId: '', name: '', mobileNumber: '', phoneNumber: '', capacity: '', status: 'active', address: '' });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/companies');
        setCompanies(data?.companies || []);
      } catch (e) {
        setErr(e.message || 'Failed to load company');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const company = useMemo(() => companies[0], [companies]);

  const setField = (key, value) => setForm((s) => ({ ...s, [key]: value }));

  const onSubmit = async () => {
    setErr('');
    setOk('');
    if (!form.warehouseId || !form.name || !form.mobileNumber || !form.phoneNumber || !form.capacity || !form.address) {
      setErr('Please fill all required fields.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/warehouses', {
        ...form,
        capacity: Number(form.capacity || 0),
        companyId: company?.companyId || '',
        companyName: company?.name || 'AIM Hygienic (Pvt) Limited',
      });
      setOk('✅ Warehouse saved successfully.');
      setForm({ warehouseId: '', name: '', mobileNumber: '', phoneNumber: '', capacity: '', status: 'active', address: '' });
      setTimeout(() => navigation?.navigate?.('admin:warehouses'), 500);
    } catch (e) {
      setErr(e.message || 'Failed to save warehouse');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Add Warehouse</Text>
        <Text style={styles.subtitle}>Current setup supports one warehouse for all regions.</Text>

        {err ? <Text style={styles.error}>{err}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}

        <View style={{ marginTop: 10, gap: 8 }}>
          <Field label="Warehouse ID" value={form.warehouseId} onChangeText={(v) => setField('warehouseId', v)} />
          <Field label="Warehouse Name" value={form.name} onChangeText={(v) => setField('name', v)} />
          <Field label="Mobile Number" value={form.mobileNumber} onChangeText={(v) => setField('mobileNumber', v)} keyboardType="phone-pad" />
          <Field label="Phone Number" value={form.phoneNumber} onChangeText={(v) => setField('phoneNumber', v)} keyboardType="phone-pad" />
          <Field label="Capacity" value={form.capacity} onChangeText={(v) => setField('capacity', v)} keyboardType="numeric" />

          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            <Pressable style={[styles.chip, form.status === 'active' ? styles.chipActive : null]} onPress={() => setField('status', 'active')}><Text style={[styles.chipText, form.status === 'active' ? styles.chipTextActive : null]}>Active</Text></Pressable>
            <Pressable style={[styles.chip, form.status === 'inactive' ? styles.chipActive : null]} onPress={() => setField('status', 'inactive')}><Text style={[styles.chipText, form.status === 'inactive' ? styles.chipTextActive : null]}>Inactive</Text></Pressable>
          </View>

          <Text style={styles.label}>Address</Text>
          <TextInput style={[styles.input, styles.area]} multiline value={form.address} onChangeText={(v) => setField('address', v)} />

          <Pressable style={styles.saveBtn} onPress={onSubmit} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Warehouse'}</Text></Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  ok: { marginTop: 8, color: '#047857' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151' },
  input: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', color: '#111827' },
  area: { minHeight: 90, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  chipText: { color: '#52525b', fontSize: 12 },
  chipTextActive: { color: '#047857', fontWeight: '700' },
  saveBtn: { marginTop: 10, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
