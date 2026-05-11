import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';
import Loader from '../../../../../../foundation/ui/Loader';

function fmtAmount(n) { return Number(n || 0).toLocaleString(); }
function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const BASE_PRIMARY = { regionId: '', zoneId: '', territoryId: '', distributorId: '', warehouseId: '', amountTotal: '', payDate: '', returnDate: '', details: '' };
const BASE_SECONDARY = { regionId: '', zoneId: '', territoryId: '', distributorId: '', warehouseId: '', amountPaid: '', paidDate: '', primaryInvoiceNo: '', details: '' };

function findRegionCode(id, regions) {
  return (regions || []).find((r) => String(r._id) === String(id))?.regionId || '';
}

function findZoneCode(id, zones) {
  return (zones || []).find((z) => String(z._id) === String(id))?.zoneId || '';
}

function findTerritoryCode(id, territories) {
  return (territories || []).find((t) => String(t._id) === String(id))?.areaId || '';
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function buildInvoiceHtml(primary, settlements) {
  const settlementRows = settlements.length > 0
    ? settlements.map((row, idx) => `<tr><td>${idx + 1}</td><td>${fmtAmount(row.amountPaid)}</td><td>${formatDate(row.paidDate)}</td><td>${escapeHtml(row.details || '-')}</td></tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;">No settlement payments yet.</td></tr>';

  return `<html><body style="font-family:Arial,sans-serif;padding:16px;color:#111;"><div style="display:flex;justify-content:space-between;align-items:center;"><div style="display:flex;align-items:center;gap:10px;"><div style="width:54px;height:54px;border-radius:10px;background:linear-gradient(135deg,#065f46,#10b981);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">RE</div><div><div style="font-weight:700;font-size:18px;">Rawyan ERP</div><div style="font-size:11px;color:#555;">Payment Invoice / Receipt</div></div></div><div style="font-size:12px;text-align:right;"><div><b>Invoice No:</b> ${escapeHtml(primary.invoiceNo || '-')}</div><div><b>Date:</b> ${formatDate(primary.payDate)}</div></div></div><div style="margin-top:12px;font-size:12px;"><b>Invoice From:</b> ${escapeHtml(primary.warehouseName || '-')}</div><div style="font-size:12px;"><b>Bill To:</b> ${escapeHtml(primary.distributorName || '-')}</div><div style="font-size:12px;"><b>Distributor Address:</b> ${escapeHtml(primary.distributorAddress || '-')}</div><div style="font-size:12px;"><b>Region/Zone/Territory:</b> ${escapeHtml(primary.regionName || '-')} / ${escapeHtml(primary.zoneName || '-')} / ${escapeHtml(primary.territoryName || '-')}</div><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:12px;font-size:12px;"><tbody><tr><td><b>Total Primary Amount</b></td><td>${fmtAmount(primary.amountTotal)}</td><td><b>Pay Date</b></td><td>${formatDate(primary.payDate)}</td></tr><tr><td><b>Return Date</b></td><td>${formatDate(primary.returnDate)}</td><td><b>Details</b></td><td>${escapeHtml(primary.details || '-')}</td></tr><tr><td><b>Total Paid Back</b></td><td>${fmtAmount(primary.amountPaidBack)}</td><td><b>Remaining Amount</b></td><td>${fmtAmount(primary.amountRemaining)}</td></tr></tbody></table><div style="margin-top:14px;font-weight:700;">Settlement Details</div><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:8px;font-size:12px;"><thead><tr><th>#</th><th>Paid Amount</th><th>Paid Date</th><th>Detail</th></tr></thead><tbody>${settlementRows}</tbody></table><div style="margin-top:20px;text-align:center;font-size:12px;">Thank you for business with Rawyan ERP.</div></body></html>`;
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default function PaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('primary');

  const [masters, setMasters] = useState({ regions: [], zones: [], territories: [], distributors: [], warehouses: [] });
  const [primaryLedger, setPrimaryLedger] = useState([]);
  const [secondaryLedger, setSecondaryLedger] = useState([]);
  const [invoiceRow, setInvoiceRow] = useState(null);
  const [primaryForm, setPrimaryForm] = useState(BASE_PRIMARY);
  const [secondaryForm, setSecondaryForm] = useState(BASE_SECONDARY);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const [m, p, s] = await Promise.all([apiClient.get('/payments/masters'), apiClient.get('/payments/primary'), apiClient.get('/payments/secondary')]);
      const users = m?.data?.users || [];
      setMasters({
        regions: m?.data?.regions || [],
        zones: m?.data?.zones || [],
        territories: m?.data?.areas || m?.data?.territories || [],
        distributors: m?.data?.distributors || users.filter((row) => row.role === 'Distributor'),
        warehouses: m?.data?.warehouses || [],
      });
      setPrimaryLedger(p?.data?.primaryPayments || []);
      setSecondaryLedger(s?.data?.secondaryPayments || []);
    } catch (e) { setErr(e.message || 'Failed to load payment management'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const primaryZones = useMemo(() => {
    const regionCode = findRegionCode(primaryForm.regionId, masters.regions);
    return (masters.zones || []).filter((z) => !primaryForm.regionId || String(z.regionId) === String(regionCode));
  }, [masters.zones, masters.regions, primaryForm.regionId]);
  const primaryTerritories = useMemo(() => {
    const zoneCode = findZoneCode(primaryForm.zoneId, masters.zones);
    return (masters.territories || []).filter((t) => !primaryForm.zoneId || String(t.zoneId) === String(zoneCode));
  }, [masters.territories, masters.zones, primaryForm.zoneId]);
  const primaryDistributors = useMemo(() => {
    const territoryCode = findTerritoryCode(primaryForm.territoryId, masters.territories);
    return (masters.distributors || []).filter((d) => !primaryForm.territoryId || String(d.territoryId) === String(territoryCode));
  }, [masters.distributors, masters.territories, primaryForm.territoryId]);

  const secondaryZones = useMemo(() => {
    const regionCode = findRegionCode(secondaryForm.regionId, masters.regions);
    return (masters.zones || []).filter((z) => !secondaryForm.regionId || String(z.regionId) === String(regionCode));
  }, [masters.zones, masters.regions, secondaryForm.regionId]);
  const secondaryTerritories = useMemo(() => {
    const zoneCode = findZoneCode(secondaryForm.zoneId, masters.zones);
    return (masters.territories || []).filter((t) => !secondaryForm.zoneId || String(t.zoneId) === String(zoneCode));
  }, [masters.territories, masters.zones, secondaryForm.zoneId]);
  const secondaryDistributors = useMemo(() => {
    const territoryCode = findTerritoryCode(secondaryForm.territoryId, masters.territories);
    return (masters.distributors || []).filter((d) => !secondaryForm.territoryId || String(d.territoryId) === String(territoryCode));
  }, [masters.distributors, masters.territories, secondaryForm.territoryId]);

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

  const invoiceSettlements = invoiceRow ? secondaryLedger.filter((row) => row.primaryInvoiceNo === invoiceRow.invoiceNo) : [];

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
                    <View style={[styles.tCell, styles.actionsCell]}>
                      <Pressable style={styles.btnAlt} onPress={() => setInvoiceRow(row)}><Text>Invoice/Receipt</Text></Pressable>
                      <Pressable style={styles.btnDanger} onPress={() => deletePrimary(row._id)}><Text style={styles.btnDangerTx}>Delete</Text></Pressable>
                    </View>
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
                    <View style={[styles.tCell, styles.actionsCell]}>
                      <Pressable
                        style={styles.btnAlt}
                        onPress={() => {
                          const linked = primaryLedger.find((entry) => entry.invoiceNo === row.primaryInvoiceNo);
                          if (linked) setInvoiceRow(linked);
                          else setErr('Primary invoice record was not found for this secondary payment.');
                        }}
                      >
                        <Text>Invoice/Receipt</Text>
                      </Pressable>
                      <Pressable style={styles.btnDanger} onPress={() => deleteSecondary(row._id)}><Text style={styles.btnDangerTx}>Delete</Text></Pressable>
                    </View>
                  </View>
                ))}
                {!secondaryLedger.length ? <Text style={styles.empty}>No secondary settlements yet.</Text> : null}
              </View>
            </ScrollView>
          </Card>
        </>
      )}

      <Modal visible={Boolean(invoiceRow)} transparent animationType="fade" onRequestClose={() => setInvoiceRow(null)}>
        <View style={styles.overlay}>
          <View style={styles.invoiceModal}>
            <Text style={styles.invoiceTitle}>Invoice {invoiceRow?.invoiceNo || '-'}</Text>
            <Text style={styles.invoiceMeta}>Distributor: {invoiceRow?.distributorName || '-'}</Text>
            <Text style={styles.invoiceMeta}>Warehouse: {invoiceRow?.warehouseName || '-'}</Text>
            <Text style={styles.invoiceMeta}>Region/Zone/Territory: {invoiceRow?.regionName || '-'} / {invoiceRow?.zoneName || '-'} / {invoiceRow?.territoryName || '-'}</Text>
            <Text style={styles.invoiceMeta}>Pay Date: {formatDate(invoiceRow?.payDate)} • Return Date: {formatDate(invoiceRow?.returnDate)}</Text>
            <Text style={styles.invoiceMeta}>Amount Total: {fmtAmount(invoiceRow?.amountTotal)}</Text>
            <Text style={[styles.h2, { fontSize: 14, marginTop: 10 }]}>Settlement Details</Text>
            <View style={styles.table}>
              <Row head cols={['Paid Amount', 'Paid Date', 'Detail']} />
              {invoiceSettlements.map((row) => <Row key={row._id} cols={[fmtAmount(row.amountPaid), formatDate(row.paidDate), row.details || '—']} />)}
              {!invoiceSettlements.length ? <Text style={styles.empty}>No settlement payments yet.</Text> : null}
            </View>
            <View style={styles.invoiceActions}>
              <Pressable
                style={styles.btnAlt}
                onPress={() => {
                  const html = buildInvoiceHtml(invoiceRow || {}, invoiceSettlements);
                  Linking.openURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
                }}
              >
                <Text>Open Printable Receipt</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={() => setInvoiceRow(null)}><Text style={styles.btnTx}>Close</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  actionsCell: { gap: 8, flexDirection: 'row', alignItems: 'center' },
  table: { minWidth: 980, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  tHead: { backgroundColor: '#f8fafc' },
  tCell: { width: 160, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  empty: { color: '#6b7280', padding: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  invoiceModal: { backgroundColor: '#fff', borderRadius: 12, padding: 12, maxHeight: '85%', gap: 4 },
  invoiceTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  invoiceMeta: { fontSize: 12, color: '#334155' },
  invoiceActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthTitle: { fontWeight: '700' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  dayCell: { width: '14.285%', alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  closeBtn: { marginTop: 10, alignSelf: 'flex-end', borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});