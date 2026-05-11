import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';
import Loader from '../../../../../../foundation/ui/Loader';

const tabs = [
  { key: 'builty', label: 'Builty Expense' },
  { key: 'credit_note', label: 'Credit Note Expense' },
  { key: 'support', label: 'Additional Support' },
  { key: 'claim_discount', label: 'Claims' },
];

export default function DistributorScreen() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('builty');
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filters, setFilters] = useState({ distributorId: 'all', fromDate: '', toDate: '' });
  const [form, setForm] = useState({ distributorId: '', territory: '', expenseDate: '', amount: '', paidTo: '', paymentMethod: 'cash', fromAccountId: '', description: '', referenceNo: '', attachmentUrl: '', reason: '', employeeType: 'Promoter', supportPeriod: '', claimType: 'Discount Claim' });

  useEffect(() => {
    Promise.all([apiClient.get('/expenses?section=distributor'), apiClient.get('/accounts'), apiClient.get('/users')])
      .then(([a, b, c]) => {
        setRows(a?.data?.expenses || []);
        setAccounts(b?.data?.accounts || []);
        setDistributors((c?.data?.users || []).filter((u) => String(u.role || '').toLowerCase().includes('distributor')));
      })
      .finally(() => setLoading(false));
  }, []);

  const territoryOptions = useMemo(() => {
    const names = new Set();
    distributors.forEach((d) => {
      const name = getDistributorTerritory(d);
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [distributors]);

  const filteredDistributors = useMemo(() => {
    if (!form.territory) return [];
    return distributors.filter((d) => getDistributorTerritory(d) === form.territory);
  }, [distributors, form.territory]);

  const distributorMap = useMemo(() => {
    const m = {};
    distributors.forEach((d) => { m[d._id] = distributorName(d); });
    return m;
  }, [distributors]);

  const filteredRows = useMemo(() => {
    const from = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
    const to = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null;

    return rows.filter((row) => {
      if (filters.distributorId !== 'all' && String(row.distributorId || '') !== filters.distributorId) return false;
      const d = new Date(row.expenseDate || row.createdAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [rows, filters]);

  const filteredApprovedRows = useMemo(() => filteredRows.filter((r) => ['approved', 'posted', 'paid'].includes(String(r.status || '').toLowerCase())), [filteredRows]);

  const monthlyDistributorTotals = useMemo(() => filteredApprovedRows.reduce((m, r) => {
    const key = distributorMap[r.distributorId] || 'Unknown';
    m[key] = (m[key] || 0) + Number(r.amount || 0);
    return m;
  }, {}), [filteredApprovedRows, distributorMap]);

  const perMonthTotalExpense = useMemo(() => {
    const grouped = filteredApprovedRows.reduce((acc, row) => {
      const d = new Date(row.expenseDate || row.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + Number(row.amount || 0);
      return acc;
    }, {});

    return Object.entries(grouped).map(([month, amount]) => ({ month, amount })).sort((a, b) => b.month.localeCompare(a.month));
  }, [filteredApprovedRows]);

  const save = async () => {
    const status = active === 'support' || active.startsWith('claim') ? 'pending' : 'posted';
    const subType = active === 'claim_discount' ? claimSubType(form.claimType) : active;
    const dist = distributors.find((d) => d._id === form.distributorId);

    const payload = {
      section: 'distributor',
      subType,
      category: active,
      distributorId: form.distributorId,
      territory: form.territory || getDistributorTerritory(dist) || '',
      expenseDate: form.expenseDate,
      amount: Number(form.amount || 0),
      paymentMethod: form.paymentMethod,
      paymentMode: form.paymentMethod === 'online' ? 'bank_transfer' : form.paymentMethod,
      fromAccountId: form.fromAccountId,
      paidTo: form.paidTo,
      paymentReference: form.referenceNo,
      description: form.description,
      notes: `${form.reason} ${form.description}`.trim(),
      attachmentUrl: form.attachmentUrl,
      linkReference: form.referenceNo,
      approvalRequired: status === 'pending',
      status,
      title: `Distributor ${tabs.find((t) => t.key === active)?.label || 'Expense'}`,
      expenseId: `DIST-${Date.now()}`,
      reason: form.reason,
      employeeType: form.employeeType,
      supportPeriod: form.supportPeriod,
      claimType: form.claimType,
    };

    const r = await apiClient.post('/expenses', payload);
    setRows((s) => [r?.data?.expense, ...s].filter(Boolean));
  };

  const onDelete = async (id) => {
    await apiClient.delete(`/expenses/${id}`);
    setRows((s) => s.filter((row) => row._id !== id));
  };

  const updateStatus = async (row, status) => {
    const payload = { status, approvedBy: 'Admin', approvalDate: new Date().toISOString() };
    const res = await apiClient.put(`/expenses/${row._id}`, payload);
    const next = res?.data?.expense || { ...row, ...payload };
    setRows((s) => s.map((it) => (it._id === row._id ? next : it)));
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Distributor Expense</Text>
        <Text style={styles.subtitle}>Manage builty, credit note, support and claims with approval workflow.</Text>
        <Selector title="Tabs" value={active} items={tabs.map((t) => [t.key, t.label])} onChange={setActive} />
        <Selector title="Territory/Region" value={form.territory} items={[['', 'Select territory'], ...territoryOptions.map((t) => [t, t])]} onChange={(v) => setForm((s) => ({ ...s, territory: v, distributorId: '' }))} />
        <Selector title="Distributor" value={form.distributorId} items={[['', form.territory ? 'Select distributor' : 'Select territory first'], ...filteredDistributors.map((d) => [d._id, distributorName(d)])]} onChange={(v) => setForm((s) => ({ ...s, distributorId: v }))} />
        <Input label="Date" value={form.expenseDate} onChangeText={(v) => setForm((s) => ({ ...s, expenseDate: v }))} placeholder="YYYY-MM-DD" />
        <Input label="Amount" value={form.amount} onChangeText={(v) => setForm((s) => ({ ...s, amount: v }))} keyboardType="numeric" />
        <Selector title="Payment Method" value={form.paymentMethod} items={[['cash', 'Cash'], ['online', 'Online'], ['cheque', 'Cheque']]} onChange={(v) => setForm((s) => ({ ...s, paymentMethod: v }))} />
        <Selector title="Paid From Account" value={form.fromAccountId} items={[['', 'Select account'], ...accounts.map((a) => [a._id, `${a.accountName} (${a.accountType})`])]} onChange={(v) => setForm((s) => ({ ...s, fromAccountId: v }))} />
        <Input label={active === 'builty' ? 'Builty No / LR No' : active === 'credit_note' ? 'Credit Note No' : 'Reference'} value={form.referenceNo} onChangeText={(v) => setForm((s) => ({ ...s, referenceNo: v }))} />
        <Input label="Paid To / Transporter / Payee" value={form.paidTo} onChangeText={(v) => setForm((s) => ({ ...s, paidTo: v }))} />
        <Input label="Reason" value={form.reason} onChangeText={(v) => setForm((s) => ({ ...s, reason: v }))} />
        {active === 'support' ? <Selector title="Employee Type" value={form.employeeType} items={[['Promoter', 'Promoter'], ['Helper', 'Helper'], ['Loader', 'Loader'], ['Other', 'Other']]} onChange={(v) => setForm((s) => ({ ...s, employeeType: v }))} /> : null}
        {active === 'support' ? <Input label="Support Period" value={form.supportPeriod} onChangeText={(v) => setForm((s) => ({ ...s, supportPeriod: v }))} /> : null}
        {active === 'claim_discount' ? <Selector title="Claim Type" value={form.claimType} items={[['Discount Claim', 'Discount Claim'], ['Offer Claim', 'Offer Claim'], ['Coupon Claim', 'Coupon/Lucky Draw Claim']]} onChange={(v) => setForm((s) => ({ ...s, claimType: v }))} /> : null}
        <Input label="Description / Notes" value={form.description} onChangeText={(v) => setForm((s) => ({ ...s, description: v }))} multiline />
        <Input label="Attachment URL" value={form.attachmentUrl} onChangeText={(v) => setForm((s) => ({ ...s, attachmentUrl: v }))} />
        <Pressable style={styles.btn} onPress={save}><Text style={styles.btnTx}>Add {tabs.find((t) => t.key === active)?.label}</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.h2}>Filters</Text>
        <Selector title="Filter Distributor" value={filters.distributorId} items={[['all', 'All distributors'], ...distributors.map((d) => [d._id, distributorName(d)])]} onChange={(v) => setFilters((s) => ({ ...s, distributorId: v }))} />
        <Input label="From Date" value={filters.fromDate} onChangeText={(v) => setFilters((s) => ({ ...s, fromDate: v }))} placeholder="YYYY-MM-DD" />
        <Input label="To Date" value={filters.toDate} onChangeText={(v) => setFilters((s) => ({ ...s, toDate: v }))} placeholder="YYYY-MM-DD" />
        <Pressable style={styles.btnAlt} onPress={() => setFilters({ distributorId: 'all', fromDate: '', toDate: '' })}><Text>Reset Filters</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.h2}>Approved Totals</Text>
        {Object.entries(monthlyDistributorTotals).slice(0, 3).map(([dist, amount]) => <Metric key={dist} label={dist} value={money(amount)} />)}
        {!Object.keys(monthlyDistributorTotals).length ? <Text style={styles.hint}>No approved totals for selected filters.</Text> : null}
      </Card>

      <Card>
        <Text style={styles.h2}>Per Month Total Expense (Approved/Posted/Paid)</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Month', 'Total Expense']} />
            {perMonthTotalExpense.map((item) => <Row key={item.month} cols={[item.month, money(item.amount)]} />)}
            {!perMonthTotalExpense.length ? <Text style={styles.empty}>No monthly totals for selected filters.</Text> : null}
          </View>
        </ScrollView>
      </Card>

      <Card>
        <Text style={styles.h2}>Distributor Expense Ledger</Text>
        <ScrollView horizontal>
          <View style={styles.tableWide}>
            <Row head cols={['Date', 'Distributor', 'Territory', 'Type', 'Reference', 'Amount', 'Status', 'Approved By', 'Attachment', 'Actions']} />
            {filteredRows.map((r) => (
              <View key={r._id} style={styles.tRow}>
                <Text style={styles.tCell}>{fmtDate(r.expenseDate)}</Text>
                <Text style={styles.tCell}>{distributorMap[r.distributorId] || '-'}</Text>
                <Text style={styles.tCell}>{r.territory || '-'}</Text>
                <Text style={styles.tCell}>{r.subType || '-'}</Text>
                <Text style={styles.tCell}>{r.paymentReference || r.linkReference || '-'}</Text>
                <Text style={styles.tCell}>{money(r.amount)}</Text>
                <Text style={styles.tCell}>{r.status || '-'}</Text>
                <Text style={styles.tCell}>{r.approvedBy || '-'}</Text>
                <View style={styles.tCell}>{r.attachmentUrl ? <Pressable style={styles.btnAlt} onPress={() => Linking.openURL(r.attachmentUrl)}><Text>View</Text></Pressable> : <Text>-</Text>}</View>
                <View style={[styles.tCell, styles.actions]}>
                  <Pressable style={styles.btnAlt} onPress={() => setSelectedReceipt(r)}><Text>Receipt</Text></Pressable>
                  <Pressable style={styles.btnOk} onPress={() => updateStatus(r, 'approved')}><Text style={styles.btnOkTx}>Approve</Text></Pressable>
                  <Pressable style={styles.btnWarn} onPress={() => updateStatus(r, 'rejected')}><Text style={styles.btnWarnTx}>Reject</Text></Pressable>
                  <Pressable style={styles.btnDanger} onPress={() => onDelete(r._id)}><Text style={styles.btnDangerTx}>Delete</Text></Pressable>
                </View>
              </View>
            ))}
            {!filteredRows.length ? <Text style={styles.empty}>No distributor expenses for selected filters.</Text> : null}
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(selectedReceipt)} transparent animationType="fade" onRequestClose={() => setSelectedReceipt(null)}>
        <View style={styles.overlay}><View style={styles.modal}>
          <Text style={styles.h2}>Rawyan ERP Distributor Expense Receipt</Text>
          <KV label="Date" value={fmtDate(selectedReceipt?.expenseDate)} />
          <KV label="Distributor" value={distributorMap[selectedReceipt?.distributorId] || '-'} />
          <KV label="Territory" value={selectedReceipt?.territory || '-'} />
          <KV label="Type" value={selectedReceipt?.subType || '-'} />
          <KV label="Amount" value={money(selectedReceipt?.amount)} />
          <KV label="Payment Method" value={String(selectedReceipt?.paymentMethod || '-').toUpperCase()} />
          <KV label="Paid To" value={selectedReceipt?.paidTo || '-'} />
          <KV label="Status" value={selectedReceipt?.status || '-'} />
          <Text style={styles.note}>{selectedReceipt?.description || selectedReceipt?.notes || '-'}</Text>
          <View style={styles.actions}><Pressable style={styles.btnAlt} onPress={() => setSelectedReceipt(null)}><Text>Close</Text></Pressable></View>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function claimSubType(claimType) { if (claimType === 'Offer Claim') return 'claim_offer'; if (claimType === 'Coupon Claim') return 'claim_coupon'; return 'claim_discount'; }
function distributorName(d) { return d?.fullName || d?.name || d?.businessName || d?.username || d?.mobile || 'Distributor'; }
function getDistributorTerritory(d) { return d?.territoryName || d?.areaName || d?.zoneName || d?.regionName || ''; }
function fmtDate(v) { return v ? new Date(v).toLocaleDateString() : '-'; }
function money(v) { return `PKR ${Number(v || 0).toLocaleString()}`; }
function Input({ label, multiline, ...props }) { return <View style={{ marginTop: 8 }}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline ? { minHeight: 72, textAlignVertical: 'top' } : null]} multiline={multiline} {...props} /></View>; }
function Selector({ title, value, items, onChange }) { return <View style={{ marginTop: 8 }}><Text style={styles.label}>{title}</Text><ScrollView horizontal contentContainerStyle={styles.rowWrap}>{items.map(([v, l]) => <Pressable key={String(v)} style={[styles.chip, value === v ? styles.chipActive : null]} onPress={() => onChange(v)}><Text style={value === v ? styles.chipTx : null}>{l}</Text></Pressable>)}</ScrollView></View>; }
function Metric({ label, value }) { return <View style={styles.metric}><Text style={styles.metricL}>{label}</Text><Text style={styles.metricV}>{value}</Text></View>; }
function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }
function KV({ label, value }) { return <View style={styles.kv}><Text style={styles.kvK}>{label}</Text><Text style={styles.kvV}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  h2: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  hint: { color: '#6b7280' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  rowWrap: { gap: 8 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  chipTx: { color: '#fff' },
  btn: { marginTop: 10, borderRadius: 10, backgroundColor: '#059669', paddingVertical: 10, alignItems: 'center' },
  btnTx: { color: '#fff', fontWeight: '700' },
  btnAlt: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff', alignItems: 'center' },
  btnOk: { borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#ecfdf5', alignItems: 'center' },
  btnOkTx: { color: '#065f46', fontWeight: '700' },
  btnWarn: { borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fffbeb', alignItems: 'center' },
  btnWarnTx: { color: '#92400e', fontWeight: '700' },
  btnDanger: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff1f2', alignItems: 'center' },
  btnDangerTx: { color: '#991b1b' },
  metric: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, marginBottom: 8 },
  metricL: { fontSize: 12, color: '#6b7280' },
  metricV: { marginTop: 4, fontWeight: '700' },
  table: { minWidth: 360, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' },
  tableWide: { minWidth: 1400, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  tHead: { backgroundColor: '#f8fafc' },
  tCell: { width: 140, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  empty: { color: '#6b7280', padding: 10 },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 6 },
  kvK: { color: '#6b7280' },
  kvV: { color: '#111827', fontWeight: '600' },
  note: { marginTop: 8, color: '#374151' },
});