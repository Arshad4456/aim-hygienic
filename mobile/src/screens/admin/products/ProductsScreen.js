import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import { PRODUCT_CATEGORIES } from './productConstants';

const PAGE_SIZE = 50;
const TABLE_COLUMNS = ['Code', 'Product ID', 'Product Name', 'Company', 'Category', 'Sub-Category', 'Size', 'Retail', 'Wholesale', 'Trade', 'Actions'];

function compareValues(a, b, sortDir) {
  const left = a ?? '';
  const right = b ?? '';
  const leftNum = Number(left);
  const rightNum = Number(right);
  const bothNumbers = Number.isFinite(leftNum) && Number.isFinite(rightNum) && String(left).trim() !== '' && String(right).trim() !== '';
  const result = bothNumbers ? leftNum - rightNum : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
  return sortDir === 'asc' ? result : -result;
}

function FilterRow({ label, options, value, onPick, onClear }) {
  const normalized = options.map((item) => (typeof item === 'string' ? { label: item, value: item } : item));
  return (
    <View>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Pressable style={[styles.chip, !value ? styles.chipActive : null]} onPress={onClear}><Text style={[styles.chipText, !value ? styles.chipTextActive : null]}>All</Text></Pressable>
        {normalized.map((opt) => (
          <Pressable key={`${label}-${opt.value}`} style={[styles.chip, value === opt.value ? styles.chipActive : null]} onPress={() => onPick(opt.value)}>
            <Text style={[styles.chipText, value === opt.value ? styles.chipTextActive : null]}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function ProductsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [companiesRes, productsRes] = await Promise.all([apiClient.get('/companies'), apiClient.get('/products')]);
      setCompanies(companiesRes.data?.companies || []);
      setRows(productsRes.data?.products || []);
    } catch (e) {
      setErr(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, companyFilter, categoryFilter, subCategoryFilter, sortKey, sortDir]);

  const subCategoryOptions = useMemo(() => {
    if (!categoryFilter) {
      return Array.from(new Set(rows.map((r) => r.subCategory).filter(Boolean)));
    }
    const selected = PRODUCT_CATEGORIES.find((c) => c.value === categoryFilter);
    return selected?.subCategories || [];
  }, [rows, categoryFilter]);

  const filtered = useMemo(() => {
    let next = rows;
    if (companyFilter) {
      const company = companies.find((c) => c._id === companyFilter);
      next = next.filter((p) => p.companyId === company?.companyId);
    }
    if (categoryFilter) next = next.filter((p) => p.category === categoryFilter);
    if (subCategoryFilter) next = next.filter((p) => p.subCategory === subCategoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      next = next.filter((p) => [p.productId, p.code, p.name, p.companyName, p.category, p.subCategory, p.barcode].filter(Boolean).join(' ').toLowerCase().includes(q));
    }
    return next;
  }, [rows, companies, companyFilter, categoryFilter, subCategoryFilter, search]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => compareValues(a?.[sortKey], b?.[sortKey], sortDir));
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [sortedRows, safePage]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    filtered.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [filtered]);

  const onSort = (key) => {
    if (sortKey === key) {
      setSortDir((s) => (s === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const onDelete = (id) => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/products/${id}`);
            await load();
          } catch (e) {
            setErr(e.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  const onSaveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      const payload = {
        ...editRow,
        cartonSize: Number(editRow.cartonSize || 0),
        packSize: Number(editRow.packSize || 0),
        retailPrice: Number(editRow.retailPrice || 0),
        wholesalePrice: Number(editRow.wholesalePrice || 0),
        tradePrice: Number(editRow.tradePrice || 0),
        taxablePrice: Number(editRow.taxablePrice || 0),
        costPrice: Number(editRow.costPrice || 0),
      };
      const { data } = await apiClient.put(`/products/${editRow._id}`, payload);
      setRows((s) => s.map((r) => (r._id === editRow._id ? (data?.product || payload) : r)));
      setEditRow(null);
    } catch (e) {
      setErr(e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Product List</Text>
            <Text style={styles.subtitle}>View Product List with filters, sort, edit and delete.</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => navigation?.navigate?.('admin:products/add')}><Text style={styles.addText}>Add New Product</Text></Pressable>
        </View>

        <TextInput value={search} onChangeText={setSearch} style={styles.input} placeholder="Search by code, name, company..." placeholderTextColor="#71717a" />
        <View style={styles.filterStack}>
          <FilterRow label="Company" value={companyFilter} onClear={() => setCompanyFilter('')} onPick={setCompanyFilter} options={companies.map((c) => ({ label: c.name, value: c._id }))} />
          <FilterRow label="Category" value={categoryFilter} onClear={() => { setCategoryFilter(''); setSubCategoryFilter(''); }} onPick={(v) => { setCategoryFilter(v); setSubCategoryFilter(''); }} options={PRODUCT_CATEGORIES.map((c) => ({ label: c.label, value: c.value }))} />
          <FilterRow label="Sub-Category" value={subCategoryFilter} onClear={() => setSubCategoryFilter('')} onPick={setSubCategoryFilter} options={subCategoryOptions} />
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Total</Text><Text style={styles.summaryCount}>{sortedRows.length}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Categories</Text><Text style={styles.summaryCount}>{Object.keys(categoryCounts).length}</Text></View>
        </View>
        {err ? <Text style={styles.error}>{err}</Text> : null}
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              {TABLE_COLUMNS.map((col) => {
                if (col === 'Code') {
                  return <Pressable key={col} onPress={() => onSort('code')} style={[styles.headCell, styles.colData]}><Text style={styles.headText}>Code {sortKey === 'code' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text></Pressable>;
                }
                if (col === 'Product ID') {
                  return <Pressable key={col} onPress={() => onSort('productId')} style={[styles.headCell, styles.colData]}><Text style={styles.headText}>Product ID {sortKey === 'productId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text></Pressable>;
                }
                if (col === 'Product Name') {
                  return <Pressable key={col} onPress={() => onSort('name')} style={[styles.headCell, styles.colWide]}><Text style={styles.headText}>Product Name {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text></Pressable>;
                }
                return <View key={col} style={[styles.headCell, col === 'Actions' ? styles.colAction : styles.colData]}><Text style={styles.headText}>{col}</Text></View>;
              })}
            </View>
            <View style={styles.rowStack}>
              {pageRows.length === 0 ? <Text style={styles.help}>No products found.</Text> : pageRows.map((r) => (
                <View key={r._id} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.colData]}>{r.code || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.productId || '-'}</Text>
                  <Text style={[styles.cell, styles.colWide]}>{r.name || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.companyName || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.category || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.subCategory || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.size || '-'}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.retailPrice ?? 0}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.wholesalePrice ?? 0}</Text>
                  <Text style={[styles.cell, styles.colData]}>{r.tradePrice ?? 0}</Text>
                  <View style={styles.actionCell}>
                    <Pressable style={styles.editBtn} onPress={() => setEditRow({ ...r })}><Text style={styles.editText}>Edit</Text></Pressable>
                    <Pressable style={styles.deleteBtn} onPress={() => onDelete(r._id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
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

      <Modal visible={Boolean(editRow)} transparent animationType="slide" onRequestClose={() => setEditRow(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Product</Text>
            {editRow ? (
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {['code', 'productId', 'name', 'companyName', 'category', 'subCategory', 'size', 'retailPrice', 'wholesalePrice', 'tradePrice', 'taxablePrice', 'costPrice'].map((f) => (
                  <View key={f}><Text style={styles.fieldLabel}>{f}</Text><TextInput style={styles.input} value={String(editRow[f] ?? '')} onChangeText={(v) => setEditRow((s) => ({ ...s, [f]: v }))} /></View>
                ))}
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setEditRow(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                  <Pressable style={styles.saveBtn} onPress={onSaveEdit} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Update'}</Text></Pressable>
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
  headerRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  addBtn: { backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  addText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  input: { marginTop: 10, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', color: '#111827' },
  filterStack: { marginTop: 8, gap: 8 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  chipText: { fontSize: 12, color: '#52525b' },
  chipTextActive: { color: '#047857', fontWeight: '700' },
  summaryRow: { marginTop: 10, gap: 8, flexDirection: 'row' },
  summaryCard: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  summaryLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  summaryCount: { fontSize: 20, color: '#111827', fontWeight: '700' },
  error: { marginTop: 8, color: '#b91c1c' },
  tableWrap: { minWidth: 1460 },
  tableHeader: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', paddingVertical: 8, paddingHorizontal: 8 },
  headCell: { justifyContent: 'center' },
  headText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  rowStack: { gap: 8, marginTop: 8 },
  tableRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' },
  colData: { width: 120 },
  colWide: { width: 180 },
  colAction: { width: 180 },
  cell: { fontSize: 12, color: '#374151' },
  actionCell: { width: 180, flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, backgroundColor: '#e0f2fe', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  editText: { color: '#075985', fontWeight: '700', fontSize: 12 },
  deleteBtn: { flex: 1, backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
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
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
