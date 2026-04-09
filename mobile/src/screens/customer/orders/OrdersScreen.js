import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import ModalSelectField from '../../../ui/ModalSelectField';
import OrderDocumentModal from '../../../ui/OrderDocumentModal';
import { buildDistributorLookupParams, buildDistributorOptions as buildDistributorOptionsShared } from '../../../utils/distributorOptions';
import { getInvoiceKey, mapReceiptsByInvoice } from '../../../utils/orderDocuments';

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

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'rejected') return styles.rowRejected;
  if (value === 'approved' || value === 'dispatched') return styles.rowApproved;
  return null;
}

export default function OrdersScreen() {
  const roleKey = 'customer';
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
      customerName: me?.fullName || me?.customerName || '',
      businessName: me?.businessName || '',
      address: me?.address || me?.shopAddress || '',
      distributorId: distributorOptions.some((d) => d._id === prev.distributorId) ? prev.distributorId : distributorOptions[0]?._id || '',
    }));
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const lines = useMemo(
    () =>
      form.items.map((line) => {
        const product = products.find((p) => p._id === line.productId);
        return { line, product, calc: computeLine(line, product) };
      }),
    [form.items, products]
  );

  const total = useMemo(() => lines.reduce((sum, row) => sum + row.calc.net, 0), [lines]);

  const distributor = useMemo(() => distributors.find((d) => d._id === form.distributorId), [distributors, form.distributorId]);

  const setField = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  const setItem = (idx, key, value) =>
    setForm((s) => ({ ...s, items: s.items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)) }));
  const addItem = () => setForm((s) => ({ ...s, items: [...s.items, { ...emptyLine }] }));
  const removeItem = (idx) => setForm((s) => ({ ...s, items: s.items.filter((_, i) => i !== idx) }));

  const openInvoiceReceipt = (order) => {
    setDocumentRow({ ...order, linkedReceipts: receiptsByInvoice[getInvoiceKey(order)] || [] });
  };

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      const rows = lines.filter((r) => r.product && r.calc.qty > 0);
      if (!distributor) throw new Error('Distributor is required. Please assign a distributor to this user.');
      if (!rows.length) throw new Error('Please add at least one product row.');

      const customerName = user?.fullName || user?.customerName || '';
      const businessName = user?.businessName || '';
      const address = user?.address || user?.shopAddress || '';

      const items = rows.map((r) => ({
        productName: r.product.name,
        productCode: r.product.productId,
        quantity: r.calc.qty,
        unitPrice: r.calc.rate,
        toValue: 0,
        discValue: 0,
        extraValue: 0,
        bonsValue: 0,
        gstPer: 0,
      }));

      await apiClient.post('/orders', {
        saleType: 'secondary',
        sourceType: roleKey,
        customerType: 'customer',
        customerName,
        fromEntityName: customerName,
        fromEntityRole: 'customer',
        distributorId: distributor.userId || distributor._id,
        toWarehouseId: distributor.warehouseId || '',
        toWarehouseName: distributor.businessName || distributor.fullName || '',
        regionId: user?.regionId || '',
        regionName: user?.regionName || '',
        zoneId: user?.zoneId || '',
        zoneName: user?.zoneName || '',
        territoryId: distributor?.territoryId || user?.territoryId || '',
        territoryName: distributor?.territoryName || user?.territoryName || user?.areaName || '',
        address,
        notes: `Business: ${businessName}`,
        items,
        totalAmount: total,
      });

      await loadData();
      notify('success', 'Order request submitted successfully.');
      setForm((s) => ({ ...s, items: [{ ...emptyLine }] }));
    } catch (e) {
      const message = e.message || 'Failed to submit request';
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
        <Text style={styles.subtitle}>Request secondary sale orders and track your order list.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <View style={styles.formGrid}>
          <Input label="Source" value="customer" readOnly />
          <Input label="Customer Name" value={form.customerName} readOnly />
          <Input label="Business Name" value={form.businessName} readOnly />
          <Input label="Address" value={form.address} readOnly />
          <Selector
            label="Distributor"
            value={form.distributorId}
            onChange={(v) => setField('distributorId', v)}
            options={distributors.map((d) => ({ value: d._id, label: `${d.businessName || d.fullName || 'Distributor'} • ${d.territoryName || '-'} • ${d.warehouseName || d.warehouseId || '-'}` }))}
          />
        </View>

        <Text style={styles.sectionTitle}>Product Detail</Text>
        <ScrollView horizontal>
          <View style={styles.tableWrap}>
            <Row head cols={['S.No', 'Product Name', 'Qty', 'Rate', 'Gross', 'TO', 'Disc', 'Extra', 'Bons', 'GST', 'Net Amt', 'Action']} />
            {lines.map(({ line, calc }, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={styles.cell}>{idx + 1}</Text>
                <View style={styles.productCellWrap}>
                  <ModalSelectField
                    compact
                    value={line.productId}
                    onChange={(v) => setItem(idx, 'productId', v)}
                    options={products.map((p) => ({ value: p._id, label: `${p.productId ? `${p.productId} • ` : ''}${p.name || p.productName || p._id}` }))}
                    placeholder="Select product"
                  />
                </View>
                <View style={styles.cell}><InputBare value={line.qty} onChangeText={(v) => setItem(idx, 'qty', v)} numeric /></View>
                <Text style={styles.cell}>{calc.rate}</Text>
                <Text style={styles.cell}>{calc.gross.toFixed(2)}</Text>
                <Text style={styles.cell}>0</Text>
                <Text style={styles.cell}>0</Text>
                <Text style={styles.cell}>0</Text>
                <Text style={styles.cell}>0</Text>
                <Text style={styles.cell}>0</Text>
                <Text style={styles.cell}>{calc.net.toFixed(2)}</Text>
                <View style={styles.cell}>
                  <Pressable style={styles.removeBtn} onPress={() => removeItem(idx)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomRow}>
          <Pressable style={styles.addBtn} onPress={addItem}><Text style={styles.addBtnText}>+ Add Product</Text></Pressable>
          <Text style={styles.total}>Total Amount: {total.toFixed(2)}</Text>
        </View>

        <Pressable style={[styles.submitBtn, saving ? styles.submitDisabled : null]} onPress={submit} disabled={saving}>
          <Text style={styles.submitText}>{saving ? 'Submitting...' : 'Submit Request'}</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.title}>Order List</Text>
        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.ordersTable}>
            <Row head cols={['Order-No', 'To', 'Date/Time', 'Status', 'Action']} />
            {orders.map((o) => (
              <View key={o._id} style={[styles.row, statusTone(o.status)]}>
                <Text style={styles.orderCell}>{o.orderNo || '-'}</Text>
                <Text style={styles.orderCell}>{o.toWarehouseName || '-'}</Text>
                <Text style={styles.orderCell}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</Text>
                <Text style={styles.orderCell}>{String(o.status || 'pending').toUpperCase()}</Text>
                <View style={styles.orderCell}>
                  <Pressable style={styles.previewBtn} onPress={() => setPreviewRow(o)}><Text style={styles.previewText}>Preview</Text></Pressable>
                  <Pressable style={styles.previewBtn} onPress={() => openInvoiceReceipt(o)}><Text style={styles.previewText}>Invoice/Receipt</Text></Pressable>
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

function Input({ label, value, readOnly }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, readOnly ? styles.readonly : null]} value={String(value || '')} editable={!readOnly} />
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
        <Text key={c} style={[styles.headCell, head ? styles.headText : null]}>{c}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 12 },
  error: { marginTop: 8, color: '#b91c1c', fontSize: 12 },
  formGrid: { marginTop: 10, gap: 8 },
  inputWrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#52525b' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: '#111827', backgroundColor: '#fff' },
  readonly: { backgroundColor: '#f4f4f5' },
  selectorWrap: { flexDirection: 'row', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: '#111827', backgroundColor: '#111827' },
  chipText: { fontSize: 11, color: '#374151' },
  chipTextActive: { color: '#fff' },
  sectionTitle: { marginTop: 10, marginBottom: 8, fontSize: 15, fontWeight: '700', color: '#111827' },
  tableWrap: { minWidth: 1450, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  ordersTable: { minWidth: 900, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  productPreviewTable: { minWidth: 750, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  headRow: { backgroundColor: '#f8fafc' },
  headCell: { width: 120, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 11 },
  headText: { fontWeight: '700' },
  cell: { width: 120, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 11 },
  orderCell: { width: 180, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 12 },
  orderActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewCell: { width: 150, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 11 },
  productCellWrap: { width: 220, paddingHorizontal: 6, paddingVertical: 6 },
  inputBare: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 5, minWidth: 75, color: '#111827', fontSize: 11 },
  removeBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, alignSelf: 'flex-start' },
  removeText: { fontSize: 11, color: '#111827' },
  bottomRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  addBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  total: { fontSize: 13, color: '#111827', fontWeight: '700' },
  submitBtn: { marginTop: 10, borderRadius: 10, backgroundColor: '#059669', alignItems: 'center', paddingVertical: 10 },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  previewBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, alignSelf: 'flex-start' },
  previewText: { fontSize: 11, fontWeight: '600', color: '#111827' },
  empty: { color: '#6b7280', fontSize: 12, padding: 10 },
  rowRejected: { backgroundColor: '#fef2f2' },
  rowApproved: { backgroundColor: '#eff6ff' },
  toast: { marginBottom: 10, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12 },
  toastSuccess: { backgroundColor: '#ecfdf5', borderColor: '#86efac', color: '#166534' },
  toastError: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'center', padding: 12 },
  modalCard: { maxHeight: '90%', borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden' },
  modalHead: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  closeText: { fontSize: 12, color: '#111827' },
  modalBody: { padding: 12, gap: 8 },
  field: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  fieldLabel: { fontSize: 11, color: '#6b7280' },
  fieldValue: { marginTop: 2, fontSize: 13, color: '#111827', fontWeight: '600' },
  box: { marginTop: 4, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  boxTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
});