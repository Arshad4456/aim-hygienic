import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';
import Loader from '../../../../../../foundation/ui/Loader';
import ModalSelectField from '../../../../../../foundation/ui/ModalSelectField';
import OrderDocumentModal from '../../../../../../foundation/ui/OrderDocumentModal';
import { buildDistributorLookupParams, buildDistributorOptions as buildDistributorOptionsShared } from '../../../../../../foundation/utils/distributorOptions';
import { getInvoiceKey, mapReceiptsByInvoice } from '../../../../../../foundation/utils/orderDocuments';

const emptyLine = { productId: '', qty: '' };

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeLine(line, product) {
  const qty = toNum(line.qty);
  const rate = toNum(product?.wholesalePrice || 0);
  const gross = qty * rate;
  return {
    qty,
    rate,
    gross,
    toValue: 0,
    discValue: 0,
    extraValue: 0,
    bonsValue: 0,
    v4gst: gross,
    gstPer: 0,
    gst: 0,
    net: gross,
  };
}

function buildDistributorOptions(user, distributorUsers = []) {
  const fromDirectory = (distributorUsers || [])
    .map((item) => ({
      _id: String(item.userId || item._id || '').trim(),
      userId: String(item.userId || item._id || '').trim(),
      businessName: String(item.businessName || '').trim(),
      fullName: String(item.fullName || '').trim(),
      warehouseId: String(item.warehouseId || '').trim(),
      territoryName: String(item.territoryName || item.areaName || '').trim(),
    }))
    .filter((item) => item._id);

  const fallback = user
    ? [
        {
          _id: String(user.distributorId || user.distributorName || '').trim(),
          userId: String(user.distributorId || '').trim(),
          businessName: String(user.distributorName || '').trim(),
          fullName: String(user.distributorName || '').trim(),
          warehouseId: String(user.warehouseId || '').trim(),
          territoryName: String(user.territoryName || user.areaName || '').trim(),
        },
      ]
    : [];

  const options = [...fromDirectory, ...fallback].filter((item) => item?._id);
  const seen = new Set();
  return options.filter((item) => {
    if (seen.has(item._id)) return false;
    seen.add(item._id);
    return true;
  });
}

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'rejected') return styles.rowRejected;
  if (value === 'approved' || value === 'dispatched') return styles.rowApproved;
  return null;
}

export default function OrdersScreen() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState(null);
  const [previewRow, setPreviewRow] = useState(null);
  const [documentRow, setDocumentRow] = useState(null);
  const [receiptsByInvoice, setReceiptsByInvoice] = useState({});
  const [form, setForm] = useState({
    customerName: '',
    businessName: '',
    address: '',
    distributorId: '',
    items: [{ ...emptyLine }],
  });

  const notify = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErr('');
    let me = null;
    try {
      const meRes = await apiClient.get('/users/me');
      me = meRes?.data?.user || null;
    } catch (error) {
      const message = error?.message || 'Failed to load profile data';
      setErr(message);
      notify('error', message);
      setLoading(false);
      return;
    }

    const distributorLookup = buildDistributorLookupParams(me);

    const [productsResult, ordersResult, distributorsResult] = await Promise.allSettled([
      apiClient.get('/products'),
      apiClient.get('/orders/my?limit=200'),
      apiClient.get(`/users/distributors?${distributorLookup}`),
    ]);

    const productsData = productsResult.status === 'fulfilled' ? productsResult.value?.data?.products || [] : [];
    const myOrders = ordersResult.status === 'fulfilled' ? ordersResult.value?.data?.orders || [] : [];
    const distributorUsers = distributorsResult.status === 'fulfilled' ? distributorsResult.value?.data?.users || [] : [];

    if (productsResult.status === 'rejected') {
      const message = productsResult.reason?.message || 'Failed to load products';
      setErr(message);
      notify('error', message);
    } else if (ordersResult.status === 'rejected') {
      const message = ordersResult.reason?.message || 'Failed to load orders';
      setErr(message);
      notify('error', message);
    } else if (distributorsResult.status === 'rejected') {
      const message = distributorsResult.reason?.message || 'Failed to load distributors';
      setErr(message);
      notify('error', message);
    }

    const distributorOptions = buildDistributorOptionsShared(me, distributorUsers);
    const secondaryOrders = myOrders.filter((o) => String(o.saleType || '').toLowerCase() === 'secondary');

    let nextReceiptsByInvoice = {};
    const invoiceNos = secondaryOrders.map((o) => getInvoiceKey(o)).filter(Boolean);
    if (invoiceNos.length) {
      try {
        const receiptsRes = await apiClient.get(`/receipts?linkedInvoiceNo=${encodeURIComponent(invoiceNos.join(','))}`);
        nextReceiptsByInvoice = mapReceiptsByInvoice(receiptsRes?.data?.receipts || []);
      } catch (receiptError) {
        notify('error', receiptError?.message || 'Failed to load linked receipts');
      }
    }

    setUser(me);
    setProducts(productsData);
    setDistributors(distributorOptions);
    setOrders(secondaryOrders);
    setReceiptsByInvoice(nextReceiptsByInvoice);
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || me?.fullName || '',
      businessName: prev.businessName || me?.businessName || '',
      address: prev.address || me?.address || me?.shopAddress || '',
      distributorId: distributorOptions.some((d) => d._id === prev.distributorId) ? prev.distributorId : distributorOptions[0]?._id || '',
    }));
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const lines = useMemo(() => form.items.map((line) => {
    const product = products.find((p) => p._id === line.productId);
    return { line, product, calc: computeLine(line, product) };
  }), [form.items, products]);

  const total = useMemo(() => lines.reduce((sum, row) => sum + row.calc.net, 0), [lines]);

  const distributor = useMemo(() => distributors.find((d) => d._id === form.distributorId), [distributors, form.distributorId]);

  const setField = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  const setItem = (idx, key, value) => setForm((s) => ({
    ...s,
    items: s.items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)),
  }));
  const addItem = () => setForm((s) => ({ ...s, items: [...s.items, { ...emptyLine }] }));
  const removeItem = (idx) => setForm((s) => ({ ...s, items: s.items.filter((_, i) => i !== idx) }));

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      const rows = lines.filter((row) => row.line.productId && row.calc.qty > 0);
      if (!form.customerName.trim()) throw new Error('Customer Name is required.');
      if (!form.address.trim()) throw new Error('Address is required.');
      if (!distributor?._id) throw new Error('Distributor selection is required.');
      if (!rows.length) throw new Error('At least one product line is required.');

      const payload = {
        sourceType: 'ORDER_BOOKER',
        saleType: 'secondary',
        customerName: form.customerName,
        businessName: form.businessName,
        address: form.address,
        territoryId: distributor.territoryId || user?.territoryId || '',
        territoryName: distributor.territoryName || user?.territoryName || user?.areaName || '',
        toDistributorId: distributor.userId || distributor._id,
        toWarehouseId: distributor.warehouseId || '',
        items: rows.map((row) => ({
          productId: row.line.productId,
          quantity: row.calc.qty,
          unitPrice: row.calc.rate,
          grossAmount: row.calc.gross,
          toValue: row.calc.toValue,
          discValue: row.calc.discValue,
          extraValue: row.calc.extraValue,
          bonsValue: row.calc.bonsValue,
          valueBeforeGst: row.calc.v4gst,
          gstPercent: row.calc.gstPer,
          gstAmount: row.calc.gst,
          netAmount: row.calc.net,
        })),
      };

      await apiClient.post('/orders', payload);
      notify('success', 'Secondary sale request submitted.');
      setForm((s) => ({ ...s, items: [{ ...emptyLine }] }));
      await loadData();
    } catch (error) {
      const message = error?.message || 'Failed to submit request';
      setErr(message);
      notify('error', message);
    } finally {
      setSaving(false);
    }
  };

  const onInvoice = (order) => {
    setDocumentRow({ ...order, linkedReceipts: receiptsByInvoice[getInvoiceKey(order)] || [] });
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {toast ? <Text style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>{toast.message}</Text> : null}

      <Card>
        <Text style={styles.title}>Order Management</Text>
        <Text style={styles.subtitle}>Submit and review secondary sale requests.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <View style={styles.grid2}>
          <Input label="Customer Name" value={form.customerName} onChangeText={(v) => setField('customerName', v)} />
          <Input label="Business Name" value={form.businessName} onChangeText={(v) => setField('businessName', v)} />
          <View style={styles.full}><Input label="Address" value={form.address} onChangeText={(v) => setField('address', v)} multiline /></View>
          <View style={styles.full}>
            <ModalSelectField
              label="Distributor"
              value={form.distributorId}
              onChange={(v) => setField('distributorId', v)}
              options={distributors.map((d) => ({
                value: d._id,
                label: `${d.businessName || d.fullName || d._id} • ${d.territoryName || '-'} • ${d.warehouseName || d.warehouseId || '-'}`,
              }))}
              placeholder="Select distributor"
            />
          </View>
        </View>

        <View style={styles.box}>
          <Text style={styles.boxTitle}>Product Detail</Text>
          <ScrollView horizontal style={{ marginTop: 8 }}>
            <View style={styles.tableWrap}>
              <Row head cols={['S.No', 'Section', 'Product', 'Qty', 'Rate', 'Total', 'Action']} />
              {lines.map((row, idx) => (
                <View key={`line-${idx}`} style={styles.row}>
                  <Text style={styles.cell}>{idx + 1}</Text>
                  <Text style={styles.cell}>secondary</Text>
                  <View style={styles.cell}>
                    <ModalSelectField
                      compact
                      value={row.line.productId}
                      onChange={(v) => setItem(idx, 'productId', v)}
                      options={products.map((p) => ({ value: p._id, label: `${p.productId ? `${p.productId} • ` : ''}${p.name || p.productName || p._id}` }))}
                      placeholder="Select product"
                    />
                  </View>
                  <View style={styles.cell}><InputBare value={row.line.qty} onChangeText={(v) => setItem(idx, 'qty', v)} numeric /></View>
                  <Text style={styles.cell}>{row.calc.rate.toFixed(2)}</Text>
                  <Text style={styles.cell}>{row.calc.net.toFixed(2)}</Text>
                  <View style={styles.cell}>
                    <Pressable style={styles.deleteBtn} onPress={() => removeItem(idx)} disabled={form.items.length <= 1}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <Pressable style={styles.addBtn} onPress={addItem}><Text style={styles.addText}>+ Add Product</Text></Pressable>
          <View style={styles.totalBox}><Text style={styles.totalText}>Total Amount: {total.toFixed(2)}</Text></View>
        </View>

        <Pressable style={[styles.submitBtn, saving ? styles.submitDisabled : null]} onPress={submit} disabled={saving}>
          <Text style={styles.submitText}>{saving ? 'Submitting...' : 'Submit Request'}</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.title}>Booked Order list</Text>
        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.ordersTable}>
            <Row head cols={['Order-No', 'Source', 'Customer Name', 'Date/Time', 'Status', 'Action']} />
            {orders.map((o) => (
              <View key={o._id} style={[styles.row, statusTone(o.status)]}>
                <Text style={styles.orderCell}>{o.orderNo || '-'}</Text>
                <Text style={styles.orderCell}>{o.sourceType || '-'}</Text>
                <Text style={styles.orderCell}>{o.customerName || o.fromEntityName || '-'}</Text>
                <Text style={styles.orderCell}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</Text>
                <Text style={styles.orderCell}>{String(o.status || 'pending').toUpperCase()}</Text>
                <View style={[styles.orderCell, styles.actionRow]}>
                  <Pressable style={styles.previewBtn} onPress={() => setPreviewRow(o)}><Text style={styles.previewText}>Preview</Text></Pressable>
                  <Pressable style={styles.previewBtn} onPress={() => onInvoice(o)}><Text style={styles.previewText}>Receipt/Invoice</Text></Pressable>
                </View>
              </View>
            ))}
            {!orders.length ? <Text style={styles.empty}>No orders found.</Text> : null}
          </View>
        </ScrollView>
      </Card>

      <OrderDocumentModal
        visible={Boolean(documentRow)}
        onClose={() => setDocumentRow(null)}
        order={documentRow}
        receipts={documentRow?.linkedReceipts || []}
        variant="secondary"
      />

      <Modal visible={Boolean(previewRow)} transparent animationType="slide" onRequestClose={() => setPreviewRow(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Secondary Order Preview</Text>
              <Pressable style={styles.closeBtn} onPress={() => setPreviewRow(null)}><Text style={styles.closeText}>Close</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Field label="Order No" value={previewRow?.orderNo || '-'} />
              <Field label="Status" value={String(previewRow?.status || 'pending').toUpperCase()} />
              <Field label="Source" value={previewRow?.sourceType || '-'} />
              <Field label="Customer" value={previewRow?.customerName || previewRow?.fromEntityName || '-'} />
              <Field label="To" value={previewRow?.toWarehouseName || '-'} />
              <Field label="Date/Time" value={previewRow?.createdAt ? new Date(previewRow.createdAt).toLocaleString() : '-'} />
              <Field label="Linked Receipts" value={String((receiptsByInvoice[getInvoiceKey(previewRow)] || []).length)} />
              <Field label="Address" value={previewRow?.address || '-'} />
              <Field label="Notes" value={previewRow?.notes || '-'} />

              <View style={styles.box}>
                <Text style={styles.boxTitle}>Product Detail</Text>
                <ScrollView horizontal style={{ marginTop: 8 }}>
                  <View style={styles.productPreviewTable}>
                    <Row head cols={['S.No', 'Section', 'Product', 'Qty', 'Rate']} />
                    {(previewRow?.items || []).map((item, idx) => (
                      <View key={`${idx}-${item.productName || item.productCode || 'item'}`} style={styles.row}>
                        <Text style={styles.previewCell}>{idx + 1}</Text>
                        <Text style={styles.previewCell}>{item.section || previewRow?.saleType || 'secondary'}</Text>
                        <Text style={styles.previewCell}>{item.productName || item.productCode || '-'}</Text>
                        <Text style={styles.previewCell}>{item.quantity || 0}</Text>
                        <Text style={styles.previewCell}>{item.unitPrice || 0}</Text>
                      </View>
                    ))}
                    {!(previewRow?.items || []).length ? <Text style={styles.empty}>No products found.</Text> : null}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Input({ label, value, onChangeText, multiline = false }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.textarea : null]}
        value={String(value || '')}
        onChangeText={onChangeText}
        multiline={multiline}
      />
    </View>
  );
}

function InputBare({ value, onChangeText, numeric }) {
  return <TextInput style={styles.inputBare} value={String(value || '')} onChangeText={onChangeText} keyboardType={numeric ? 'numeric' : 'default'} />;
}

function Field({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
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

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26, gap: 12 },
  toast: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 12 },
  toastSuccess: { borderColor: '#86efac', backgroundColor: '#f0fdf4', color: '#166534' },
  toastError: { borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#b91c1c' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  error: { marginTop: 10, color: '#b91c1c', fontSize: 12 },
  grid2: { marginTop: 10, gap: 10 },
  full: { width: '100%' },
  inputWrap: { gap: 6 },
  label: { fontSize: 12, color: '#374151', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#111827', backgroundColor: '#fff' },
  textarea: { minHeight: 74, textAlignVertical: 'top' },
  selectorWrap: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { color: '#065f46', fontWeight: '700' },
  box: { marginTop: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, backgroundColor: '#fafafa' },
  boxTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  tableWrap: { minWidth: 820 },
  ordersTable: { minWidth: 860 },
  productPreviewTable: { minWidth: 680 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headRow: { backgroundColor: '#f3f4f6' },
  cell: { width: 116, paddingHorizontal: 8, paddingVertical: 10, fontSize: 12, color: '#111827' },
  headText: { fontWeight: '700', color: '#374151' },
  rowRejected: { backgroundColor: '#fef2f2' },
  rowApproved: { backgroundColor: '#ecfdf5' },
  inputBare: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, minWidth: 80, fontSize: 12, backgroundColor: '#fff' },
  addBtn: { marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  addText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  deleteBtn: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  deleteText: { fontSize: 11, color: '#b91c1c', fontWeight: '700' },
  totalBox: { marginTop: 10, alignSelf: 'flex-end', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  totalText: { fontSize: 12, color: '#111827', fontWeight: '700' },
  submitBtn: { marginTop: 12, backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start' },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  orderCell: { width: 140, paddingHorizontal: 8, paddingVertical: 10, fontSize: 12, color: '#111827' },
  actionRow: { flexDirection: 'row', gap: 6 },
  previewBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff' },
  previewText: { fontSize: 11, color: '#111827', fontWeight: '600' },
  empty: { padding: 10, color: '#6b7280', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 12 },
  modalCard: { maxHeight: '90%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  closeBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  closeText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  modalBody: { padding: 12, gap: 10 },
  field: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fafafa' },
  fieldLabel: { fontSize: 11, color: '#6b7280' },
  fieldValue: { marginTop: 2, fontSize: 13, color: '#111827', fontWeight: '600' },
  previewCell: { width: 130, paddingHorizontal: 8, paddingVertical: 10, fontSize: 12, color: '#111827' },
});