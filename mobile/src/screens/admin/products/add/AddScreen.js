import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';
import { PRODUCT_CATEGORIES, PRODUCT_COLUMN_MAP, PRODUCT_EMPTY_FORM, PRODUCT_TEMPLATE_HEADERS } from '../productConstants';

const FIELD_DEFS = [
  { key: 'code', label: 'Code' }, { key: 'productId', label: 'Product ID' }, { key: 'name', label: 'Product Name' },
  { key: 'alternativeName', label: 'Alternative Name' }, { key: 'barcode', label: 'Bar Code' }, { key: 'bulkBarcode', label: 'Bulk Bar Code' },
  { key: 'size', label: 'Size' }, { key: 'unit', label: 'Unit' }, { key: 'cartonSize', label: 'Carton Size', keyboardType: 'numeric' },
  { key: 'packSize', label: 'Pack Size', keyboardType: 'numeric' }, { key: 'retailPrice', label: 'Retail Price', keyboardType: 'numeric' },
  { key: 'wholesalePrice', label: 'Wholesale Price', keyboardType: 'numeric' }, { key: 'tradePrice', label: 'Trade Price', keyboardType: 'numeric' },
  { key: 'taxablePrice', label: 'Taxable Price', keyboardType: 'numeric' }, { key: 'costPrice', label: 'Cost Price', keyboardType: 'numeric' },
  { key: 'discountPer', label: 'Discount %', keyboardType: 'numeric' }, { key: 'unitScheme', label: 'Unit Scheme', keyboardType: 'numeric' },
  { key: 'taxPer', label: 'Tax %', keyboardType: 'numeric' }, { key: 'fedPer', label: 'FED %', keyboardType: 'numeric' },
  { key: 'weight', label: 'Weight', keyboardType: 'numeric' }, { key: 'weightUnitName', label: 'Weight Unit Name' },
  { key: 'taxTypeName', label: 'Tax Type Name' }, { key: 'activationType', label: 'Activation Type' },
  { key: 'sku', label: 'SKU' }, { key: 'description', label: 'Description', multiline: true },
];

const BOOL_DEFS = [
  { key: 'isTaxFromCustomer', label: 'Is Tax From Customer' },
  { key: 'isTaxAppliedOnBonus', label: 'Is Tax Applied On Bonus' },
  { key: 'isTaxAppliedAfterDiscountAndScheme', label: 'Is Tax Applied After Discount & Scheme' },
  { key: 'isDiscountAppliedAfterScheme', label: 'Is Discount Applied After Scheme' },
];

function normalizeHeader(header) {
  return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseBulkText(input) {
  const lines = String(input || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ['Please paste header + at least one row.'] };
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const mapped = headers.map((h) => PRODUCT_COLUMN_MAP[normalizeHeader(h)] || null);
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(delimiter).map((v) => v.trim());
    const row = {};
    mapped.forEach((key, idx) => {
      if (key) row[key] = values[idx] || '';
    });
    row.productId = String(row.code || '').trim();
    row.customerPrice = row.wholesalePrice;
    if (!row.productId || !row.name) {
      errors.push(`Row ${i + 1}: missing Code or Product Name`);
      continue;
    }
    rows.push(row);
  }
  return { rows, errors };
}

export default function AddScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [form, setForm] = useState(PRODUCT_EMPTY_FORM);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSummary, setBulkSummary] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/companies');
        setCompanies(data?.companies || []);
      } catch (e) {
        setErr(e.message || 'Failed to load companies');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedCompany = useMemo(() => companies.find((c) => c._id === companyId), [companies, companyId]);
  const subCategories = useMemo(() => {
    const selected = PRODUCT_CATEGORIES.find((c) => c.value === form.category);
    return selected?.subCategories || [];
  }, [form.category]);

  const setField = (key, value) => setForm((s) => ({ ...s, [key]: value }));

  const onSubmit = async () => {
    setErr('');
    setOk('');
    if (!form.productId || !form.name) {
      setErr('Product ID and Product Name are required.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/products', {
        ...form,
        code: form.code || form.productId,
        productId: form.productId || form.code,
        companyId: selectedCompany?.companyId || form.companyId,
        companyName: selectedCompany?.name || form.companyName,
        customerPrice: form.wholesalePrice,
      });
      setOk('✅ Product saved successfully.');
      setForm(PRODUCT_EMPTY_FORM);
      setCompanyId('');
    } catch (e) {
      setErr(e.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async () => {
    setErr('');
    setOk('');
    setBulkSummary(null);
    const parsed = parseBulkText(bulkInput);
    setBulkErrors(parsed.errors || []);
    if (!parsed.rows.length) return;

    setBulkSaving(true);
    try {
      const { data } = await apiClient.post('/products/bulk-upsert', { rows: parsed.rows });
      setBulkSummary(data?.summary || null);
      setOk('✅ Bulk import completed.');
      if (!data?.summary?.skipped) setBulkInput('');
    } catch (e) {
      setErr(e.message || 'Bulk import failed');
    } finally {
      setBulkSaving(false);
    }
  };

  const downloadTemplate = async () => {
    const csv = `${PRODUCT_TEMPLATE_HEADERS.join(',')}\n`;
    await Share.share({ title: 'Products Import Template', message: csv });
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Bulk Import from Excel/Google Sheets</Text>
            <Text style={styles.subtitle}>Paste table data or download template.</Text>
          </View>
          <Pressable style={styles.ghostBtn} onPress={downloadTemplate}><Text style={styles.ghostText}>Download Template</Text></Pressable>
        </View>

        {bulkErrors.length ? <Text style={styles.warn}>Rows skipped: {bulkErrors.slice(0, 5).join(' | ')}</Text> : null}
        {bulkSummary ? <Text style={styles.ok}>Imported {bulkSummary.processed}/{bulkSummary.received} · Inserted {bulkSummary.inserted} · Updated {bulkSummary.updated} · Skipped {bulkSummary.skipped}</Text> : null}

        <TextInput
          style={[styles.input, styles.area]}
          multiline
          value={bulkInput}
          onChangeText={setBulkInput}
          placeholder="Paste Excel table here..."
          placeholderTextColor="#71717a"
        />
        <Pressable style={styles.primaryBtn} onPress={handleBulkImport} disabled={bulkSaving}><Text style={styles.primaryText}>{bulkSaving ? 'Importing...' : 'Import Pasted Data'}</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.title}>Add Product Manually</Text>
        <Text style={styles.subtitle}>Same key fields as website product form.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}

        <Text style={styles.label}>Select Company</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {companies.map((c) => (
            <Pressable key={c._id} style={[styles.chip, companyId === c._id ? styles.chipActive : null]} onPress={() => setCompanyId(c._id)}>
              <Text style={[styles.chipText, companyId === c._id ? styles.chipTextActive : null]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {PRODUCT_CATEGORIES.map((c) => (
            <Pressable key={c.value} style={[styles.chip, form.category === c.value ? styles.chipActive : null]} onPress={() => setField('category', c.value)}>
              <Text style={[styles.chipText, form.category === c.value ? styles.chipTextActive : null]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Sub-Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {subCategories.map((s) => (
            <Pressable key={s} style={[styles.chip, form.subCategory === s ? styles.chipActive : null]} onPress={() => setField('subCategory', s)}>
              <Text style={[styles.chipText, form.subCategory === s ? styles.chipTextActive : null]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ marginTop: 10, gap: 8 }}>
          {FIELD_DEFS.map((f) => (
            <View key={f.key}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={[styles.input, f.multiline ? styles.area : null]}
                multiline={Boolean(f.multiline)}
                keyboardType={f.keyboardType || 'default'}
                value={String(form[f.key] ?? '')}
                onChangeText={(v) => setField(f.key, v)}
                placeholderTextColor="#71717a"
              />
            </View>
          ))}
        </View>

        <View style={styles.boolWrap}>
          {BOOL_DEFS.map((b) => (
            <View key={b.key} style={styles.boolRow}>
              <Text style={styles.boolLabel}>{b.label}</Text>
              <Switch value={Boolean(form[b.key])} onValueChange={(v) => setField(b.key, v)} />
            </View>
          ))}
        </View>

        <Pressable style={styles.primaryBtn} onPress={onSubmit} disabled={saving}><Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save Product'}</Text></Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  cardHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  ghostBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  ghostText: { color: '#111827', fontWeight: '600', fontSize: 12 },
  error: { marginTop: 8, color: '#b91c1c' },
  ok: { marginTop: 8, color: '#047857' },
  warn: { marginTop: 8, color: '#92400e' },
  label: { marginTop: 10, fontSize: 12, fontWeight: '600', color: '#374151' },
  input: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', color: '#111827' },
  area: { minHeight: 120, textAlignVertical: 'top' },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  chipText: { color: '#52525b', fontSize: 12 },
  chipTextActive: { color: '#047857', fontWeight: '700' },
  boolWrap: { marginTop: 10, gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  boolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  boolLabel: { fontSize: 12, color: '#374151', flex: 1, paddingRight: 6 },
  primaryBtn: { marginTop: 10, backgroundColor: '#059669', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});