import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const EMPTY_LINE = { productId: '', qty: '', toValue: '0', discValue: '0', extraValue: '0', bonsValue: '0', gstPer: '0', manufactureDate: '', expiryDate: '' };
const EMPTY_FORM = { warehouseId: '', extraDiscPer: '0', advTaxPer: '0', whTaxPer: '0', expense: '0', items: [{ ...EMPTY_LINE }] };

function toNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;'); }
function getSizeMultiplier(product) {
  if (!product) return 1;
  const nums = String(product.size || '').match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (nums.length) return nums.reduce((a, b) => a * b, 1);
  return toNum(product.packSize) > 0 ? toNum(product.packSize) : 1;
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
function buildInvoiceHtml(txn) {
  const logo = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:54px;height:54px;border-radius:10px;background:linear-gradient(135deg,#065f46,#10b981);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">AH</div>
      <div><div style="font-weight:700;font-size:16px;">AIM-HYGIENICS</div><div style="font-size:11px;color:#555;">PVT LIMITED</div></div>
    </div>`;
  const rows = (txn.items || []).map((i, idx) => {
    const parts = Object.fromEntries(String(i.notes || '').split(',').map((seg) => seg.split(':')));
    return `<tr><td>${idx + 1}</td><td>${escapeHtml(i.productName || '-')}</td><td>${toNum(i.totalPacks || 0)}</td><td>${toNum(i.onePackPrice || 0)}</td><td>${toNum(parts.gross || 0)}</td><td>${toNum(parts.to || 0)}</td><td>${toNum(parts.disc || 0)}</td><td>${toNum(parts.extra || 0)}</td><td>${toNum(parts.bons || 0)}</td><td>${toNum(parts.v4gst || 0)}</td><td>${toNum(parts.gst || 0)}</td><td>${toNum(parts.net || i.totalPrice || 0)}</td></tr>`;
  });
  const lineTotal = (txn.items || []).reduce((sum, i) => {
    const parts = Object.fromEntries(String(i.notes || '').split(',').map((seg) => seg.split(':')));
    return sum + toNum(parts.net || i.totalPrice);
  }, 0);
  const totalAmount = toNum(txn.subtotal || lineTotal);
  const extraDiscPer = toNum(txn.extraDiscPer);
  const advTaxPer = toNum(txn.advTaxPer);
  const whTaxPer = toNum(txn.whTaxPer);
  const expense = toNum(txn.expense);
  const extraDiscAmt = (totalAmount * extraDiscPer) / 100;
  const advTaxAmt = (totalAmount * advTaxPer) / 100;
  const whTaxAmt = (totalAmount * whTaxPer) / 100;
  const calculatedGrandTotal = totalAmount - extraDiscAmt + advTaxAmt + whTaxAmt + expense;

  return `<html><body style="font-family: Arial; padding: 16px; position:relative;">
    <div style="display:flex;justify-content:space-between;align-items:center;">${logo}<div style="text-align:right;"><div style="font-size:13px;font-weight:700;">Damage Stock</div></div></div>
    <div style="margin-top:8px; display:flex; justify-content:space-between; font-size:12px;"><div>Date: ${escapeHtml(new Date(txn.transactionAt).toLocaleDateString())}</div><div>Invoice #: ${escapeHtml(txn.transactionCode || '-')}</div></div>
    <div style="margin-top:8px;font-size:12px;">Invoice From: ${escapeHtml(txn.fromEntityName || txn.warehouseName || '-')}</div>
    <div style="font-size:12px;">Bill To: ${escapeHtml(txn.toEntityName || 'Damage Stock')}</div>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%; margin-top:10px; font-size:12px;">
      <thead><tr><th>#</th><th>Product Name</th><th>Qty</th><th>Rate</th><th>Gross</th><th>TO</th><th>Disc</th><th>Extra</th><th>Bons</th><th>V4GST</th><th>GST</th><th>Net Amt</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
    <div style="margin-top:12px; font-size:12px; display:flex; justify-content:flex-end;"><div style="min-width:280px;">
      <div style="display:flex; justify-content:space-between;"><span>Total Amount:</span><strong>${totalAmount.toFixed(2)}</strong></div>
      <div style="display:flex; justify-content:space-between;"><span>Extra Disc (${extraDiscPer}%):</span><span>${extraDiscAmt.toFixed(2)}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>Adv Tax (${advTaxPer}%):</span><span>${advTaxAmt.toFixed(2)}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>W.H Tax (${whTaxPer}%):</span><span>${whTaxAmt.toFixed(2)}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>Expense:</span><span>${expense.toFixed(2)}</span></div>
      <div style="display:flex; justify-content:space-between; margin-top:4px; border-top:1px solid #ccc; padding-top:4px;"><span><strong>Grand Total:</strong></span><strong>${toNum(txn.grandTotal || calculatedGrandTotal).toFixed(2)}</strong></div>
    </div></div>
    <div style="margin-top:16px;text-align:center;font-size:13px;font-weight:600;">Thank you for bussiness with us</div>
  </body></html>`;
}


export default function DamageStockScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [rows, setRows] = useState([]);
  const [nearExpiry, setNearExpiry] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [calendarPick, setCalendarPick] = useState(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const [productsRes, warehousesRes, txRes, nearRes] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/warehouses'),
        apiClient.get('/inventory/transactions?transactionType=DAMAGE_STOCK'),
        apiClient.get('/inventory/near-expiry-products'),
      ]);
      setProducts(productsRes.data?.products || []);
      setWarehouses(warehousesRes.data?.warehouses || []);
      setRows(txRes.data?.transactions || []);
      setNearExpiry(nearRes.data?.products || nearRes.data?.nearExpiryProducts || nearRes.data?.rows || []);
    } catch (e) { setErr(e.message || 'Failed to load damage stock'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const lineRows = useMemo(() => form.items.map((line, idx) => ({ idx, line, product: products.find((p) => p._id === line.productId), calc: computeLine(line, products.find((p) => p._id === line.productId)) })), [form.items, products]);
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
    setSaving(true); setErr('');
    try {
      const wh = warehouses.find((w) => w._id === form.warehouseId);
      const items = lineRows.filter((r) => r.product && r.calc.qty > 0).map((r) => ({
        productId: r.product.productId, productName: r.product.name, cartonSize: `1x${r.calc.qty || 0}`, cartons: 1, totalPacks: r.calc.qty || 0, packsPerCarton: r.calc.qty || 0,
        onePackPrice: r.calc.rate, oneCartonPrice: r.calc.rate * r.calc.sizeMultiplier, totalPrice: r.calc.netAmt, unitPrice: r.calc.rate,
        manufactureDate: r.line.manufactureDate || undefined, expiryDate: r.line.expiryDate || undefined,
        notes: `gross:${r.calc.gross},to:${r.calc.toValue},disc:${r.calc.discValue},extra:${r.calc.extraValue},bons:${r.calc.bonsValue},v4gst:${r.calc.v4gst},gst:${r.calc.gstAmount},net:${r.calc.netAmt}`,
      }));
      if (!wh || !items.length) throw new Error('Warehouse and at least one item required');
      await apiClient.post('/inventory/transactions', {
        transactionType: 'DAMAGE_STOCK', warehouseId: wh.warehouseId || '', warehouseName: wh.name || '',
        fromEntityName: wh.name || '', toEntityName: 'Damage Stock',
        extraDiscPer: Number(form.extraDiscPer || 0), advTaxPer: Number(form.advTaxPer || 0), whTaxPer: Number(form.whTaxPer || 0), expense: Number(form.expense || 0),
        items, subtotal: totalAmount, grandTotal,
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (e) { setErr(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const onDelete = (id) => Alert.alert('Delete', 'Delete this damage stock entry?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await apiClient.delete(`/inventory/transactions/${id}`); await load(); } catch (e) { setErr(e.message || 'Failed'); } } },
  ]);

  const onInvoice = async (row) => {
    try { await Linking.openURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildInvoiceHtml(row))}`); }
    catch (_e) { Alert.alert('Invoice/Receipt', `Code: ${row.transactionCode || '-'}\nDate: ${row.transactionAt ? new Date(row.transactionAt).toLocaleString() : '-'}`); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Damage Stock</Text>
        <Text style={styles.subtitle}>Website-like damage stock form and ledger.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}
        <Text style={styles.label}>From (Warehouse)</Text>
        <SelectDropdown placeholder="Select warehouse" options={warehouses.map((w) => ({ value: w._id, label: w.name }))} value={form.warehouseId} onPick={(v) => setField('warehouseId', v)} />

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.productTableWrap}>
            <View style={styles.headerRow}>{['Product Name', 'Size', 'Qty', 'Rate', 'Gross', 'T.O', 'Disc', 'Extra', 'Bons', 'V4GST', 'GST(%)', 'Net Amt', 'MFG Date', 'EXP Date', 'Action'].map((h) => <Text key={h} style={[styles.headCell, h === 'Action' ? styles.colAction : styles.colData]}>{h}</Text>)}</View>
            <View style={{ gap: 8, marginTop: 8 }}>
              {lineRows.map(({ idx, line, calc }) => (
                <View key={`line-${idx}`} style={styles.dataRow}>
                  <View style={styles.colData}><SelectDropdown placeholder="Select product" options={products.map((p) => ({ value: p._id, label: p.name }))} value={line.productId} onPick={(v) => setItem(idx, 'productId', v)} /></View>
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
                  <DateField value={line.manufactureDate} onPress={() => setCalendarPick({ idx, key: 'manufactureDate', value: line.manufactureDate })} />
                  <DateField value={line.expiryDate} onPress={() => setCalendarPick({ idx, key: 'expiryDate', value: line.expiryDate })} />
                  <View style={styles.colAction}><Pressable style={styles.deleteBtn} onPress={() => removeItem(idx)}><Text style={styles.deleteText}>X</Text></Pressable></View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <Pressable style={styles.secondaryBtn} onPress={addItem}><Text style={styles.secondaryText}>+ Add product</Text></Pressable>
        <View style={styles.totalsWrap}>
          <Text style={styles.totalAmount}>Total amount: {totalAmount.toFixed(2)}</Text>
          <RowInput label="Extra Disc (%)" value={form.extraDiscPer} onChange={(v) => setField('extraDiscPer', v)} amount={extraDiscAmt} />
          <RowInput label="Adv Tax (%)" value={form.advTaxPer} onChange={(v) => setField('advTaxPer', v)} amount={advTaxAmt} />
          <RowInput label="W.H Tax (%)" value={form.whTaxPer} onChange={(v) => setField('whTaxPer', v)} amount={whTaxAmt} />
          <RowInput label="Expense" value={form.expense} onChange={(v) => setField('expense', v)} amount={toNum(form.expense)} />
          <Text style={styles.grand}>Grand Total: {grandTotal.toFixed(2)}</Text>
        </View>
        <Pressable style={styles.primaryBtn} onPress={onSubmit} disabled={saving}><Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save'}</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.ledgerTitle}>Near to expire products</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.nearWrap}>
            <View style={styles.headerRow}>{['Product Name', 'Quantity', 'Warehouse', 'Manufacture date', 'Expiry date'].map((h) => <Text key={h} style={[styles.headCell, styles.colNear]}>{h}</Text>)}</View>
            <View style={{ gap: 8, marginTop: 8 }}>{nearExpiry.length === 0 ? <Text style={styles.help}>No near-expiry products.</Text> : nearExpiry.map((r, i) => (
              <View key={`near-${i}`} style={styles.dataRow}>
                <Text style={[styles.cell, styles.colNear]}>{r.productName || '-'}</Text>
                <Text style={[styles.cell, styles.colNear]}>{r.quantity ?? 0}</Text>
                <Text style={[styles.cell, styles.colNear]}>{r.warehouseName || '-'}</Text>
                <Text style={[styles.cell, styles.colNear]}>{r.manufactureDate ? new Date(r.manufactureDate).toLocaleDateString() : '-'}</Text>
                <Text style={[styles.cell, styles.colNear]}>{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '-'}</Text>
              </View>
            ))}</View>
          </View>
        </ScrollView>
      </Card>

      <Card>
        <Text style={styles.ledgerTitle}>3 Damage Stock Ledger</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.ledgerWrap}>
            <View style={styles.headerRow}>{['Code', 'Date and Time', 'Action'].map((h) => <Text key={h} style={[styles.headCell, h === 'Action' ? styles.colActionWide : styles.colDataWide]}>{h}</Text>)}</View>
            <View style={{ gap: 8, marginTop: 8 }}>
              {rows.length === 0 ? <Text style={styles.help}>No damage stock found.</Text> : rows.map((r) => (
                <View key={r._id} style={styles.dataRow}>
                  <Text style={[styles.cell, styles.colDataWide]}>{r.transactionCode || '-'}</Text>
                  <Text style={[styles.cell, styles.colDataWide]}>{r.transactionAt ? new Date(r.transactionAt).toLocaleString() : '-'}</Text>
                  <View style={[styles.actionCell, styles.colActionWide]}>
                    <Pressable style={styles.actionBtn} onPress={() => onInvoice(r)}><Text style={styles.actionText}>Invoice/Receipt</Text></Pressable>
                    <Pressable style={styles.deleteBtn} onPress={() => onDelete(r._id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>

      <CalendarModal
        visible={Boolean(calendarPick)}
        value={calendarPick?.value || ''}
        onClose={() => setCalendarPick(null)}
        onSelect={(date) => {
          if (!calendarPick) return;
          setItem(calendarPick.idx, calendarPick.key, date);
          setCalendarPick(null);
        }}
      />

    </ScrollView>
  );
}

function SelectDropdown({ placeholder, options, value, onPick }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <Pressable style={styles.dropdownBox} onPress={() => setOpen(true)}><Text style={selected ? styles.dropdownText : styles.dropdownPlaceholder}>{selected?.label || placeholder}</Text></Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}><View style={styles.dropdownModalCard}><Text style={styles.modalTitle}>{placeholder}</Text><ScrollView style={{ maxHeight: 300 }}>{options.map((o) => <Pressable key={`${o.value}`} style={styles.dropdownOption} onPress={() => { onPick(o.value); setOpen(false); }}><Text style={[styles.dropdownText, value === o.value ? styles.dropdownTextActive : null]}>{o.label}</Text></Pressable>)}</ScrollView><Pressable style={styles.cancelBtn} onPress={() => setOpen(false)}><Text style={styles.cancelText}>Close</Text></Pressable></View></View>
      </Modal>
    </>
  );
}

function DateField({ value, onPress }) {
  return (
    <Pressable style={[styles.input, styles.colData]} onPress={onPress}>
      <Text style={value ? styles.dateValue : styles.datePlaceholder}>{value || 'Select date'}</Text>
    </Pressable>
  );
}

function CalendarModal({ visible, value, onClose, onSelect }) {
  const initial = value ? new Date(value) : new Date();
  const [month, setMonth] = useState(initial.getMonth());
  const [year, setYear] = useState(initial.getFullYear());
  useEffect(() => {
    if (!visible) return;
    const d = value ? new Date(value) : new Date();
    setMonth(d.getMonth());
    setYear(d.getFullYear());
  }, [visible, value]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.calendarCard}>
          <Text style={styles.modalTitle}>Pick Date</Text>
          <View style={styles.calNav}>
            <Pressable style={styles.navBtn} onPress={() => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }}><Text>{'<'}</Text></Pressable>
            <Text style={styles.calTitle}>{new Date(year, month, 1).toLocaleString('default', { month: 'long' })} {year}</Text>
            <Pressable style={styles.navBtn} onPress={() => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }}><Text>{'>'}</Text></Pressable>
          </View>
          <View style={styles.calGrid}>
            {['S','M','T','W','T','F','S'].map((d, idx) => <Text key={`day-${idx}-${d}`} style={styles.calHead}>{d}</Text>)}
            {cells.map((d, idx) => (
              <Pressable key={`${d}-${idx}`} disabled={!d} style={[styles.calCell, !d ? styles.calCellEmpty : null]} onPress={() => onSelect(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)}>
                <Text style={styles.calCellText}>{d || ''}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Close</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RowInput({ label, value, onChange, amount }) {
  return <View style={styles.rowInput}><Text style={styles.rowLabel}>{label}</Text><TextInput style={styles.rowField} keyboardType="numeric" value={value} onChangeText={onChange} /><Text style={styles.rowAmount}>{Number(amount || 0).toFixed(2)}</Text></View>;
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' }, title: { fontSize: 24, fontWeight: '700', color: '#111827' }, subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 }, error: { marginTop: 8, color: '#b91c1c' },
  label: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#374151' }, input: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', color: '#111827', minWidth: 120 },
  productTableWrap: { minWidth: 2450 }, ledgerWrap: { minWidth: 980 }, nearWrap: { minWidth: 980 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 }, headCell: { fontSize: 12, fontWeight: '700', color: '#111827' },
  colData: { width: 150 }, colAction: { width: 90 }, colDataWide: { width: 260 }, colActionWide: { width: 220 }, colNear: { width: 180 },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8, alignItems: 'center' }, cell: { fontSize: 12, color: '#374151' }, actionCell: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  secondaryBtn: { marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#a1a1aa', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' }, secondaryText: { color: '#111827', fontWeight: '700', fontSize: 12 },
  totalsWrap: { marginTop: 10, gap: 8 }, totalAmount: { color: '#111827', fontWeight: '700' }, rowInput: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }, rowLabel: { width: 110, fontSize: 12, color: '#374151' }, rowField: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fff', color: '#111827' }, rowAmount: { width: 90, textAlign: 'right', fontSize: 12, color: '#111827' },
  grand: { marginTop: 8, textAlign: 'right', fontSize: 18, fontWeight: '700', color: '#111827' }, primaryBtn: { marginTop: 10, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 11, alignItems: 'center' }, primaryText: { color: '#fff', fontWeight: '700' }, ledgerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' }, actionBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fff' }, actionText: { color: '#111827', fontSize: 12, fontWeight: '600' }, deleteBtn: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fef2f2' }, deleteText: { color: '#991b1b', fontSize: 12, fontWeight: '700' }, help: { color: '#6b7280' },
  dropdownBox: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 10 }, dropdownPlaceholder: { color: '#9ca3af', fontSize: 13 }, dropdownText: { color: '#111827', fontSize: 13 }, dropdownTextActive: { color: '#047857', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  dateValue: { color: '#111827', fontSize: 12 },
  datePlaceholder: { color: '#9ca3af', fontSize: 12 },
  calendarCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  calTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calHead: { width: '14.28%', textAlign: 'center', fontWeight: '700', color: '#6b7280', marginBottom: 6 },
  calCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  calCellEmpty: { opacity: 0.2 },
  calCellText: { color: '#111827' }, dropdownModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 }, modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 }, dropdownOption: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 6 }, cancelBtn: { marginTop: 8, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }, cancelText: { color: '#111827', fontWeight: '600' },
});