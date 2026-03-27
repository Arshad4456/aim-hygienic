import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import useCompanyScope from '../hooks/useCompanyScope';

const PAGE_SIZE = 50;

function Field({ label, value, onChangeText }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={String(value ?? '')} onChangeText={onChangeText} />
    </View>
  );
}

export default function WarehousesScreen({ navigation }) {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany, loadingCompanies } = useCompanyScope();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const query = selectedCompany?.companyId ? `?companyId=${encodeURIComponent(selectedCompany.companyId)}` : '';
      const { data } = await apiClient.get(`/warehouses${query}`);
      setRows(data?.warehouses || []);
    } catch (e) {
      setErr(e.message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.companyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, status, companyDocId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((w) => {
      if (status && String(w.status || '').toLowerCase() !== status.toLowerCase()) return false;
      if (!q) return true;
      return [w.warehouseId, w.name, w.mobileNumber, w.phoneNumber, w.address].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [rows, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filtered, safePage]);

  const onDelete = (id) => {
    Alert.alert('Delete Warehouse', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/warehouses/${id}`);
            await load();
          } catch (e) {
            setErr(e.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  const onSave = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const payload = { ...edit, capacity: Number(edit.capacity || 0) };
      const { data } = await apiClient.put(`/warehouses/${edit._id}`, payload);
      setRows((s) => s.map((w) => (w._id === edit._id ? (data?.warehouse || payload) : w)));
      setEdit(null);
    } catch (e) {
      setErr(e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingCompanies) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Warehouse Master</Text>
            <Text style={styles.subtitle}>Manage warehouse details, status and address.</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => navigation?.navigate?.('admin:warehouses/add')}><Text style={styles.addText}>Add Warehouse</Text></Pressable>
        </View>

        <Text style={styles.fieldLabel}>Company</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
          <Pressable style={[styles.chip, !companyDocId ? styles.chipActive : null, !canSelectCompany ? styles.chipDisabled : null]} onPress={() => setCompanyDocId('')} disabled={!canSelectCompany}>
            <Text style={[styles.chipText, !companyDocId ? styles.chipTextActive : null]}>{canSelectCompany ? 'All Companies' : 'Company by role'}</Text>
          </Pressable>
          {companies.map((c) => (
            <Pressable key={c._id || c.companyId} style={[styles.chip, companyDocId === (c._id || c.companyId) ? styles.chipActive : null, !canSelectCompany ? styles.chipDisabled : null]} onPress={() => setCompanyDocId(c._id || c.companyId)} disabled={!canSelectCompany}>
              <Text style={[styles.chipText, companyDocId === (c._id || c.companyId) ? styles.chipTextActive : null]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search warehouse..." placeholderTextColor="#71717a" />
        <View style={styles.statusRow}>
          <Pressable style={[styles.chip, !status ? styles.chipActive : null]} onPress={() => setStatus('')}><Text style={[styles.chipText, !status ? styles.chipTextActive : null]}>All</Text></Pressable>
          <Pressable style={[styles.chip, status === 'active' ? styles.chipActive : null]} onPress={() => setStatus('active')}><Text style={[styles.chipText, status === 'active' ? styles.chipTextActive : null]}>Active</Text></Pressable>
          <Pressable style={[styles.chip, status === 'inactive' ? styles.chipActive : null]} onPress={() => setStatus('inactive')}><Text style={[styles.chipText, status === 'inactive' ? styles.chipTextActive : null]}>Inactive</Text></Pressable>
        </View>

        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Total Warehouses</Text><Text style={styles.summaryCount}>{filtered.length}</Text></View>
        {err ? <Text style={styles.error}>{err}</Text> : null}
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              {['Warehouse ID', 'Name', 'Mobile', 'Phone', 'Capacity', 'Status', 'Address', 'Actions'].map((h) => (
                <Text key={h} style={[styles.headCell, h === 'Actions' ? styles.colAction : styles.colData]}>{h}</Text>
              ))}
            </View>
            <View style={styles.rowStack}>
              {pageRows.length === 0 ? <Text style={styles.help}>No warehouses found.</Text> : pageRows.map((w) => (
                <View key={w._id} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.colData]}>{w.warehouseId || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{w.name || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{w.mobileNumber || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{w.phoneNumber || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{w.capacity || 0}</Text>
                  <Text style={[styles.cell, styles.colData]}>{w.status || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{w.address || '-'}</Text>
                  <View style={styles.actionCell}>
                    <Pressable style={styles.editBtn} onPress={() => setEdit({ ...w })}><Text style={styles.editText}>Edit</Text></Pressable>
                    <Pressable style={styles.deleteBtn} onPress={() => onDelete(w._id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.paginationWrap}>
          <Text style={styles.pageText}>Page {safePage} of {totalPages}</Text>
          <View style={styles.pageActions}>
            <Pressable style={[styles.pageBtn, safePage === 1 ? styles.pageBtnDisabled : null]} disabled={safePage === 1} onPress={() => setPage(1)}><Text style={styles.pageBtnText}>Start</Text></Pressable>
            <Pressable style={[styles.pageBtn, safePage === 1 ? styles.pageBtnDisabled : null]} disabled={safePage === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}><Text style={styles.pageBtnText}>Previous</Text></Pressable>
            <Pressable style={[styles.pageBtn, safePage === totalPages ? styles.pageBtnDisabled : null]} disabled={safePage === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}><Text style={styles.pageBtnText}>Next</Text></Pressable>
            <Pressable style={[styles.pageBtn, safePage === totalPages ? styles.pageBtnDisabled : null]} disabled={safePage === totalPages} onPress={() => setPage(totalPages)}><Text style={styles.pageBtnText}>End</Text></Pressable>
          </View>
        </View>
      </Card>

      <Modal visible={Boolean(edit)} transparent animationType="slide" onRequestClose={() => setEdit(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Warehouse</Text>
            {edit ? (
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {['warehouseId', 'name', 'mobileNumber', 'phoneNumber', 'capacity', 'address'].map((f) => (
                  <Field key={f} label={f} value={edit[f] || ''} onChangeText={(v) => setEdit((s) => ({ ...s, [f]: v }))} />
                ))}
                <Text style={styles.fieldLabel}>status</Text>
                <View style={styles.statusRow}>
                  <Pressable style={[styles.chip, edit.status === 'active' ? styles.chipActive : null]} onPress={() => setEdit((s) => ({ ...s, status: 'active' }))}><Text style={[styles.chipText, edit.status === 'active' ? styles.chipTextActive : null]}>Active</Text></Pressable>
                  <Pressable style={[styles.chip, edit.status === 'inactive' ? styles.chipActive : null]} onPress={() => setEdit((s) => ({ ...s, status: 'inactive' }))}><Text style={[styles.chipText, edit.status === 'inactive' ? styles.chipTextActive : null]}>Inactive</Text></Pressable>
                </View>
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setEdit(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                  <Pressable style={styles.saveBtn} onPress={onSave} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Update'}</Text></Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  addBtn: { backgroundColor: '#059669', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  addText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  input: { marginTop: 8, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', color: '#111827' },
  statusRow: { marginTop: 8, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6 },
  chipDisabled: { opacity: 0.7 },
  chipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  chipText: { color: '#52525b', fontSize: 12 },
  chipTextActive: { color: '#047857', fontWeight: '700' },
  summaryCard: { marginTop: 10, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  summaryLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  summaryCount: { fontSize: 20, color: '#111827', fontWeight: '700' },
  error: { marginTop: 8, color: '#b91c1c' },
  tableWrap: { minWidth: 1180 },
  tableHeader: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 8 },
  headCell: { fontSize: 12, fontWeight: '700', color: '#111827' },
  colData: { width: 130 },
  colAction: { width: 170 },
  rowStack: { marginTop: 8, gap: 8 },
  tableRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center' },
  cell: { fontSize: 12, color: '#374151' },
  actionCell: { width: 170, flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, borderRadius: 8, backgroundColor: '#e0f2fe', paddingVertical: 7, alignItems: 'center' },
  editText: { color: '#075985', fontWeight: '700', fontSize: 12 },
  deleteBtn: { flex: 1, borderRadius: 8, backgroundColor: '#fee2e2', paddingVertical: 7, alignItems: 'center' },
  deleteText: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
  help: { color: '#6b7280', fontSize: 13 },
  paginationWrap: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10, gap: 8 },
  pageText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  pageActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pageBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  fieldLabel: { fontSize: 12, color: '#374151', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
