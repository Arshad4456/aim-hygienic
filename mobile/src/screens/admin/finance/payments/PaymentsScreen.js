import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

function fmtAmount(n) { return Number(n || 0).toLocaleString(); }
function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const BASE_PRIMARY = { regionId: '', zoneId: '', territoryId: '', distributorId: '', warehouseId: '', amountTotal: '', payDate: '', returnDate: '', details: '' };
const BASE_SECONDARY = { regionId: '', zoneId: '', territoryId: '', distributorId: '', warehouseId: '', amountPaid: '', paidDate: '', primaryInvoiceNo: '', details: '' };

export default function PaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('primary');

  const [masters, setMasters] = useState({ regions: [], zones: [], territories: [], distributors: [], warehouses: [] });
  const [primaryLedger, setPrimaryLedger] = useState([]);
  const [secondaryLedger, setSecondaryLedger] = useState([]);
  const [primaryForm, setPrimaryForm] = useState(BASE_PRIMARY);
  const [secondaryForm, setSecondaryForm] = useState(BASE_SECONDARY);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const [m, p, s] = await Promise.all([apiClient.get('/payments/masters'), apiClient.get('/payments/primary'), apiClient.get('/payments/secondary')]);
      setMasters({
        regions: m?.data?.regions || [],
        zones: m?.data?.zones || [],
        territories: m?.data?.territories || [],
        distributors: m?.data?.distributors || [],
        warehouses: m?.data?.warehouses || [],
      });
      setPrimaryLedger(p?.data?.primaryPayments || []);
      setSecondaryLedger(s?.data?.secondaryPayments || []);
    } catch (e) { setErr(e.message || 'Failed to load payment management'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const primaryZones = useMemo(() => (masters.zones || []).filter((z) => !primaryForm.regionId || String(z.regionId) === String(primaryForm.regionId)), [masters.zones, primaryForm.regionId]);
  const primaryTerritories = useMemo(() => (masters.territories || []).filter((t) => !primaryForm.zoneId || String(t.zoneId) === String(primaryForm.zoneId)), [masters.territories, primaryForm.zoneId]);
  const primaryDistributors = useMemo(() => (masters.distributors || []).filter((d) => !primaryForm.territoryId || String(d.territoryId) === String(primaryForm.territoryId)), [masters.distributors, primaryForm.territoryId]);

  const secondaryZones = useMemo(() => (masters.zones || []).filter((z) => !secondaryForm.regionId || String(z.regionId) === String(secondaryForm.regionId)), [masters.zones, secondaryForm.regionId]);
  const secondaryTerritories = useMemo(() => (masters.territories || []).filter((t) => !secondaryForm.zoneId || String(t.zoneId) === String(secondaryForm.zoneId)), [masters.territories, secondaryForm.zoneId]);
  const secondaryDistributors = useMemo(() => (masters.distributors || []).filter((d) => !secondaryForm.territoryId || String(d.territoryId) === String(secondaryForm.territoryId)), [masters.distributors, secondaryForm.territoryId]);

  const matchingPrimaryInvoices = useMemo(() => {
    return primaryLedger.filter((row) => !secondaryForm.distributorId || String(row.businessUserId) === String(secondaryForm.distributorId) || String(row.distributorId) === String(secondaryForm.distributorId));
  }, [primaryLedger, secondaryForm.distributorId]);

  const savePrimary = async () => {
    setSaving(true); setErr('');
    try {
      await apiClient.post('/payments/primary', {
        ...primaryForm,
        businessUserId: primaryForm.distributorId,
        amountTotal: Number(primaryForm.amountTotal || 0),
      });
      setPrimaryForm(BASE_PRIMARY);
      await load();
    } catch (e) { setErr(e.message || 'Failed to save primary payment'); }
    finally { setSaving(false); }
  };

  const saveSecondary = async () => {
    setSaving(true); setErr('');
    try {
      await apiClient.post('/payments/secondary', { ...secondaryForm, amountPaid: Number(secondaryForm.amountPaid || 0) });
      setSecondaryForm(BASE_SECONDARY);
      await load();
    } catch (e) { setErr(e.message || 'Failed to save secondary payment'); }
    finally { setSaving(false); }
  };

  const deletePrimary = (id) => Alert.alert('Delete', 'Delete this primary payment?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await apiClient.delete(`/payments/primary/${id}`); await load(); } catch (e) { setErr(e.message || 'Failed to delete primary payment'); } } },
  ]);

  const deleteSecondary = (id) => Alert.alert('Delete', 'Delete this secondary payment?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await apiClient.delete(`/payments/secondary/${id}`); await load(); } catch (e) { setErr(e.message || 'Failed to delete secondary payment'); } } },
  ]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Payment Management</Text>
        <Text style={styles.subtitle}>Manage primary and secondary payments with ledgers.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <View style={styles.tabRow}>
          <Tab label="Primary Payment" active={tab === 'primary'} onPress={() => setTab('primary')} />
          <Tab label="Secondary Payment" active={tab === 'secondary'} onPress={() => setTab('secondary')} />
        </View>
      </Card>

      {tab === 'primary' ? (
        <>
          <Card>
            <Text style={styles.h2}>Primary Payment</Text>
            <Selector title="Region" value={primaryForm.regionId} items={(masters.regions || []).map((r) => [r._id, r.name])} onChange={(v) => setPrimaryForm((s) => ({ ...s, regionId: v, zoneId: '', territoryId: '', distributorId: '' }))} />
            <Selector title="Zone" value={primaryForm.zoneId} items={primaryZones.map((z) => [z._id, z.name])} onChange={(v) => setPrimaryForm((s) => ({ ...s, zoneId: v, territoryId: '', distributorId: '' }))} />
            <Selector title="Territory" value={primaryForm.territoryId} items={primaryTerritories.map((t) => [t._id, t.name])} onChange={(v) => setPrimaryForm((s) => ({ ...s, territoryId: v, distributorId: '' }))} />
            <Selector title="Distributor Name" value={primaryForm.distributorId} items={primaryDistributors.map((d) => [d._id, d.fullName || d.name || d.username])} onChange={(v) => setPrimaryForm((s) => ({ ...s, distributorId: v }))} />
            <Selector title="Warehouse Name" value={primaryForm.warehouseId} items={(masters.warehouses || []).map((w) => [w._id, w.name])} onChange={(v) => setPrimaryForm((s) => ({ ...s, warehouseId: v }))} />
            <Input label="Amount Total" value={primaryForm.amountTotal} onChangeText={(v) => setPrimaryForm((s) => ({ ...s, amountTotal: v }))} keyboardType="numeric" />
            <DatePickerField label="Pay Date" value={primaryForm.payDate} onChange={(v) => setPrimaryForm((s) => ({ ...s, payDate: v }))} />
            <DatePickerField label="Return Date" value={primaryForm.returnDate} onChange={(v) => setPrimaryForm((s) => ({ ...s, returnDate: v }))} />
            <Input label="Details" value={primaryForm.details} onChangeText={(v) => setPrimaryForm((s) => ({ ...s, details: v }))} multiline />
            <Pressable style={styles.btn} onPress={savePrimary} disabled={saving}><Text style={styles.btnTx}>{saving ? 'Saving...' : 'Save Payment'}</Text></Pressable>
          </Card>

          <Card>
            <Text style={styles.h2}>Primary Payment Ledger</Text>
            <ScrollView horizontal>
              <View style={styles.table}>
                <Row head cols={['Invoice-No', 'Amount', 'Pay Date', 'Return Date', 'Receipt', 'Action']} />
                {primaryLedger.map((row) => (
                  <View key={row._id} style={styles.tRow}>
                    <Text style={styles.tCell}>{row.invoiceNo || '-'}</Text>
                    <Text style={styles.tCell}>{fmtAmount(row.amountTotal)}</Text>
                    <Text style={styles.tCell}>{String(row.payDate || '').slice(0, 10)}</Text>
                    <Text style={styles.tCell}>{String(row.returnDate || '').slice(0, 10)}</Text>
                    <View style={styles.tCell}>
                      {(row.receiptUrl || row.attachmentUrl) ? <Pressable style={styles.btnAlt} onPress={() => Linking.openURL(row.receiptUrl || row.attachmentUrl)}><Text>Receipt</Text></Pressable> : <Text>-</Text>}
                    </View>
                    <View style={styles.tCell}><Pressable style={styles.btnDanger} onPress={() => deletePrimary(row._id)}><Text style={styles.btnDangerTx}>Delete</Text></Pressable></View>
                  </View>
                ))}
                {!primaryLedger.length ? <Text style={styles.empty}>No primary payments yet.</Text> : null}
              </View>
            </ScrollView>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <Text style={styles.h2}>Secondary Payment</Text>
            <Selector title="Region" value={secondaryForm.regionId} items={(masters.regions || []).map((r) => [r._id, r.name])} onChange={(v) => setSecondaryForm((s) => ({ ...s, regionId: v, zoneId: '', territoryId: '', distributorId: '' }))} />
            <Selector title="Zone" value={secondaryForm.zoneId} items={secondaryZones.map((z) => [z._id, z.name])} onChange={(v) => setSecondaryForm((s) => ({ ...s, zoneId: v, territoryId: '', distributorId: '' }))} />
            <Selector title="Territory" value={secondaryForm.territoryId} items={secondaryTerritories.map((t) => [t._id, t.name])} onChange={(v) => setSecondaryForm((s) => ({ ...s, territoryId: v, distributorId: '' }))} />
            <Selector title="Distributor" value={secondaryForm.distributorId} items={secondaryDistributors.map((d) => [d._id, d.fullName || d.name || d.username])} onChange={(v) => setSecondaryForm((s) => ({ ...s, distributorId: v }))} />
            <Selector title="Warehouse" value={secondaryForm.warehouseId} items={(masters.warehouses || []).map((w) => [w._id, w.name])} onChange={(v) => setSecondaryForm((s) => ({ ...s, warehouseId: v }))} />
            <Input label="Amount Paid" value={secondaryForm.amountPaid} onChangeText={(v) => setSecondaryForm((s) => ({ ...s, amountPaid: v }))} keyboardType="numeric" />
            <DatePickerField label="Date of Paid" value={secondaryForm.paidDate} onChange={(v) => setSecondaryForm((s) => ({ ...s, paidDate: v }))} />
            <Selector title="Invoice-No of Primary Payment" value={secondaryForm.primaryInvoiceNo} items={matchingPrimaryInvoices.map((item) => [item.invoiceNo, `${item.invoiceNo} (Remaining: ${fmtAmount(item.amountRemaining)})`])} onChange={(v) => setSecondaryForm((s) => ({ ...s, primaryInvoiceNo: v }))} />
            <Input label="Detail of Payment" value={secondaryForm.details} onChangeText={(v) => setSecondaryForm((s) => ({ ...s, details: v }))} multiline />
            <Pressable style={styles.btn} onPress={saveSecondary} disabled={saving}><Text style={styles.btnTx}>{saving ? 'Saving...' : 'Save Payment'}</Text></Pressable>
          </Card>

          <Card>
            <Text style={styles.h2}>Secondary Payment Ledger</Text>
            <ScrollView horizontal>
              <View style={styles.table}>
                <Row head cols={['Invoice-No', 'Paid Amount', 'Date', 'Receipt', 'Action']} />
                {secondaryLedger.map((row) => (
                  <View key={row._id} style={styles.tRow}>
                    <Text style={styles.tCell}>{row.primaryInvoiceNo || '-'}</Text>
                    <Text style={styles.tCell}>{fmtAmount(row.amountPaid)}</Text>
                    <Text style={styles.tCell}>{String(row.paidDate || '').slice(0, 10)}</Text>
                    <View style={styles.tCell}>
                      {(row.receiptUrl || row.attachmentUrl) ? <Pressable style={styles.btnAlt} onPress={() => Linking.openURL(row.receiptUrl || row.attachmentUrl)}><Text>Receipt</Text></Pressable> : <Text>-</Text>}
                    </View>
                    <View style={styles.tCell}><Pressable style={styles.btnDanger} onPress={() => deleteSecondary(row._id)}><Text style={styles.btnDangerTx}>Delete</Text></Pressable></View>
                  </View>
                ))}
                {!secondaryLedger.length ? <Text style={styles.empty}>No secondary settlements yet.</Text> : null}
              </View>
            </ScrollView>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function DatePickerField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(value ? new Date(value) : new Date());
  const days = useMemo(() => {
    const y = cursor.getFullYear(); const m = cursor.getMonth();
    const first = new Date(y, m, 1); const start = first.getDay(); const total = new Date(y, m + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < start; i += 1) arr.push(null);
    for (let d = 1; d <= total; d += 1) arr.push(new Date(y, m, d));
    return arr;
  }, [cursor]);

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)}><Text>{value || 'Select date'}</Text></Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.monthRow}>
              <Pressable onPress={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><Text>{'<'}</Text></Pressable>
              <Text style={styles.monthTitle}>{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
              <Pressable onPress={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><Text>{'>'}</Text></Pressable>
            </View>
            <View style={styles.daysGrid}>
              {days.map((d, idx) => (
                <Pressable key={`${idx}-${d ? d.getDate() : 'x'}`} style={[styles.dayCell, d && formatDateInput(d) === value ? styles.chipActive : null]} disabled={!d} onPress={() => { onChange(formatDateInput(d)); setOpen(false); }}>
                  <Text style={d && formatDateInput(d) === value ? styles.chipTx : null}>{d ? d.getDate() : ''}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.closeBtn} onPress={() => setOpen(false)}><Text>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Tab({ label, active, onPress }) { return <Pressable style={[styles.tab, active ? styles.tabActive : null]} onPress={onPress}><Text style={active ? styles.tabTxActive : styles.tabTx}>{label}</Text></Pressable>; }
function Input({ label, multiline, ...props }) { return <View style={{ marginBottom: 8 }}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline ? { minHeight: 72, textAlignVertical: 'top' } : null]} multiline={multiline} {...props} /></View>; }
function Selector({ title, value, items, onChange }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>{title}</Text>
      <ScrollView horizontal contentContainerStyle={styles.rowWrap}>
        {items.map(([v, l]) => <Pressable key={String(v)} style={[styles.chip, value === v ? styles.chipActive : null]} onPress={() => onChange(v)}><Text style={value === v ? styles.chipTx : null}>{l}</Text></Pressable>)}
        {!items.length ? <Text style={styles.hint}>No options</Text> : null}
      </ScrollView>
    </View>
  );
}
function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  err: { color: '#b91c1c', marginTop: 6 },
  h2: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  tabRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  tab: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f9fafb' },
  tabActive: { backgroundColor: '#fff', borderColor: '#a7f3d0' },
  tabTx: { color: '#52525b' },
  tabTxActive: { color: '#111827', fontWeight: '700' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  rowWrap: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  chipTx: { color: '#fff' },
  hint: { color: '#6b7280', paddingVertical: 8 },
  btn: { borderRadius: 10, backgroundColor: '#059669', paddingVertical: 10, alignItems: 'center' },
  btnTx: { color: '#fff', fontWeight: '700' },
  btnAlt: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', backgroundColor: '#fff' },
  btnDanger: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  btnDangerTx: { color: '#991b1b' },
  table: { minWidth: 980, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  tHead: { backgroundColor: '#f8fafc' },
  tCell: { width: 160, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  empty: { color: '#6b7280', padding: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthTitle: { fontWeight: '700' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  dayCell: { width: '14.285%', alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  closeBtn: { marginTop: 10, alignSelf: 'flex-end', borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});