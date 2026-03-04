import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const EMPTY_LINE = {
  productId: '',
  qty: '',
  toValue: '0',
  discValue: '0',
  extraValue: '0',
  bonsValue: '0',
  gstPer: '0',
  manufactureDate: '',
  expiryDate: '',
};

const EMPTY_FORM = {
  fromEntityName: '',
  toWarehouseId: '',
  extraDiscPer: '0',
  advTaxPer: '0',
  whTaxPer: '0',
  expense: '0',
  items: [{ ...EMPTY_LINE }],
};

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
  const sizeMultiplier = getSizeMultiplier(product);
  const qty = toNum(line.qty);
  const rate = toNum(product?.wholesalePrice || 0);
  const gross = sizeMultiplier * qty * rate;
  const toValue = toNum(line.toValue);
  const discValue = line.discValue === '' ? toNum(product?.discountPer || 0) : toNum(line.discValue);
  const extraValue = toNum(line.extraValue);
  const bonsValue = toNum(line.bonsValue);
  const v4gst = gross - toValue - discValue - extraValue - bonsValue;
  const gstPer = toNum(line.gstPer);
  const gstAmount = (v4gst * gstPer) / 100;
  const netAmt = v4gst + gstAmount;
  return { sizeText: product?.size || '-', sizeMultiplier, qty, rate, gross, toValue, discValue, extraValue, bonsValue, v4gst, gstPer, gstAmount, netAmt };
}

export default function PurchaseStockScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [invoiceRow, setInvoiceRow] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [productsRes, warehousesRes, txRes] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/warehouses'),
        apiClient.get('/inventory/transactions?transactionType=PURCHASING_STOCK'),
      ]);
      setProducts(productsRes.data?.products || []);
      setWarehouses(warehousesRes.data?.warehouses || []);
      setRows(txRes.data?.transactions || []);
    } catch (e) {
      setErr(e.message || 'Failed to load purchase stock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const lineRows = useMemo(() => form.items.map((line, idx) => {
    const product = products.find((p) => p._id === line.productId);
    return { idx, line, product, calc: computeLine(line, product) };
  }), [form.items, products]);

  const totalAmount = useMemo(() => lineRows.reduce((sum, r) => sum + r.calc.netAmt, 0), [lineRows]);
  const extraDiscAmt = useMemo(() => (totalAmount * toNum(form.extraDiscPer)) / 100, [totalAmount, form.extraDiscPer]);
  const advTaxAmt = useMemo(() => (totalAmount * toNum(form.advTaxPer)) / 100, [totalAmount, form.advTaxPer]);
  const whTaxAmt = useMemo(() => (totalAmount * toNum(form.whTaxPer)) / 100, [totalAmount, form.whTaxPer]);
  const grandTotal = useMemo(() => totalAmount - extraDiscAmt + advTaxAmt + whTaxAmt + toNum(form.expense), [totalAmount, extraDiscAmt, advTaxAmt, whTaxAmt, form.expense]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setItem = (i, k, v) => setForm((s) => ({ ...s, items: s.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));
  const addItem = () => setForm((s) => ({ ...s, items: [...s.items, { ...EMPTY_LINE }] }));
  const removeItem = (i) => setForm((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));

  const onSubmit = async () => {
    setSaving(true);
    setErr('');
    try {
      const toWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const normalizedItems = lineRows
        .filter((r) => r.product && r.calc.qty > 0)
        .map((r) => ({
          productId: r.product.productId,
          productName: r.product.name,
          cartonSize: `1x${r.calc.qty || 0}`,
          cartons: 1,
          totalPacks: r.calc.qty || 0,
          packsPerCarton: r.calc.qty || 0,
          onePackPrice: r.calc.rate,
          oneCartonPrice: r.calc.rate * r.calc.sizeMultiplier,
          totalPrice: r.calc.netAmt,
          unitPrice: r.calc.rate,
          manufactureDate: r.line.manufactureDate || undefined,
          expiryDate: r.line.expiryDate || undefined,
          notes: `gross:${r.calc.gross},to:${r.calc.toValue},disc:${r.calc.discValue},extra:${r.calc.extraValue},bons:${r.calc.bonsValue},v4gst:${r.calc.v4gst},gst:${r.calc.gstAmount},net:${r.calc.netAmt}`,
        }));

      if (!form.fromEntityName.trim() || !toWarehouse || !normalizedItems.length) {
        throw new Error('From, To (Warehouse), and at least one product row are required');
      }

      await apiClient.post('/inventory/transactions', {
        transactionType: 'PURCHASING_STOCK',
        warehouseId: toWarehouse.warehouseId || '',
        warehouseName: toWarehouse.name || '',
        fromEntityName: form.fromEntityName,
        toEntityName: toWarehouse.name || '',
        adjustment: 0,
        extraDiscPer: Number(form.extraDiscPer || 0),
        advTaxPer: Number(form.advTaxPer || 0),
        whTaxPer: Number(form.whTaxPer || 0),
        expense: Number(form.expense || 0),
        items: normalizedItems,
        subtotal: totalAmount,
        grandTotal,
      });

      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setErr(e.message || 'Failed to save purchase stock');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (id) => {
    Alert.alert('Delete', 'Delete this purchase stock entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/inventory/transactions/${id}`);
            await load();
          } catch (e) {
            setErr(e.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Purchasing Stock</Text>
        <Text style={styles.subtitle}>Same form and product detail flow as website purchasing stock.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Text style={styles.label}>From</Text>
        <TextInput style={styles.input} value={form.fromEntityName} onChangeText={(v) => setField('fromEntityName', v)} />
        <Text style={styles.label}>To (Warehouse)</Text>
        <SelectDropdown
          placeholder="Select warehouse"
          options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
          value={form.toWarehouseId}
          onPick={(v) => setField('toWarehouseId', v)}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.productTableWrap}>
            <View style={styles.headerRow}>
              {['Product Name', 'Size', 'Qty', 'Rate', 'Gross', 'T.O', 'Disc', 'Extra', 'Bons', 'V4GST', 'GST(%)', 'Net Amt', 'MFG Date', 'EXP Date', 'Action'].map((h) => (
                <Text key={h} style={[styles.headCell, h === 'Action' ? styles.colAction : styles.colData]}>{h}</Text>
              ))}
            </View>
            <View style={{ gap: 8, marginTop: 8 }}>
              {lineRows.map(({ idx, line, calc }) => (
                <View key={`line-${idx}`} style={styles.dataRow}>
                  <View style={styles.colData}>
                    <SelectDropdown
                      placeholder="Select product"
                      options={products.map((p) => ({ value: p._id, label: p.name }))}
                      value={line.productId}
                      onPick={(v) => setItem(idx, 'productId', v)}
                    />
                  </View>
                  <Text style={[styles.cell, styles.colData]}>{calc.sizeText}</Text>
                  <TextInput style={[styles.input, styles.colData]} keyboardType="numeric" value={line.qty} onChangeText={(v) => setItem(idx, 'qty', v)} />
                  <Text style={[styles.cell, styles.colData]}>{calc.rate.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.colData]}>{calc.gross.toFixed(2)}</Text>
                  <TextInput style={[styles.input, styles.colData]} keyboardType="numeric" value={line.toValue} onChangeText={(v) => setItem(idx, 'toValue', v)} />
                  <TextInput style={[styles.input, styles.colData]} keyboardType="numeric" value={line.discValue} onChangeText={(v) => setItem(idx, 'discValue', v)} />
                  <TextInput style={[styles.input, styles.colData]} keyboardType="numeric" value={line.extraValue} onChangeText={(v) => setItem(idx, 'extraValue', v)} />
                  <TextInput style={[styles.input, styles.colData]} keyboardType="numeric" value={line.bonsValue} onChangeText={(v) => setItem(idx, 'bonsValue', v)} />
                  <Text style={[styles.cell, styles.colData]}>{calc.v4gst.toFixed(2)}</Text>
                  <TextInput style={[styles.input, styles.colData]} keyboardType="numeric" value={line.gstPer} onChangeText={(v) => setItem(idx, 'gstPer', v)} />
                  <Text style={[styles.cell, styles.colData]}>{calc.netAmt.toFixed(2)}</Text>
                  <TextInput style={[styles.input, styles.colData]} placeholder="YYYY-MM-DD" value={line.manufactureDate} onChangeText={(v) => setItem(idx, 'manufactureDate', v)} />
                  <TextInput style={[styles.input, styles.colData]} placeholder="YYYY-MM-DD" value={line.expiryDate} onChangeText={(v) => setItem(idx, 'expiryDate', v)} />
                  <View style={styles.colAction}><Pressable style={styles.deleteBtn} onPress={() => removeItem(idx)}><Text style={styles.deleteText}>X</Text></Pressable></View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <Pressable style={styles.secondaryBtn} onPress={addItem}><Text style={styles.secondaryText}>+ Add product</Text></Pressable>

        <View style={styles.totalsWrap}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLine}>Total amount: <Text style={styles.bold}>{totalAmount.toFixed(2)}</Text></Text>
            <RowInput label="Extra Disc (%)" value={form.extraDiscPer} onChange={(v) => setField('extraDiscPer', v)} amount={extraDiscAmt} />
            <RowInput label="Adv Tax (%)" value={form.advTaxPer} onChange={(v) => setField('advTaxPer', v)} amount={advTaxAmt} />
            <RowInput label="W.H Tax (%)" value={form.whTaxPer} onChange={(v) => setField('whTaxPer', v)} amount={whTaxAmt} />
            <RowInput label="Expense" value={form.expense} onChange={(v) => setField('expense', v)} amount={toNum(form.expense)} />
          </View>
          <View style={styles.totalCard}><Text style={styles.grand}>Grand Total: {grandTotal.toFixed(2)}</Text></View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={onSubmit} disabled={saving}><Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save'}</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.ledgerTitle}>1 Purchasing Stock Ledger</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.ledgerWrap}>
            <View style={styles.headerRow}>
              {['Code', 'From', 'To', 'Date and Time', 'Grand Total', 'Action'].map((h) => (
                <Text key={h} style={[styles.headCell, h === 'Action' ? styles.colActionWide : styles.colDataWide]}>{h}</Text>
              ))}
            </View>
            <View style={{ gap: 8, marginTop: 8 }}>
              {rows.length === 0 ? <Text style={styles.help}>No purchasing stock found.</Text> : rows.map((r) => (
                <View key={r._id} style={styles.dataRow}>
                  <Text style={[styles.cell, styles.colDataWide]}>{r.transactionCode || '-'}</Text>
                  <Text style={[styles.cell, styles.colDataWide]}>{r.fromEntityName || '-'}</Text>
                  <Text style={[styles.cell, styles.colDataWide]}>{r.toEntityName || '-'}</Text>
                  <Text style={[styles.cell, styles.colDataWide]}>{r.transactionAt ? new Date(r.transactionAt).toLocaleString() : '-'}</Text>
                  <Text style={[styles.cell, styles.colDataWide]}>{Number(r.grandTotal || 0).toFixed(2)}</Text>
                  <View style={[styles.actionCell, styles.colActionWide]}>
                    <Pressable style={styles.actionBtn} onPress={() => setInvoiceRow(r)}><Text style={styles.actionText}>Invoice/Receipt</Text></Pressable>
                    <Pressable style={styles.deleteBtn} onPress={() => onDelete(r._id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>

      <InvoiceReceiptModal row={invoiceRow} onClose={() => setInvoiceRow(null)} />
    </ScrollView>
  );
}

function SelectDropdown({ placeholder, options, value, onPick }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <Pressable style={styles.dropdownBox} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.dropdownText : styles.dropdownPlaceholder}>{selected?.label || placeholder}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownModalCard}>
            <Text style={styles.modalTitle}>{placeholder}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map((o) => (
                <Pressable key={`${o.value}`} style={styles.dropdownOption} onPress={() => { onPick(o.value); setOpen(false); }}>
                  <Text style={[styles.dropdownText, value === o.value ? styles.dropdownTextActive : null]}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setOpen(false)}><Text style={styles.cancelText}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function InvoiceReceiptModal({ row, onClose }) {
  if (!row) return null;
  return (
    <Modal visible={Boolean(row)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.invoiceCard}>
          <Text style={styles.invoiceTitle}>Invoice / Receipt</Text>
          <Text style={styles.invoiceLine}>Code: {row.transactionCode || '-'}</Text>
          <Text style={styles.invoiceLine}>From: {row.fromEntityName || '-'}</Text>
          <Text style={styles.invoiceLine}>To: {row.toEntityName || '-'}</Text>
          <Text style={styles.invoiceLine}>Date: {row.transactionAt ? new Date(row.transactionAt).toLocaleString() : '-'}</Text>
          <Text style={styles.invoiceLine}>Subtotal: {Number(row.subtotal || 0).toFixed(2)}</Text>
          <Text style={styles.invoiceLine}>Extra Disc (%): {Number(row.extraDiscPer || 0).toFixed(2)}</Text>
          <Text style={styles.invoiceLine}>Adv Tax (%): {Number(row.advTaxPer || 0).toFixed(2)}</Text>
          <Text style={styles.invoiceLine}>W.H Tax (%): {Number(row.whTaxPer || 0).toFixed(2)}</Text>
          <Text style={styles.invoiceLine}>Expense: {Number(row.expense || 0).toFixed(2)}</Text>
          <Text style={styles.invoiceTotal}>Grand Total: {Number(row.grandTotal || 0).toFixed(2)}</Text>

          <Text style={[styles.invoiceTitle, { fontSize: 16, marginTop: 8 }]}>Items</Text>
          <ScrollView style={{ maxHeight: 220 }}>
            {(row.items || []).map((item, idx) => (
              <View key={`${item.productId}-${idx}`} style={styles.invoiceItem}>
                <Text style={styles.invoiceItemText}>{item.productName || item.productId || '-'}</Text>
                <Text style={styles.invoiceItemText}>Qty: {Number(item.totalPacks || 0)}</Text>
                <Text style={styles.invoiceItemText}>Rate: {Number(item.unitPrice || 0).toFixed(2)}</Text>
                <Text style={styles.invoiceItemText}>Amount: {Number(item.totalPrice || 0).toFixed(2)}</Text>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.primaryBtn} onPress={onClose}><Text style={styles.primaryText}>Close</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RowInput({ label, value, onChange, amount }) {
  return (
    <View style={styles.rowInput}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput style={styles.rowField} keyboardType="numeric" value={value} onChangeText={onChange} />
      <Text style={styles.rowAmount}>{Number(amount || 0).toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  label: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#374151' },
  input: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', color: '#111827', minWidth: 120 },
  productTableWrap: { minWidth: 2450 },
  ledgerWrap: { minWidth: 1200 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 },
  headCell: { fontSize: 12, fontWeight: '700', color: '#111827' },
  colData: { width: 150 },
  colAction: { width: 90 },
  colDataWide: { width: 180 },
  colActionWide: { width: 220 },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8, alignItems: 'center' },
  cell: { fontSize: 12, color: '#374151' },
  actionCell: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  secondaryBtn: { marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#a1a1aa', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  secondaryText: { color: '#111827', fontWeight: '700', fontSize: 12 },
  totalsWrap: { marginTop: 10, gap: 8 },
  totalCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  totalLine: { color: '#111827', fontSize: 13 },
  bold: { fontWeight: '700' },
  rowInput: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { width: 100, fontSize: 12, color: '#374151' },
  rowField: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fff', color: '#111827' },
  rowAmount: { width: 80, textAlign: 'right', fontSize: 12, color: '#111827' },
  grand: { textAlign: 'right', fontSize: 18, fontWeight: '700', color: '#111827' },
  primaryBtn: { marginTop: 10, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  ledgerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  actionBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fff' },
  actionText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  deleteBtn: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fef2f2' },
  deleteText: { color: '#991b1b', fontSize: 12, fontWeight: '700' },
  help: { color: '#6b7280' },
  dropdownBox: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 10 },
  dropdownPlaceholder: { color: '#9ca3af', fontSize: 13 },
  dropdownText: { color: '#111827', fontSize: 13 },
  dropdownTextActive: { color: '#047857', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  dropdownModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  dropdownOption: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 6 },
  cancelBtn: { marginTop: 8, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  invoiceCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, maxHeight: '92%' },
  invoiceTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  invoiceLine: { marginTop: 4, color: '#374151', fontSize: 13 },
  invoiceTotal: { marginTop: 6, color: '#111827', fontWeight: '700', fontSize: 15 },
  invoiceItem: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, marginTop: 6 },
  invoiceItemText: { color: '#374151', fontSize: 12 },
});
