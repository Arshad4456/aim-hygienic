import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import ModalSelectField from '../../../ui/ModalSelectField';

const emptyLine = {
  productId: '',
  qty: '',
  toValue: '0',
  discValue: '0',
  extraValue: '0',
  bonsValue: '0',
  gstPer: '0',
};

function normalizeRole(value) {
  return String(value || '').toLowerCase().replace(/[^a-z]/g, '');
}

function resolveRequestRole(row) {
  return normalizeRole(row?.requestSourceRole || row?.fromEntityType || '');
}

function matchesDashboardRole(row, role) {
  const requestRole = resolveRequestRole(row);
  const targetRole = normalizeRole(role);
  if (!requestRole || !targetRole) return false;
  if (targetRole === 'brandmanager') return requestRole.includes('brandmanager') || requestRole === 'brand';
  if (targetRole === 'distributor') return requestRole.includes('distributor');
  return requestRole === targetRole;
}

function sourceRoleLabel(row) {
  const role = resolveRequestRole(row);
  if (role.includes('brandmanager') || role === 'brand') return 'Brand Manager';
  if (role.includes('distributor')) return 'Distributor';
  return row?.requestSourceRole || row?.fromEntityType || '-';
}

function normalizeRequestStatus(value) {
  const status = String(value || '').toUpperCase();
  return status === 'DISPATCH' ? 'DISPATCHED' : status;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getSizeMultiplier(product) {
  if (!product) return 1;
  const raw = String(product.size || '');
  const nums = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (nums.length) return nums.reduce((acc, n) => acc * n, 1);
  if (toNum(product.packSize) > 0) return toNum(product.packSize);
  return 1;
}

function computeLine(line, product) {
  const qty = toNum(line.qty);
  const rate = toNum(product?.wholesalePrice || 0);
  const gross = qty * rate;
  const toValue = toNum(line.toValue);
  const discountPer = toNum(line.discValue);
  const discValue = (gross * discountPer)/100;
  const extraValue = toNum(line.extraValue);
  // Convert bonsValue input into a percentage of gross
  const bonsPer = toNum(line.bonsValue); 
  const bonsValue = (gross * bonsPer) / 100;
  const v4gst = gross - toValue - discValue - extraValue - bonsValue;
  const gstPer = toNum(line.gstPer);
  const gstAmount = (v4gst * gstPer) / 100;
  const netAmt = v4gst + gstAmount;
  return { sizeText: product?.size || '-', qty, rate, gross, v4gst, gstAmount, netAmt };
}

export default function PrimaryOrderRequestScreen() {
  const role = 'Distributor';
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [requests, setRequests] = useState([]);
  const [me, setMe] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [previewRow, setPreviewRow] = useState(null);
  const [form, setForm] = useState({
    toWarehouseId: '',
    regionId: '',
    zoneId: '',
    territoryName: '',
    address: '',
    extraDiscPer: '0',
    advTaxPer: '0',
    whTaxPer: '0',
    expense: '0',
    items: [{ ...emptyLine }],
  });

  const selectedRegion = useMemo(() => regions.find((item) => item._id === form.regionId), [regions, form.regionId]);
  const selectedZone = useMemo(() => zones.find((item) => item._id === form.zoneId), [zones, form.zoneId]);

  const lineRows = useMemo(
    () =>
      form.items.map((line, idx) => {
        const product = products.find((p) => p._id === line.productId);
        return { idx, line, product, calc: computeLine(line, product) };
      }),
    [form.items, products]
  );

  const totalAmount = useMemo(() => lineRows.reduce((sum, row) => sum + row.calc.netAmt, 0), [lineRows]);
  const extraDiscAmt = useMemo(() => (totalAmount * toNum(form.extraDiscPer)) / 100, [totalAmount, form.extraDiscPer]);
  const advTaxAmt = useMemo(() => (totalAmount * toNum(form.advTaxPer)) / 100, [totalAmount, form.advTaxPer]);
  const whTaxAmt = useMemo(() => (totalAmount * toNum(form.whTaxPer)) / 100, [totalAmount, form.whTaxPer]);
  const grandTotal = useMemo(
    () => totalAmount - extraDiscAmt + advTaxAmt + whTaxAmt + toNum(form.expense),
    [totalAmount, extraDiscAmt, advTaxAmt, whTaxAmt, form.expense]
  );

  const visibleRequests = useMemo(() => {
    const myNames = [me?.businessName, me?.fullName]
      .filter(Boolean)
      .map((v) => String(v).trim().toLowerCase());

    return requests
      .filter((row) => {
        if (!row || row.transactionType !== 'SALE_STOCK') return false;
        if (matchesDashboardRole(row, role)) return true;
        const fromName = String(row.fromEntityName || '').trim().toLowerCase();
        return Boolean(fromName) && myNames.includes(fromName);
      })
      .sort(
        (a, b) =>
          new Date(b.transactionAt || b.createdAt || 0).getTime() -
          new Date(a.transactionAt || a.createdAt || 0).getTime()
      );
  }, [requests, me?.businessName, me?.fullName]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, pRes, rRes, zRes, meRes, txRes] = await Promise.all([
        apiClient.get('/warehouses'),
        apiClient.get('/products'),
        apiClient.get('/regions'),
        apiClient.get('/zones'),
        apiClient.get('/users/me'),
        apiClient.get('/inventory/transactions'),
      ]);

      const user = meRes?.data?.user || {};
      setMe(user);
      setWarehouses(wRes?.data?.warehouses || []);
      setProducts(pRes?.data?.products || []);
      setRegions(rRes?.data?.regions || []);
      setZones(zRes?.data?.zones || []);
      setRequests((txRes?.data?.transactions || []).filter((row) => row.transactionType === 'SALE_STOCK'));
      setForm((prev) => ({
        ...prev,
        regionId: prev.regionId || user?.regionId || '',
        zoneId: prev.zoneId || user?.zoneId || '',
        territoryName: prev.territoryName || user?.territoryName || user?.areaName || '',
        address: prev.address || user?.address || user?.shopAddress || '',
      }));
    } catch (e) {
      showToast('error', e.message || 'Failed to load order request module');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const setField = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  const setItem = (index, key, value) =>
    setForm((s) => ({ ...s, items: s.items.map((it, idx) => (idx === index ? { ...it, [key]: value } : it)) }));
  const addItem = () => setForm((s) => ({ ...s, items: [...s.items, { ...emptyLine }] }));

  const submitRequest = async () => {
    setSaving(true);
    try {
      const targetWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const normalizedItems = lineRows
        .filter((r) => r.product && r.calc.qty > 0)
        .map((r) => ({
          productId: r.product.productId,
          productName: r.product.name,
          cartonSize: `1x${r.calc.qty || 0}`,
          quantity: r.calc.qty,
          unitPrice: r.calc.rate,
          amount: r.calc.gross,
          stockValue: r.calc.gross,
          note: `to:${toNum(r.line.toValue)},disc:${toNum(r.line.discValue)},extra:${toNum(r.line.extraValue)},bons:${toNum(r.line.bonsValue)},v4gst:${r.calc.v4gst},gst:${r.calc.gstAmount},net:${r.calc.netAmt}`,
        }));

      if (!targetWarehouse || !normalizedItems.length) throw new Error('Select warehouse and at least one product row');

      await apiClient.post('/inventory/transactions', {
        transactionType: 'SALE_STOCK',
        warehouseId: targetWarehouse.warehouseId || '',
        warehouseName: targetWarehouse.name || '',
        fromEntityName: me?.businessName || me?.fullName || role,
        fromEntityType: 'DISTRIBUTOR',
        requestSourceRole: role,
        requestStatus: 'PENDING',
        toEntityType: 'DISTRIBUTOR',
        toEntityName: me?.businessName || me?.fullName || role,
        distributorName: me?.businessName || me?.fullName || '',
        brandName: '',
        regionId: selectedRegion?.regionId || me?.regionId || '',
        regionName: selectedRegion?.name || me?.regionName || '',
        zoneId: selectedZone?.zoneId || me?.zoneId || '',
        zoneName: selectedZone?.name || me?.zoneName || '',
        territory: form.territoryName,
        note: form.address,
        extraDiscPer: Number(form.extraDiscPer || 0),
        advTaxPer: Number(form.advTaxPer || 0),
        whTaxPer: Number(form.whTaxPer || 0),
        expense: Number(form.expense || 0),
        subtotal: totalAmount,
        grandTotal,
        items: normalizedItems,
      });

      showToast('success', 'Order request submitted successfully.');
      setForm((s) => ({ ...s, toWarehouseId: '', items: [{ ...emptyLine }] }));
      await loadAll();
    } catch (e) {
      showToast('error', e.message || 'Failed to submit order request');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {toast ? <Text style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>{toast.message}</Text> : null}

      <Card>
        <Text style={styles.title}>Primary Sale Order Request</Text>

        <Input label="From" value={me?.businessName || me?.fullName || '-'} editable={false} />
        <ModalSelectField
          label="To Warehouse"
          value={form.toWarehouseId}
          onChange={(v) => setField('toWarehouseId', v)}
          options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
          placeholder="Select warehouse"
        />
        <Input label="Region" value={selectedRegion?.name || me?.regionName || ''} editable={false} />
        <Input label="Zone" value={selectedZone?.name || me?.zoneName || ''} editable={false} />
        <Input label="Territory" value={form.territoryName} editable={false} />
        <Input label="Address" value={form.address} editable={false} />

        <Text style={styles.sectionTitle}>Product Detail</Text>
        <ScrollView horizontal>
          <View style={styles.tableWrap}>
            <Row
              head
              cols={['S.No', 'Product Name', 'Size', 'Qty', 'Rate', 'Gross', 'TO', 'Disc', 'Extra', 'Bons', 'V4GST', 'GST', 'Net Amt']}
            />
            {lineRows.map(({ idx, line, calc }) => (
              <View key={idx} style={styles.row}>
                <Text style={styles.cell}>{idx + 1}</Text>
                <View style={styles.cellWide}>
                  <ModalSelectField
                    compact
                    value={line.productId}
                    onChange={(v) => setItem(idx, 'productId', v)}
                    options={products.map((p) => ({ value: p._id, label: `${p.productId ? `${p.productId} • ` : ''}${p.name || p.productName || p._id}` }))}
                    placeholder="Select product"
                  />
                </View>
                <Text style={styles.cell}>{calc.sizeText}</Text>
                <View style={styles.cell}><InputBare value={line.qty} onChangeText={(v) => setItem(idx, 'qty', v)} numeric /></View>
                <Text style={styles.cell}>{calc.rate}</Text>
                <Text style={styles.cell}>{calc.gross.toFixed(2)}</Text>
                <Text style={styles.cell}>{line.toValue}</Text>
                <Text style={styles.cell}>{line.discValue}</Text>
                <Text style={styles.cell}>{line.extraValue}</Text>
                <Text style={styles.cell}>{line.bonsValue}</Text>
                <Text style={styles.cell}>{calc.v4gst.toFixed(2)}</Text>
                <Text style={styles.cell}>{line.gstPer}</Text>
                <Text style={styles.cell}>{calc.netAmt.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <Pressable style={styles.addBtn} onPress={addItem}><Text style={styles.addBtnText}>+ Add Product</Text></Pressable>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>Total amount: <Text style={styles.summaryStrong}>{totalAmount.toFixed(2)}</Text></Text>
          <Text style={styles.summaryText}>Extra Disc (%): {form.extraDiscPer} → {extraDiscAmt.toFixed(2)}</Text>
          <Text style={styles.summaryText}>Adv Tax (%): {form.advTaxPer} → {advTaxAmt.toFixed(2)}</Text>
          <Text style={styles.summaryText}>W.H Tax (%): {form.whTaxPer} → {whTaxAmt.toFixed(2)}</Text>
          <Text style={styles.summaryText}>Expense: {toNum(form.expense).toFixed(2)}</Text>
          <Text style={styles.grandTotal}>Grand Total: {grandTotal.toFixed(2)}</Text>
        </View>

        <Pressable style={[styles.submitBtn, saving ? styles.submitBtnDisabled : null]} disabled={saving} onPress={submitRequest}>
          <Text style={styles.submitBtnText}>{saving ? 'Submitting...' : 'Submit Request'}</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.title}>Order Requests</Text>
        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.reqTable}>
            <Row head cols={['Code', 'To', 'Date and Time', 'Status', 'Action']} />
            {visibleRequests.map((row) => (
              <View key={row._id} style={[styles.row, requestRowStyle(normalizeRequestStatus(row.requestStatus || row.status || 'PENDING'))]}>
                <Text style={styles.reqCell}>{row.transactionCode || '-'}</Text>
                <Text style={styles.reqCell}>{row.warehouseName || row.toEntityName || '-'}</Text>
                <Text style={styles.reqCell}>{row.transactionAt ? new Date(row.transactionAt).toLocaleString() : '-'}</Text>
                <Text style={styles.reqCell}>{normalizeRequestStatus(row.requestStatus || row.status || 'PENDING')}</Text>
                <View style={styles.reqCell}><Pressable style={styles.previewBtn} onPress={() => setPreviewRow(row)}><Text style={styles.previewBtnText}>Preview</Text></Pressable></View>
              </View>
            ))}
            {!visibleRequests.length ? <Text style={styles.empty}>No requests yet.</Text> : null}
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(previewRow)} transparent animationType="slide" onRequestClose={() => setPreviewRow(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Request Preview</Text>
              <Pressable style={styles.closeBtn} onPress={() => setPreviewRow(null)}><Text style={styles.closeText}>Close</Text></Pressable>
            </View>
            <View style={styles.modalBody}>
              <PreviewField label="Code" value={previewRow?.transactionCode || '-'} />
              <PreviewField label="From" value={previewRow?.fromEntityName || '-'} />
              <PreviewField label="To" value={previewRow?.warehouseName || previewRow?.toEntityName || '-'} />
              <PreviewField label="Source" value={sourceRoleLabel(previewRow)} />
              <PreviewField label="Date and Time" value={previewRow?.transactionAt ? new Date(previewRow.transactionAt).toLocaleString() : '-'} />
              <PreviewField label="Status" value={normalizeRequestStatus(previewRow?.requestStatus || previewRow?.status || 'PENDING')} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function requestRowStyle(status) {
  if (status === 'REJECTED') return styles.reqRejected;
  if (status === 'APPROVED' || status === 'DISPATCHED') return styles.reqApproved;
  if (status === 'DELIVERED') return styles.reqDelivered;
  return null;
}

function Input({ label, value, onChangeText, editable = true }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable ? styles.inputReadOnly : null]}
        value={value || ''}
        editable={editable}
        onChangeText={onChangeText}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

function InputBare({ value, onChangeText, numeric }) {
  return (
    <TextInput
      style={styles.inputBare}
      value={String(value ?? '')}
      onChangeText={onChangeText}
      keyboardType={numeric ? 'numeric' : 'default'}
      placeholderTextColor="#9ca3af"
    />
  );
}

function Row({ cols, head }) {
  return (
    <View style={[styles.row, head ? styles.headRow : null]}>
      {cols.map((c) => (
        <Text key={c} style={[styles.cell, head ? styles.headText : null]}>{c}</Text>
      ))}
    </View>
  );
}

function PreviewField({ label, value }) {
  return (
    <View style={styles.previewField}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={styles.previewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionTitle: { marginTop: 12, marginBottom: 8, fontSize: 15, fontWeight: '700', color: '#111827' },
  fieldWrap: { marginTop: 8 },
  label: { fontSize: 12, color: '#52525b', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: '#111827' },
  inputReadOnly: { backgroundColor: '#f4f4f5' },
  selectorWrap: { flexDirection: 'row', gap: 6 },
  selChip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  selChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  selText: { color: '#374151', fontSize: 11 },
  selTextActive: { color: '#fff' },
  tableWrap: { minWidth: 1500, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  reqTable: { minWidth: 900, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  headRow: { backgroundColor: '#f8fafc' },
  cell: { width: 110, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 11 },
  cellWide: { width: 210, paddingHorizontal: 6, paddingVertical: 6 },
  reqCell: { width: 170, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 12 },
  headText: { fontWeight: '700' },
  inputBare: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 5, minWidth: 70, color: '#111827', fontSize: 11 },
  addBtn: { marginTop: 8, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  summaryBox: { marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, gap: 4 },
  summaryText: { color: '#374151', fontSize: 12 },
  summaryStrong: { fontWeight: '700', color: '#111827' },
  grandTotal: { marginTop: 4, fontSize: 16, fontWeight: '700', color: '#111827' },
  submitBtn: { marginTop: 10, borderRadius: 10, backgroundColor: '#059669', alignItems: 'center', paddingVertical: 10 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  previewBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, alignSelf: 'flex-start' },
  previewBtnText: { fontSize: 11, color: '#111827', fontWeight: '600' },
  empty: { color: '#6b7280', fontSize: 12, padding: 10 },
  reqRejected: { backgroundColor: '#fef2f2' },
  reqApproved: { backgroundColor: '#eff6ff' },
  reqDelivered: { backgroundColor: '#ecfdf5' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 12 },
  modalCard: { borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden' },
  modalHead: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  closeBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  closeText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  modalBody: { padding: 14, gap: 10 },
  previewField: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  previewLabel: { color: '#6b7280', fontSize: 11 },
  previewValue: { marginTop: 2, color: '#111827', fontSize: 13, fontWeight: '600' },
  toast: { marginBottom: 10, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12 },
  toastSuccess: { backgroundColor: '#ecfdf5', borderColor: '#86efac', color: '#166534' },
  toastError: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' },
});