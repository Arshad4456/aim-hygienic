import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  manufactureDate: '',
  expiryDate: '',
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ReturnStockScreen() {
  const role = 'Distributor';
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [requests, setRequests] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({
    toWarehouseId: '',
    regionId: '',
    zoneId: '',
    territoryName: '',
    address: '',
    items: [{ ...emptyLine }],
  });

  const showMsg = useCallback((type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, pRes, rRes, zRes, reqRes, meRes] = await Promise.all([
        apiClient.get('/warehouses'),
        apiClient.get('/products'),
        apiClient.get('/regions'),
        apiClient.get('/zones'),
        apiClient.get(`/inventory/transactions?transactionType=RETURN_STOCK&requestSourceRole=${encodeURIComponent(role)}`),
        apiClient.get('/users/me'),
      ]);

      const me = meRes?.data?.user || {};
      const allRegions = rRes?.data?.regions || [];
      const allZones = zRes?.data?.zones || [];
      const matchedRegion = allRegions.find((r) => r.regionId === me?.regionId || r.name === me?.regionName) || null;
      const matchedZone =
        allZones.find(
          (z) =>
            (z.zoneId === me?.zoneId || z.name === me?.zoneName) &&
            (!matchedRegion || z.regionId === matchedRegion.regionId)
        ) || null;

      setUser(me);
      setWarehouses(wRes?.data?.warehouses || []);
      setProducts(pRes?.data?.products || []);
      setRegions(allRegions);
      setZones(allZones);
      setRequests((reqRes?.data?.transactions || []).sort((a, b) => new Date(b.transactionAt) - new Date(a.transactionAt)));
      setForm((prev) => ({
        ...prev,
        regionId: matchedRegion?._id || '',
        zoneId: matchedZone?._id || '',
        territoryName: (me?.territoryName || me?.areaName || '').trim(),
        address: (me?.address || me?.shopAddress || '').trim(),
      }));
    } catch (e) {
      showMsg('error', e.message || 'Failed to load return stock module');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedRegion = useMemo(() => regions.find((r) => r._id === form.regionId) || null, [regions, form.regionId]);
  const selectedZone = useMemo(() => zones.find((z) => z._id === form.zoneId) || null, [zones, form.zoneId]);

  const setField = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  const setItem = (i, key, value) => setForm((s) => ({ ...s, items: s.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)) }));
  const addItem = () => setForm((s) => ({ ...s, items: [...s.items, { ...emptyLine }] }));
  const removeItem = (i) => setForm((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    setSaving(true);
    try {
      const toWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const region = regions.find((r) => r._id === form.regionId);
      const zone = zones.find((z) => z._id === form.zoneId);

      const rows = form.items
        .map((line) => ({ line, product: products.find((p) => p._id === line.productId) }))
        .filter((row) => row.product && toNum(row.line.qty) > 0);

      if (!toWarehouse || !rows.length) throw new Error('Please select warehouse and at least one valid product row.');
      if (rows.some(({ line }) => !line.manufactureDate || !line.expiryDate)) {
        throw new Error('Manufacture date and expiry date are required for all selected products.');
      }

      const items = rows.map(({ line, product }) => ({
        productId: product.productId,
        productName: product.name,
        cartonSize: `1x${toNum(line.qty)}`,
        cartons: 1,
        totalPacks: toNum(line.qty),
        packsPerCarton: toNum(line.qty),
        onePackPrice: toNum(product.wholesalePrice || 0),
        oneCartonPrice: toNum(product.wholesalePrice || 0),
        totalPrice: toNum(product.wholesalePrice || 0) * toNum(line.qty),
        unitPrice: toNum(product.wholesalePrice || 0),
        manufactureDate: line.manufactureDate,
        expiryDate: line.expiryDate,
        notes: 'gross:0,to:0,disc:0,extra:0,bons:0,v4gst:0,gst:0,net:0',
      }));

      const sourceName = (user?.businessName || user?.fullName || user?.username || '').trim();

      await apiClient.post('/inventory/transactions', {
        transactionType: 'RETURN_STOCK',
        warehouseId: toWarehouse.warehouseId,
        warehouseName: toWarehouse.name,
        fromEntityType: 'DISTRIBUTOR',
        fromEntityName: sourceName,
        distributorName: sourceName,
        brandName: '',
        toEntityName: toWarehouse.name,
        regionId: region?.regionId || '',
        regionName: region?.name || '',
        zoneId: zone?.zoneId || '',
        zoneName: zone?.name || '',
        territory: form.territoryName || '',
        note: form.address || '',
        requestSourceRole: role,
        requestStatus: 'PENDING',
        items,
      });

      showMsg('success', 'Return stock request submitted successfully.');
      setForm((s) => ({ ...s, toWarehouseId: '', items: [{ ...emptyLine }] }));
      await loadData();
    } catch (e) {
      showMsg('error', e.message || 'Failed to submit return stock request');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {msg ? <Text style={[styles.toast, msg.type === 'success' ? styles.toastSuccess : styles.toastError]}>{msg.text}</Text> : null}

      <Card>
        <Text style={styles.title}>Return Stock Request</Text>

        <Input label="From" value={user?.businessName || user?.fullName || '-'} editable={false} />
        <ModalSelectField
          label="To Warehouse"
          value={form.toWarehouseId}
          onChange={(v) => setField('toWarehouseId', v)}
          options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
          placeholder="Select warehouse"
        />
        <Input label="Region" value={selectedRegion?.name || ''} editable={false} />
        <Input label="Zone" value={selectedZone?.name || ''} editable={false} />
        <Input label="Territory" value={form.territoryName} editable={false} />
        <Input label="Address" value={form.address} editable={false} />

        <Text style={styles.sectionTitle}>Product Detail</Text>
        <ScrollView horizontal>
          <View style={styles.tableWrap}>
            <Row head cols={['Product', 'Qty', 'MFG Date', 'EXP Date', 'TO', 'Disc', 'Extra', 'Bons', 'GST%', 'Action']} />
            {form.items.map((line, idx) => (
              <View key={idx} style={styles.row}>
                <View style={styles.cellWide}>
                  <ModalSelectField
                    compact
                    value={line.productId}
                    onChange={(v) => setItem(idx, 'productId', v)}
                    options={products.map((p) => ({ value: p._id, label: `${p.productId ? `${p.productId} • ` : ''}${p.name || p.productName || p._id}` }))}
                    placeholder="Select product"
                  />
                </View>
                <View style={styles.cell}><InputBare value={line.qty} onChangeText={(v) => setItem(idx, 'qty', v)} numeric /></View>
                <View style={styles.cell}><InputBare value={line.manufactureDate} onChangeText={(v) => setItem(idx, 'manufactureDate', v)} /></View>
                <View style={styles.cell}><InputBare value={line.expiryDate} onChangeText={(v) => setItem(idx, 'expiryDate', v)} /></View>
                <Text style={styles.cell}>{line.toValue}</Text>
                <Text style={styles.cell}>{line.discValue}</Text>
                <Text style={styles.cell}>{line.extraValue}</Text>
                <Text style={styles.cell}>{line.bonsValue}</Text>
                <Text style={styles.cell}>{line.gstPer}</Text>
                <View style={styles.cell}>
                  <Pressable style={styles.removeBtn} onPress={() => removeItem(idx)}>
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <Pressable style={styles.addBtn} onPress={addItem}><Text style={styles.addBtnText}>+ Add Product</Text></Pressable>

        <Pressable style={[styles.submitBtn, saving ? styles.submitBtnDisabled : null]} disabled={saving} onPress={submit}>
          <Text style={styles.submitBtnText}>{saving ? 'Submitting...' : 'Submit Request'}</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.title}>Return Stock Requests</Text>
        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.reqTable}>
            <Row head cols={['Code', 'Date and Time', 'Status']} request />
            {requests.map((r) => {
              const status = String(r.requestStatus || 'APPROVED').toUpperCase();
              return (
                <View key={r._id} style={[styles.row, status === 'REJECTED' ? styles.reqRejected : status === 'APPROVED' ? styles.reqApproved : null]}>
                  <Text style={styles.reqCell}>{r.transactionCode}</Text>
                  <Text style={styles.reqCell}>{r.transactionAt ? new Date(r.transactionAt).toLocaleString() : '-'}</Text>
                  <Text style={styles.reqCell}>{status}</Text>
                </View>
              );
            })}
            {!requests.length ? <Text style={styles.empty}>No requests yet.</Text> : null}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function Input({ label, value, onChangeText, editable = true }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, !editable ? styles.inputReadOnly : null]} value={value || ''} editable={editable} onChangeText={onChangeText} />
    </View>
  );
}

function InputBare({ value, onChangeText, numeric }) {
  return <TextInput style={styles.inputBare} value={String(value ?? '')} onChangeText={onChangeText} keyboardType={numeric ? 'numeric' : 'default'} />;
}

function Row({ cols, head, request }) {
  return (
    <View style={[styles.row, head ? styles.headRow : null]}>
      {cols.map((c) => (
        <Text key={c} style={[request ? styles.reqCell : styles.cell, head ? styles.headText : null]}>{c}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionTitle: { marginTop: 10, marginBottom: 8, fontSize: 15, fontWeight: '700', color: '#111827' },
  fieldWrap: { marginTop: 8 },
  label: { fontSize: 12, color: '#52525b', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: '#111827' },
  inputReadOnly: { backgroundColor: '#f4f4f5' },
  selectorWrap: { flexDirection: 'row', gap: 6 },
  selChip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  selChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  selText: { color: '#374151', fontSize: 11 },
  selTextActive: { color: '#fff' },
  tableWrap: { minWidth: 1350, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  reqTable: { minWidth: 700, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  headRow: { backgroundColor: '#f8fafc' },
  cell: { width: 130, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 11 },
  cellWide: { width: 240, paddingHorizontal: 6, paddingVertical: 6 },
  reqCell: { width: 220, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 12 },
  headText: { fontWeight: '700' },
  inputBare: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 5, minWidth: 85, color: '#111827', fontSize: 11 },
  removeBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, alignSelf: 'flex-start' },
  removeBtnText: { fontSize: 11, color: '#111827' },
  addBtn: { marginTop: 8, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  submitBtn: { marginTop: 10, borderRadius: 10, backgroundColor: '#059669', alignItems: 'center', paddingVertical: 10 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  reqRejected: { backgroundColor: '#fef2f2' },
  reqApproved: { backgroundColor: '#eff6ff' },
  empty: { color: '#6b7280', fontSize: 12, padding: 10 },
  toast: { marginBottom: 10, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12 },
  toastSuccess: { backgroundColor: '#ecfdf5', borderColor: '#86efac', color: '#166534' },
  toastError: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' },
});