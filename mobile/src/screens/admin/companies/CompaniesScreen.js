import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

const emptyForm = {
  companyId: '',
  name: '',
  phone1: '',
  phone2: '',
  email: '',
  mainOfficeAddress: '',
};

function Field({ label, value, onChangeText, multiline = false }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline ? styles.inputMulti : null]}
        multiline={multiline}
        placeholderTextColor="#71717a"
      />
    </View>
  );
}

export default function CompaniesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [rows, setRows] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const res = await apiClient.get('/companies');
      setRows(res.data?.companies || []);
    } catch (e) {
      setErr(e.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = async (id) => {
    setEditId(id);
    setEditOpen(true);
    setForm(emptyForm);
    setSaving(true);
    setErr('');
    try {
      const res = await apiClient.get(`/companies/${id}`);
      const company = res.data?.company || {};
      setForm({
        companyId: company.companyId || '',
        name: company.name || '',
        phone1: company.phone1 || '',
        phone2: company.phone2 || '',
        email: company.email || '',
        mainOfficeAddress: company.mainOfficeAddress || '',
      });
    } catch (e) {
      setErr(e.message || 'Failed to load company');
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const updateCompany = async () => {
    setSaving(true);
    setErr('');
    setOk('');
    try {
      await apiClient.put(`/companies/${editId}`, form);
      setEditOpen(false);
      setOk('Company updated successfully.');
      await load();
    } catch (e) {
      setErr(e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const headerRows = useMemo(
    () => ['Company ID', 'Company Name', 'Phone #1', 'Email', 'Actions'],
    []
  );

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Companies</Text>
            <Text style={styles.subtitle}>Same data source as website company list (`/companies`).</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => navigation?.navigate?.('admin:companies/add')}>
            <Text style={styles.addBtnText}>Add Company</Text>
          </Pressable>
        </View>
        {err ? <Text style={styles.error}>{err}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              {headerRows.map((label, idx) => (
                <Text key={label} style={[styles.headCell, idx === 1 ? styles.colName : styles.colDefault]}>{label}</Text>
              ))}
            </View>

            <View style={styles.stack}>
              {rows.length === 0 ? (
                <Text style={styles.help}>No companies found.</Text>
              ) : (
                rows.map((c) => (
                  <View key={c._id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.colDefault]}>{c.companyId || '-'}</Text>
                    <Text style={[styles.cell, styles.colName]}>{c.name || '-'}</Text>
                    <Text style={[styles.cell, styles.colDefault]}>{c.phone1 || '-'}</Text>
                    <Text style={[styles.cell, styles.colDefault]}>{c.email || '-'}</Text>
                    <Pressable style={styles.editBtn} onPress={() => startEdit(c._id)}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </Card>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Company</Text>

            <ScrollView contentContainerStyle={styles.formWrap}>
              <Field label="Company ID" value={form.companyId} onChangeText={(v) => setForm((s) => ({ ...s, companyId: v }))} />
              <Field label="Company Name" value={form.name} onChangeText={(v) => setForm((s) => ({ ...s, name: v }))} />
              <Field label="Phone #1" value={form.phone1} onChangeText={(v) => setForm((s) => ({ ...s, phone1: v }))} />
              <Field label="Phone #2" value={form.phone2} onChangeText={(v) => setForm((s) => ({ ...s, phone2: v }))} />
              <Field label="Email" value={form.email} onChangeText={(v) => setForm((s) => ({ ...s, email: v }))} />
              <Field
                label="Main Office Address"
                value={form.mainOfficeAddress}
                onChangeText={(v) => setForm((s) => ({ ...s, mainOfficeAddress: v }))}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditOpen(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable style={styles.saveBtn} onPress={updateCompany} disabled={saving}>
                <Text style={styles.saveText}>{saving ? 'Updating...' : 'Update'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subtitle: { marginTop: 6, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  ok: { marginTop: 8, color: '#047857' },
  help: { color: '#6b7280', fontSize: 13 },
  addBtn: { backgroundColor: '#059669', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  stack: { gap: 8, marginTop: 8 },
  tableWrap: { minWidth: 720 },
  tableHeader: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headCell: { fontSize: 12, color: '#111827', fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  colDefault: { width: 130 },
  colName: { width: 220 },
  cell: { fontSize: 12, color: '#374151' },
  editBtn: {
    width: 90,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#111827' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  formWrap: { gap: 8, paddingBottom: 8 },
  fieldWrap: { gap: 4 },
  fieldLabel: { fontSize: 12, color: '#374151', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    fontSize: 13,
    color: '#111827',
  },
  inputMulti: { minHeight: 82, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  saveText: { color: '#fff', fontWeight: '700' },
});