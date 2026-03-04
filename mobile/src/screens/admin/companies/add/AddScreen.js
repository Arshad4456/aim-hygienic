import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';

const initialState = {
  companyId: '',
  name: '',
  phone1: '',
  phone2: '',
  email: '',
  mainOfficeAddress: '',
};

function Field({ label, value, onChangeText, multiline = false, keyboardType = 'default' }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline ? styles.inputMulti : null]}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor="#71717a"
      />
    </View>
  );
}

export default function AddScreen({ navigation }) {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const save = async () => {
    setErr('');
    setOk('');

    if (!form.companyId.trim() || !form.name.trim()) {
      setErr('Company ID and Company Name are required.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/companies', form);
      setOk('✅ Company created successfully.');
      setForm(initialState);
      setTimeout(() => {
        navigation?.navigate?.('admin:companies');
      }, 500);
    } catch (e) {
      setErr(e.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Add New Company</Text>
        <Text style={styles.subtitle}>Enter company details for registration.</Text>

        {err ? <Text style={styles.error}>{err}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}

        <View style={styles.formWrap}>
          <Field label="Company ID" value={form.companyId} onChangeText={(v) => setForm((s) => ({ ...s, companyId: v }))} />
          <Field label="Company Name" value={form.name} onChangeText={(v) => setForm((s) => ({ ...s, name: v }))} />
          <Field label="Phone #1" value={form.phone1} onChangeText={(v) => setForm((s) => ({ ...s, phone1: v }))} keyboardType="phone-pad" />
          <Field label="Phone #2" value={form.phone2} onChangeText={(v) => setForm((s) => ({ ...s, phone2: v }))} keyboardType="phone-pad" />
          <Field label="Email" value={form.email} onChangeText={(v) => setForm((s) => ({ ...s, email: v }))} keyboardType="email-address" />
          <Field
            label="Main Office Address"
            value={form.mainOfficeAddress}
            onChangeText={(v) => setForm((s) => ({ ...s, mainOfficeAddress: v }))}
            multiline
          />

          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} disabled={loading} onPress={save}>
              <Text style={styles.primaryText}>{loading ? 'Saving...' : 'Save Company'}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => navigation?.navigate?.('admin:companies')}>
              <Text style={styles.secondaryText}>View Company List</Text>
            </Pressable>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 10, color: '#b91c1c' },
  ok: { marginTop: 10, color: '#047857' },
  formWrap: { marginTop: 12, gap: 8 },
  fieldWrap: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 13,
  },
  inputMulti: { minHeight: 82, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  primaryBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#fff' },
  secondaryText: { color: '#111827', fontWeight: '600', fontSize: 13 },
});
