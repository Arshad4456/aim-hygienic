import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

function fmtAmount(n) { return Number(n || 0).toLocaleString(); }

const BASE_PRIMARY = { regionId: '', zoneId: '', territoryId: '', fieldId: '', businessUserId: '', warehouseId: '', amountTotal: '', payDate: '', returnDate: '', details: '' };
const BASE_SECONDARY = { regionId: '', zoneId: '', territoryId: '', distributorId: '', warehouseId: '', amountPaid: '', paidDate: '', primaryInvoiceNo: '', details: '' };

export default function PaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('primary');

  const [masters, setMasters] = useState({ regions: [], zones: [], territories: [], fields: [], businessUsers: [], distributors: [], warehouses: [] });
  const [primaryLedger, setPrimaryLedger] = useState([]);
  const [secondaryLedger, setSecondaryLedger] = useState([]);
  const [primaryForm, setPrimaryForm] = useState(BASE_PRIMARY);
  const [secondaryForm, setSecondaryForm] = useState(BASE_SECONDARY);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const [m, p, s] = await Promise.all([apiClient.get('/payments/masters'), apiClient.get('/payments/primary'), apiClient.get('/payments/secondary')]);
      setMasters(m?.data || { regions: [], zones: [], territories: [], fields: [], businessUsers: [], distributors: [], warehouses: [] });
      setPrimaryLedger(p?.data?.primaryPayments || []);
      setSecondaryLedger(s?.data?.secondaryPayments || []);
    } catch (e) { setErr(e.message || 'Failed to load payment management'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const primaryZones = useMemo(() => (masters.zones || []).filter((z) => !primaryForm.regionId || z.regionId === primaryForm.regionId), [masters.zones, primaryForm.regionId]);
  const primaryTerritories = useMemo(() => (masters.territories || []).filter((t) => !primaryForm.zoneId || t.zoneId === primaryForm.zoneId), [masters.territories, primaryForm.zoneId]);
  const primaryFields = useMemo(() => (masters.fields || []).filter((f) => !primaryForm.territoryId || f.territoryId === primaryForm.territoryId), [masters.fields, primaryForm.territoryId]);
  const primaryUsers = useMemo(() => (masters.businessUsers || []).filter((u) => !primaryForm.fieldId || u.fieldId === primaryForm.fieldId), [masters.businessUsers, primaryForm.fieldId]);

  const secondaryZones = useMemo(() => (masters.zones || []).filter((z) => !secondaryForm.regionId || z.regionId === secondaryForm.regionId), [masters.zones, secondaryForm.regionId]);
  const secondaryTerritories = useMemo(() => (masters.territories || []).filter((t) => !secondaryForm.zoneId || t.zoneId === secondaryForm.zoneId), [masters.territories, secondaryForm.zoneId]);
  const secondaryDistributors = useMemo(() => (masters.distributors || []).filter((d) => !secondaryForm.territoryId || d.territoryId === secondaryForm.territoryId), [masters.distributors, secondaryForm.territoryId]);

  const matchingPrimaryInvoices = useMemo(() => {
    return primaryLedger.filter((row) => !secondaryForm.distributorId || String(row.businessUserId) === String(secondaryForm.distributorId) || String(row.distributorId) === String(secondaryForm.distributorId));
  }, [primaryLedger, secondaryForm.distributorId]);

  const savePrimary = async () => {
    setSaving(true); setErr('');
    try {
      await apiClient.post('/payments/primary', { ...primaryForm, amountTotal: Number(primaryForm.amountTotal || 0) });
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
        <View style={styles.tabRow}><Tab label="Primary Payment" active={tab === 'primary'} onPress={() => setTab('primary')} /><Tab label="Secondary Payment" active={tab === 'secondary'} onPress={() => setTab('secondary')} /></View>
      </Card>

      {tab === 'primary' ? (
        <>
          <Card>
            <Text style={styles.h2}>Primary Payment</Text>
            <Selector title="Region" value={primaryForm.regionId} items={(masters.regions || []).map((r) => [r._id, r.name])} onChange={(v) => setPrimaryForm((s) => ({ ...s, regionId: v, zoneId: '', territoryId: '', fieldId: '', businessUserId: '' }))} />
            <Selector title="Zone" value={primaryForm.zoneId} items={primaryZones.map((z) => [z._id, z.name])} onChange={(v) => setPrimaryForm((s) => ({ ...s, zoneId: v, territoryId: '', fieldId: '', businessUserId: '' }))} />
            <Selector title="Territory" value={primaryForm.territoryId} items={primaryTerritories.map((t) => [t._id, t.name])} onChange={(v) => setPrimaryForm((s) => ({ ...s, territoryId: v, fieldId: '', businessUserId: '' }))} />
            <Selector title="Field" value={primaryForm.fieldId} items={primaryFields.map((f) => [f._id, f.name])} onChange={(v) => setPrimaryForm((s) => ({ ...s, fieldId: v, businessUserId: '' }))} />
            <Selector title="Business User" value={primaryForm.businessUserId} items={primaryUsers.map((u) => [u._id, u.fullName || u.name || u.username])} onChange={(v) => setPrimaryForm((s) => ({ ...s, businessUserId: v }))} />
            <Selector title="Warehouse" value={primaryForm.warehouseId} items={(masters.warehouses || []).map((w) => [w._id, w.name])} onChange={(v) => setPrimaryForm((s) => ({ ...s, warehouseId: v }))} />
            <Input label="Amount Total" value={primaryForm.amountTotal} onChangeText={(v) => setPrimaryForm((s) => ({ ...s, amountTotal: v }))} keyboardType="numeric" />
            <Input label="Pay Date (YYYY-MM-DD)" value={primaryForm.payDate} onChangeText={(v) => setPrimaryForm((s) => ({ ...s, payDate: v }))} />
            <Input label="Return Date (YYYY-MM-DD)" value={primaryForm.returnDate} onChangeText={(v) => setPrimaryForm((s) => ({ ...s, returnDate: v }))} />
            <Input label="Details" value={primaryForm.details} onChangeText={(v) => setPrimaryForm((s) => ({ ...s, details: v }))} multiline />
            <Pressable style={styles.btn} onPress={savePrimary} disabled={saving}><Text style={styles.btnTx}>{saving ? 'Saving...' : 'Save Payment'}</Text></Pressable>
          </Card>

          <Card>
            <Text style={styles.h2}>Primary Payment Ledger</Text>
            <ScrollView horizontal><View style={styles.table}><Row head cols={['Invoice-No', 'Amount', 'Pay Date', 'Return Date', 'Action']} />
              {primaryLedger.map((row) => <View key={row._id} style={styles.tRow}><Text style={styles.tCell}>{row.invoiceNo || '-'}</Text><Text style={styles.tCell}>{fmtAmount(row.amountTotal)}</Text><Text style={styles.tCell}>{String(row.payDate || '').slice(0, 10)}</Text><Text style={styles.tCell}>{String(row.returnDate || '').slice(0, 10)}</Text><View style={styles.tCell}><Pressable style={styles.btnDanger} onPress={() => deletePrimary(row._id)}><Text style={styles.btnDangerTx}>Delete</Text></Pressable></View></View>)}
              {!primaryLedger.length ? <Text style={styles.empty}>No primary payments yet.</Text> : null}
            </View></ScrollView>
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
            <Input label="Date of Paid (YYYY-MM-DD)" value={secondaryForm.paidDate} onChangeText={(v) => setSecondaryForm((s) => ({ ...s, paidDate: v }))} />
            <Selector title="Invoice-No of Primary Payment" value={secondaryForm.primaryInvoiceNo} items={matchingPrimaryInvoices.map((item) => [item.invoiceNo, `${item.invoiceNo} (Remaining: ${fmtAmount(item.amountRemaining)})`])} onChange={(v) => setSecondaryForm((s) => ({ ...s, primaryInvoiceNo: v }))} />
            <Input label="Detail of Payment" value={secondaryForm.details} onChangeText={(v) => setSecondaryForm((s) => ({ ...s, details: v }))} multiline />
            <Pressable style={styles.btn} onPress={saveSecondary} disabled={saving}><Text style={styles.btnTx}>{saving ? 'Saving...' : 'Save Payment'}</Text></Pressable>
          </Card>

          <Card>
            <Text style={styles.h2}>Secondary Payment Ledger</Text>
            <ScrollView horizontal><View style={styles.table}><Row head cols={['Invoice-No', 'Paid Amount', 'Date', 'Action']} />
              {secondaryLedger.map((row) => <View key={row._id} style={styles.tRow}><Text style={styles.tCell}>{row.primaryInvoiceNo || '-'}</Text><Text style={styles.tCell}>{fmtAmount(row.amountPaid)}</Text><Text style={styles.tCell}>{String(row.paidDate || '').slice(0, 10)}</Text><View style={styles.tCell}><Pressable style={styles.btnDanger} onPress={() => deleteSecondary(row._id)}><Text style={styles.btnDangerTx}>Delete</Text></Pressable></View></View>)}
              {!secondaryLedger.length ? <Text style={styles.empty}>No secondary settlements yet.</Text> : null}
            </View></ScrollView>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function Tab({ label, active, onPress }) { return <Pressable style={[styles.tab, active ? styles.tabActive : null]} onPress={onPress}><Text style={active ? styles.tabTxActive : styles.tabTx}>{label}</Text></Pressable>; }
function Input({ label, multiline, ...props }) { return <View style={{ marginBottom: 8 }}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline ? { minHeight: 72, textAlignVertical: 'top' } : null]} multiline={multiline} {...props} /></View>; }
function Selector({ title, value, items, onChange }) { return <View style={{ marginBottom: 8 }}><Text style={styles.label}>{title}</Text><ScrollView horizontal contentContainerStyle={styles.rowWrap}>{items.map(([v, l]) => <Pressable key={String(v)} style={[styles.chip, value === v ? styles.chipActive : null]} onPress={() => onChange(v)}><Text style={value === v ? styles.chipTx : null}>{l}</Text></Pressable>)} {!items.length ? <Text style={styles.hint}>No options</Text> : null}</ScrollView></View>; }
function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 }, title: { fontSize: 22, fontWeight: '700' }, subtitle: { marginTop: 4, color: '#6b7280' }, err: { color: '#b91c1c', marginTop: 6 }, h2: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  tabRow: { marginTop: 10, flexDirection: 'row', gap: 8 }, tab: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f9fafb' }, tabActive: { backgroundColor: '#fff', borderColor: '#a7f3d0' }, tabTx: { color: '#52525b' }, tabTxActive: { color: '#111827', fontWeight: '700' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  rowWrap: { flexDirection: 'row', gap: 8, paddingVertical: 2 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' }, chipActive: { backgroundColor: '#059669', borderColor: '#059669' }, chipTx: { color: '#fff' }, hint: { color: '#6b7280', paddingVertical: 8 },
  btn: { borderRadius: 10, backgroundColor: '#059669', paddingVertical: 10, alignItems: 'center' }, btnTx: { color: '#fff', fontWeight: '700' },
  btnDanger: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' }, btnDangerTx: { color: '#991b1b' },
  table: { minWidth: 760, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHead: { backgroundColor: '#f8fafc' }, tCell: { width: 170, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  empty: { color: '#6b7280', padding: 10 },
});
