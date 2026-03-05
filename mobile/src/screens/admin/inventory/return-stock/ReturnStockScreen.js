import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const EMPTY_LINE = { productId: '', qty: '', toValue: '0', discValue: '0', extraValue: '0', bonsValue: '0', gstPer: '0', manufactureDate: '', expiryDate: '' };
const EMPTY_FORM = {
  toWarehouseId: '', regionId: '', zoneId: '', territoryName: '', fieldId: '', fromEntityType: 'BRAND',
  businessType: '', businessName: '', distributorName: '', address: '', extraDiscPer: '0', advTaxPer: '0', whTaxPer: '0', expense: '0', items: [{ ...EMPTY_LINE }],
};
const LEDGER_FILTERS = [
  { key: 'all', label: 'All Return Stock' },
  { key: 'brand', label: 'From Brand' },
  { key: 'distributor', label: 'From Distributor' },
];
function toNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function normalizeRequestStatus(value) { const s = String(value || '').toUpperCase(); return s === 'DISPATCH' ? 'DISPATCHED' : s; }

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

export default function ReturnStockScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  const [fields, setFields] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [ledgerFilter, setLedgerFilter] = useState('all');
  const [previewRow, setPreviewRow] = useState(null);
  const [calendarPick, setCalendarPick] = useState(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const [productsRes, warehousesRes, txRes, regionsRes, zonesRes, usersRes, fieldsRes] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/warehouses'),
        apiClient.get('/inventory/transactions?transactionType=RETURN_STOCK'),
        apiClient.get('/regions'),
        apiClient.get('/zones'),
        apiClient.get('/users'),
        apiClient.get('/fields?limit=500'),
      ]);
      setProducts(productsRes.data?.products || []);
      setWarehouses(warehousesRes.data?.warehouses || []);
      setRows(txRes.data?.transactions || []);
      setRegions(regionsRes.data?.regions || []);
      setZones(zonesRes.data?.zones || []);
      setUsers(usersRes.data?.users || []);
      setFields(fieldsRes.data?.fields || []);
    } catch (e) { setErr(e.message || 'Failed to load return stock'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const zoneOptions = useMemo(() => {
    const r = regions.find((x) => x._id === form.regionId);
    if (!r) return [];
    return zones.filter((z) => z.regionId === r.regionId || z.regionId === r._id);
  }, [regions, zones, form.regionId]);
  const territoriesForZone = useMemo(() => {
    const z = zones.find((x) => x._id === form.zoneId);
    if (!z) return [];
    return [...new Set(users.filter((u) => u.zoneId === z.zoneId || u.zoneName === z.name).map((u) => u.territoryName).filter(Boolean))];
  }, [zones, users, form.zoneId]);
  const fieldsForTerritory = useMemo(() => fields.filter((f) => {
    const regionMatch = !form.regionId || f.regionId === (regions.find((r) => r._id === form.regionId)?.regionId || '');
    const zoneMatch = !form.zoneId || f.zoneId === (zones.find((z) => z._id === form.zoneId)?.zoneId || '');
    const territoryMatch = !form.territoryName || f.territoryName === form.territoryName || f.areaName === form.territoryName;
    return regionMatch && zoneMatch && territoryMatch;
  }), [fields, form.regionId, form.zoneId, form.territoryName, regions, zones]);

  const distributors = useMemo(() => users.filter((u) => String(u.role || '').toLowerCase() === 'distributor'), [users]);
  const distributorsForTerritory = useMemo(() => distributors.filter((d) => !form.territoryName || d.territoryName === form.territoryName), [distributors, form.territoryName]);
  const brandManagers = useMemo(() => users.filter((u) => String(u.role || '').toLowerCase() === 'brand manager'), [users]);
  const businessTypes = useMemo(() => [...new Set(brandManagers.map((u) => String(u.businessType || '').trim()).filter(Boolean))], [brandManagers]);
  const brandBusinessUsers = useMemo(() => {
    const selectedField = fieldsForTerritory.find((f) => f._id === form.fieldId);
    return brandManagers.filter((u) => {
      const fieldMatch = !selectedField || u.fieldId === selectedField.fieldId || u.fieldName === selectedField.name;
      const typeMatch = !form.businessType || String(u.businessType || '').trim() === form.businessType;
      return fieldMatch && typeMatch;
    });
  }, [brandManagers, fieldsForTerritory, form.fieldId, form.businessType]);

  const lineRows = useMemo(() => form.items.map((line, idx) => ({ idx, line, product: products.find((p) => p._id === line.productId), calc: computeLine(line, products.find((p) => p._id === line.productId)) })), [form.items, products]);
  const totalAmount = useMemo(() => lineRows.reduce((sum, r) => sum + r.calc.netAmt, 0), [lineRows]);
  const extraDiscAmt = useMemo(() => (totalAmount * toNum(form.extraDiscPer)) / 100, [totalAmount, form.extraDiscPer]);
  const advTaxAmt = useMemo(() => (totalAmount * toNum(form.advTaxPer)) / 100, [totalAmount, form.advTaxPer]);
  const whTaxAmt = useMemo(() => (totalAmount * toNum(form.whTaxPer)) / 100, [totalAmount, form.whTaxPer]);
  const grandTotal = useMemo(() => totalAmount - extraDiscAmt + advTaxAmt + whTaxAmt + toNum(form.expense), [totalAmount, extraDiscAmt, advTaxAmt, whTaxAmt, form.expense]);

  const returnRequests = useMemo(() => rows.slice().sort((a, b) => new Date(b.transactionAt).getTime() - new Date(a.transactionAt).getTime()), [rows]);
  const ledgerRows = useMemo(() => {
    const processed = rows.filter((t) => String(t.requestStatus || 'APPROVED').toUpperCase() !== 'PENDING');
    if (ledgerFilter === 'all') return processed;
    const returnSourceType = ledgerFilter === 'brand' ? 'BRAND' : 'DISTRIBUTOR';
    return processed.filter((t) => {
      const storedType = String(t.fromEntityType || '').trim().toUpperCase();
      if (storedType) return storedType === returnSourceType;
      return ledgerFilter === 'brand' ? !t.distributorName : Boolean(t.distributorName);
    });
  }, [rows, ledgerFilter]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setItem = (i, k, v) => setForm((s) => ({ ...s, items: s.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));
  const addItem = () => setForm((s) => ({ ...s, items: [...s.items, { ...EMPTY_LINE }] }));
  const removeItem = (i) => setForm((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));

  const onSubmit = async () => {
    setSaving(true); setErr('');
    try {
      const toWh = warehouses.find((w) => w._id === form.toWarehouseId);
      const region = regions.find((r) => r._id === form.regionId);
      const zone = zones.find((z) => z._id === form.zoneId);
      const fieldObj = fieldsForTerritory.find((f) => f._id === form.fieldId);
      const items = lineRows.filter((r) => r.product && r.calc.qty > 0).map((r) => ({
        productId: r.product.productId, productName: r.product.name, cartonSize: `1x${r.calc.qty || 0}`, cartons: 1, totalPacks: r.calc.qty || 0, packsPerCarton: r.calc.qty || 0,
        onePackPrice: r.calc.rate, oneCartonPrice: r.calc.rate * r.calc.sizeMultiplier, totalPrice: r.calc.netAmt, unitPrice: r.calc.rate,
        manufactureDate: r.line.manufactureDate || undefined, expiryDate: r.line.expiryDate || undefined,
        notes: `gross:${r.calc.gross},to:${r.calc.toValue},disc:${r.calc.discValue},extra:${r.calc.extraValue},bons:${r.calc.bonsValue},v4gst:${r.calc.v4gst},gst:${r.calc.gstAmount},net:${r.calc.netAmt}`,
      }));
      const missingDates = items.some((i) => !i.manufactureDate || !i.expiryDate);
      if (missingDates) throw new Error('Manufacture date and expiry date are required for return stock items');
      if (!toWh || !items.length) throw new Error('Warehouse and at least one item required');

      const fromEntityName = form.fromEntityType === 'DISTRIBUTOR' ? form.distributorName : form.businessName;
      await apiClient.post('/inventory/transactions', {
        transactionType: 'RETURN_STOCK',
        warehouseId: toWh.warehouseId || '', warehouseName: toWh.name || '', toEntityName: toWh.name || '',
        fromEntityType: form.fromEntityType, fromEntityName,
        distributorName: form.fromEntityType === 'DISTRIBUTOR' ? form.distributorName : '',
        brandName: form.fromEntityType === 'BRAND' ? form.businessName : '',
        regionId: region?.regionId || '', regionName: region?.name || '', zoneId: zone?.zoneId || '', zoneName: zone?.name || '', territory: form.territoryName,
        fieldId: fieldObj?.fieldId || '', fieldName: fieldObj?.name || '', note: form.address,
        extraDiscPer: Number(form.extraDiscPer || 0), advTaxPer: Number(form.advTaxPer || 0), whTaxPer: Number(form.whTaxPer || 0), expense: Number(form.expense || 0),
        items, subtotal: totalAmount, grandTotal,
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (e) { setErr(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try { await apiClient.put(`/inventory/transactions/${id}/request-status`, { status }); await load(); }
    catch (e) { setErr(e.message || 'Failed to update status'); }
  };
  const markRead = async (id) => {
    try { await apiClient.put(`/inventory/transactions/${id}/mark-read`); await load(); }
    catch (e) { setErr(e.message || 'Failed to mark read'); }
  };

  const onDelete = (id) => Alert.alert('Delete', 'Delete this return stock entry?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await apiClient.delete(`/inventory/transactions/${id}`); await load(); } catch (e) { setErr(e.message || 'Failed'); } } },
  ]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Return Stock</Text>
        <Text style={styles.subtitle}>Website-like return stock form and ledger.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Text style={styles.label}>Return Mode</Text>
        <View style={styles.modeRow}>
          <Pressable style={[styles.modeBtn, form.fromEntityType === 'BRAND' ? styles.modeBtnActive : null]} onPress={() => setField('fromEntityType', 'BRAND')}><Text>From Brand</Text></Pressable>
          <Pressable style={[styles.modeBtn, form.fromEntityType === 'DISTRIBUTOR' ? styles.modeBtnActive : null]} onPress={() => setField('fromEntityType', 'DISTRIBUTOR')}><Text>From Distributor</Text></Pressable>
        </View>

        <Text style={styles.label}>To (Warehouse)</Text>
        <SelectDropdown placeholder="Select warehouse" options={warehouses.map((w) => ({ value: w._id, label: w.name }))} value={form.toWarehouseId} onPick={(v) => setField('toWarehouseId', v)} />
        <Text style={styles.label}>Region</Text>
        <SelectDropdown placeholder="Select region" options={regions.map((r) => ({ value: r._id, label: r.name }))} value={form.regionId} onPick={(v) => setField('regionId', v)} />
        <Text style={styles.label}>Zone</Text>
        <SelectDropdown placeholder="Select zone" options={zoneOptions.map((z) => ({ value: z._id, label: z.name }))} value={form.zoneId} onPick={(v) => setField('zoneId', v)} />
        <Text style={styles.label}>Territory</Text>
        <SelectDropdown placeholder="Select territory" options={territoriesForZone.map((t) => ({ value: t, label: t }))} value={form.territoryName} onPick={(v) => setField('territoryName', v)} />

        {form.fromEntityType === 'BRAND' ? (
          <>
            <Text style={styles.label}>Field</Text>
            <SelectDropdown placeholder="Select field" options={fieldsForTerritory.map((f) => ({ value: f._id, label: f.name }))} value={form.fieldId} onPick={(v) => { setField('fieldId', v); setField('businessType', ''); setField('businessName', ''); }} />
            <Text style={styles.label}>Bussiness Type</Text>
            <SelectDropdown placeholder="Select bussiness type" options={businessTypes.map((b) => ({ value: b, label: b }))} value={form.businessType} onPick={(v) => { setField('businessType', v); setField('businessName', ''); }} />
            <Text style={styles.label}>Bussiness Name</Text>
            <SelectDropdown placeholder="Select bussiness name" options={brandBusinessUsers.map((u) => ({ value: u.businessName || u.fullName || '', label: u.businessName || u.fullName || '-' })).filter((x) => x.value)} value={form.businessName} onPick={(v) => setField('businessName', v)} />
          </>
        ) : (
          <>
            <Text style={styles.label}>Distributor Name</Text>
            <SelectDropdown placeholder="Select distributor" options={distributorsForTerritory.map((u) => ({ value: u.businessName || u.fullName || '', label: u.businessName || u.fullName || '-' })).filter((x) => x.value)} value={form.distributorName} onPick={(v) => setField('distributorName', v)} />
          </>
        )}
        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} value={form.address} onChangeText={(v) => setField('address', v)} />

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
        <Text style={styles.ledgerTitle}>Requests Return Stocks</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.reqWrap}>
            <View style={styles.headerRow}>{['Code', 'From', 'Date and Time', 'Status', 'Unread', 'Action'].map((h) => <Text key={h} style={[styles.headCell, h === 'Action' ? styles.colActionReq : styles.colDataReq]}>{h}</Text>)}</View>
            <View style={{ gap: 8, marginTop: 8 }}>
              {returnRequests.length === 0 ? <Text style={styles.help}>No return requests.</Text> : returnRequests.map((r) => (
                <View key={r._id} style={styles.dataRow}>
                  <Text style={[styles.cell, styles.colDataReq]}>{r.transactionCode || '-'}</Text>
                  <Text style={[styles.cell, styles.colDataReq]}>{r.fromEntityName || '-'}</Text>
                  <Text style={[styles.cell, styles.colDataReq]}>{r.transactionAt ? new Date(r.transactionAt).toLocaleString() : '-'}</Text>
                  <Text style={[styles.cell, styles.colDataReq]}>{normalizeRequestStatus(r.requestStatus || 'PENDING')}</Text>
                  <Text style={[styles.cell, styles.colDataReq]}>{r.requestReadAt ? 'Read' : 'Unread'}</Text>
                  <View style={[styles.actionCell, styles.colActionReq]}>
                    <Pressable style={styles.actionBtn} onPress={() => markRead(r._id)}><Text style={styles.actionText}>Open</Text></Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => setPreviewRow(r)}><Text style={styles.actionText}>Preview</Text></Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => updateStatus(r._id, 'REJECTED')}><Text style={styles.actionText}>Reject</Text></Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => updateStatus(r._id, 'APPROVED')}><Text style={styles.actionText}>Approve</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>

      <Card>
        <Text style={styles.ledgerTitle}>4 Return Stock Ledger</Text>
        <View style={styles.modeRow}>{LEDGER_FILTERS.map((f) => <Pressable key={f.key} style={[styles.modeBtn, ledgerFilter === f.key ? styles.modeBtnActive : null]} onPress={() => setLedgerFilter(f.key)}><Text>{f.label}</Text></Pressable>)}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.ledgerWrap}>
            <View style={styles.headerRow}>{['Code', 'From', 'Distributor Name', 'Business Name', 'Date and Time', 'Action'].map((h) => <Text key={h} style={[styles.headCell, h === 'Action' ? styles.colActionWide : styles.colDataWide]}>{h}</Text>)}</View>
            <View style={{ gap: 8, marginTop: 8 }}>
              {ledgerRows.length === 0 ? <Text style={styles.help}>No return stock found.</Text> : ledgerRows.map((r) => (
                <View key={r._id} style={styles.dataRow}>
                  <Text style={[styles.cell, styles.colDataWide]}>{r.transactionCode || '-'}</Text>
                  <Text style={[styles.cell, styles.colDataWide]}>{r.fromEntityName || '-'}</Text>
                  <Text style={[styles.cell, styles.colDataWide]}>{String(r.fromEntityType || '').toUpperCase() === 'DISTRIBUTOR' ? (r.distributorName || r.fromEntityName || '-') : '-'}</Text>
                  <Text style={[styles.cell, styles.colDataWide]}>{String(r.fromEntityType || '').toUpperCase() === 'BRAND' ? (r.brandName || r.fromEntityName || '-') : '-'}</Text>
                  <Text style={[styles.cell, styles.colDataWide]}>{r.transactionAt ? new Date(r.transactionAt).toLocaleString() : '-'}</Text>
                  <View style={[styles.actionCell, styles.colActionWide]}>
                    <Pressable style={styles.actionBtn} onPress={() => setPreviewRow(r)}><Text style={styles.actionText}>Invoice/Receipt</Text></Pressable>
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

      <Modal visible={Boolean(previewRow)} transparent animationType="slide" onRequestClose={() => setPreviewRow(null)}>
        <View style={styles.modalOverlay}><View style={styles.dropdownModalCard}><Text style={styles.modalTitle}>Request Preview</Text>{previewRow ? <ScrollView style={{ maxHeight: 420 }}><Text style={styles.previewLine}>Code: {previewRow.transactionCode || '-'}</Text><Text style={styles.previewLine}>From: {previewRow.fromEntityName || '-'}</Text><Text style={styles.previewLine}>To: {previewRow.toEntityName || '-'}</Text><Text style={styles.previewLine}>Status: {normalizeRequestStatus(previewRow.requestStatus || 'PENDING')}</Text>{(previewRow.items || []).map((item, idx) => <View key={`${item.productId}-${idx}`} style={styles.previewItem}><Text style={styles.previewLine}>{idx + 1}. {item.productName || item.productId || '-'}</Text><Text style={styles.previewLine}>Qty: {Number(item.totalPacks || 0)} | Net: {Number(item.totalPrice || 0).toFixed(2)}</Text></View>)}</ScrollView> : null}<Pressable style={styles.cancelBtn} onPress={() => setPreviewRow(null)}><Text style={styles.cancelText}>Close</Text></Pressable></View></View>
      </Modal>
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
  productTableWrap: { minWidth: 2450 }, reqWrap: { minWidth: 1450 }, ledgerWrap: { minWidth: 1450 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 }, headCell: { fontSize: 12, fontWeight: '700', color: '#111827' },
  colData: { width: 150 }, colAction: { width: 90 }, colDataWide: { width: 200 }, colActionWide: { width: 220 }, colDataReq: { width: 180 }, colActionReq: { width: 360 },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8, alignItems: 'center' }, cell: { fontSize: 12, color: '#374151' }, actionCell: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  modeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }, modeBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fff' }, modeBtnActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  secondaryBtn: { marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#a1a1aa', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' }, secondaryText: { color: '#111827', fontWeight: '700', fontSize: 12 },
  totalsWrap: { marginTop: 10, gap: 8 }, totalAmount: { color: '#111827', fontWeight: '700' }, rowInput: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }, rowLabel: { width: 110, fontSize: 12, color: '#374151' }, rowField: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fff', color: '#111827' }, rowAmount: { width: 90, textAlign: 'right', fontSize: 12, color: '#111827' },
  grand: { marginTop: 8, textAlign: 'right', fontSize: 18, fontWeight: '700', color: '#111827' }, primaryBtn: { marginTop: 10, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 11, alignItems: 'center' }, primaryText: { color: '#fff', fontWeight: '700' }, ledgerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' }, actionBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fff' }, actionText: { color: '#111827', fontSize: 12, fontWeight: '600' }, deleteBtn: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#fef2f2' }, deleteText: { color: '#991b1b', fontSize: 12, fontWeight: '700' }, help: { color: '#6b7280' },
  dropdownBox: { marginTop: 4, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 10 }, dropdownPlaceholder: { color: '#9ca3af', fontSize: 13 }, dropdownText: { color: '#111827', fontSize: 13 }, dropdownTextActive: { color: '#047857', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }, dropdownModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 }, modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 }, dropdownOption: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 6 }, cancelBtn: { marginTop: 8, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }, cancelText: { color: '#111827', fontWeight: '600' },
  previewLine: { color: '#374151', fontSize: 13, marginTop: 4 }, previewItem: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, marginTop: 6, backgroundColor: '#fff' },
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
  calCellText: { color: '#111827' },
});
