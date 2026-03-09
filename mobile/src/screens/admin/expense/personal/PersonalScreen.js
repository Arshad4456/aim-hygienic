import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const categories = ['Kitchen Expense', 'Guest Expense', 'Fuel Expense', 'Rent Expense', 'Legal Expense', 'Utility Expense', 'Delivery Expense', 'Electricity Expense', 'Mobile Expense', 'Refreshment Expense', 'Salary Expense', 'Other'];

export default function PersonalScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [form, setForm] = useState({ category: categories[0], expenseDate: '', amount: '', paymentMethod: 'cash', fromAccountId: '', paidTo: '', description: '', attachmentUrl: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [expenseData, accountData] = await Promise.all([apiClient.get('/expenses?section=personal'), apiClient.get('/accounts')]);
      setRows(expenseData?.data?.expenses || []);
      setAccounts(accountData?.data?.accounts || []);
    } catch {
      setRows([]);
      setAccounts([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    const payload = {
      section: 'personal',
      subType: (form.category || 'other').toLowerCase().replace(/\s+/g, '_'),
      category: form.category,
      amount: Number(form.amount || 0),
      paymentMethod: form.paymentMethod,
      paymentMode: form.paymentMethod === 'online' ? 'bank_transfer' : form.paymentMethod,
      fromAccountId: form.fromAccountId,
      paidTo: form.paidTo,
      expenseDate: form.expenseDate,
      notes: form.description,
      description: form.description,
      attachmentUrl: form.attachmentUrl,
      status: 'posted',
      title: `${form.category} expense`,
      expenseId: `PER-${Date.now()}`,
    };
    const r = await apiClient.post('/expenses', payload);
    setRows((s) => [r?.data?.expense, ...s].filter(Boolean));
    setForm((s) => ({ ...s, amount: '', paidTo: '', description: '', attachmentUrl: '' }));
  };

  const onDelete = async (id) => {
    await apiClient.delete(`/expenses/${id}`);
    setRows((s) => s.filter((row) => row._id !== id));
  };

  const filteredRows = useMemo(() => {
    const from = filterFrom ? new Date(`${filterFrom}T00:00:00`) : null;
    const to = filterTo ? new Date(`${filterTo}T23:59:59`) : null;
    return rows.filter((row) => {
      const date = new Date(row.expenseDate || row.createdAt);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });
  }, [rows, filterFrom, filterTo]);

  const monthRows = filteredRows.filter((r) => { const d = new Date(r.expenseDate || r.createdAt); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
  const today = filteredRows.filter((r) => new Date(r.expenseDate || r.createdAt).toDateString() === new Date().toDateString());

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>AIM – Personal Expense</Text>
        <Text style={styles.subtitle}>Structured internal expense tracking with category discipline, ledger, and monthly analysis.</Text>
        <Selector title="Expense Category" value={form.category} items={categories.map((c) => [c, c])} onChange={(v) => setForm((s) => ({ ...s, category: v }))} />
        <Input label="Expense Date" value={form.expenseDate} onChangeText={(v) => setForm((s) => ({ ...s, expenseDate: v }))} placeholder="YYYY-MM-DD" />
        <Input label="Amount (PKR)" value={form.amount} onChangeText={(v) => setForm((s) => ({ ...s, amount: v }))} keyboardType="numeric" />
        <Selector title="Payment Method" value={form.paymentMethod} items={[['cash', 'Cash'], ['online', 'Online (Bank Transfer)']]} onChange={(v) => setForm((s) => ({ ...s, paymentMethod: v }))} />
        <Selector title="Paid From Account" value={form.fromAccountId} items={[['', 'Select account'], ...accounts.map((a) => [a._id, `${a.accountName} (${a.accountType})`])]} onChange={(v) => setForm((s) => ({ ...s, fromAccountId: v }))} />
        <Input label="Vendor / Payee Name" value={form.paidTo} onChangeText={(v) => setForm((s) => ({ ...s, paidTo: v }))} />
        <Input label="Notes / Description" value={form.description} onChangeText={(v) => setForm((s) => ({ ...s, description: v }))} multiline />
        <Input label="Attachment URL" value={form.attachmentUrl} onChangeText={(v) => setForm((s) => ({ ...s, attachmentUrl: v }))} />
        <Pressable style={styles.btn} onPress={submit}><Text style={styles.btnTx}>Save Personal Expense</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.h2}>Summary</Text>
        <Metric label="Today" value={money(today.reduce((s, r) => s + Number(r.amount || 0), 0))} />
        <Metric label="This Month" value={money(monthRows.reduce((s, r) => s + Number(r.amount || 0), 0))} />
        <Metric label="Transactions" value={String(monthRows.length)} />
        <Input label="From Date" value={filterFrom} onChangeText={setFilterFrom} placeholder="YYYY-MM-DD" />
        <Input label="To Date" value={filterTo} onChangeText={setFilterTo} placeholder="YYYY-MM-DD" />
      </Card>

      <Card>
        <Text style={styles.h2}>Personal Expense Ledger</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Date', 'Category', 'Amount', 'Payment', 'Paid To', 'Status', 'Attachment', 'Action']} />
            {!filteredRows.length ? <Text style={styles.empty}>No entries</Text> : filteredRows.map((r) => (
              <View key={r._id} style={styles.tRow}>
                <Text style={styles.tCell}>{fmtDate(r.expenseDate)}</Text>
                <Text style={styles.tCell}>{r.category || '-'}</Text>
                <Text style={styles.tCell}>{money(r.amount)}</Text>
                <Text style={styles.tCell}>{String(r.paymentMethod || '-').toUpperCase()}</Text>
                <Text style={styles.tCell}>{r.paidTo || r.vendorName || '-'}</Text>
                <Text style={styles.tCell}>{r.status || '-'}</Text>
                <View style={styles.tCell}>{r.attachmentUrl ? <Pressable style={styles.btnAlt} onPress={() => Linking.openURL(r.attachmentUrl)}><Text>View</Text></Pressable> : <Text>-</Text>}</View>
                <View style={[styles.tCell, styles.action]}>
                  <Pressable style={styles.btnAlt} onPress={() => setSelectedReceipt(r)}><Text>Receipt</Text></Pressable>
                  <Pressable style={styles.btnDanger} onPress={() => onDelete(r._id)}><Text style={styles.btnDangerTx}>Delete</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(selectedReceipt)} transparent animationType="fade" onRequestClose={() => setSelectedReceipt(null)}>
        <View style={styles.overlay}><View style={styles.modal}>
          <Text style={styles.h2}>AIM Hygienic Expense Receipt</Text>
          <KV label="Expense Date" value={fmtDate(selectedReceipt?.expenseDate)} />
          <KV label="Category" value={selectedReceipt?.category || '-'} />
          <KV label="Amount" value={money(selectedReceipt?.amount)} />
          <KV label="Payment Method" value={String(selectedReceipt?.paymentMethod || '-').toUpperCase()} />
          <KV label="Paid From Account" value={accountName(accounts, selectedReceipt?.fromAccountId)} />
          <KV label="Paid To" value={selectedReceipt?.paidTo || selectedReceipt?.vendorName || '-'} />
          <KV label="Status" value={selectedReceipt?.status || '-'} />
          <Text style={styles.note}>{selectedReceipt?.description || selectedReceipt?.notes || '-'}</Text>
          <View style={styles.action}><Pressable style={styles.btnAlt} onPress={() => setSelectedReceipt(null)}><Text>Close</Text></Pressable></View>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function accountName(accounts, id) { return accounts.find((a) => a._id === id)?.accountName || '-'; }
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
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  rowWrap: { gap: 8 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  chipTx: { color: '#fff' },
  btn: { marginTop: 10, borderRadius: 10, backgroundColor: '#059669', paddingVertical: 10, alignItems: 'center' },
  btnTx: { color: '#fff', fontWeight: '700' },
  metric: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, marginBottom: 8 },
  metricL: { fontSize: 12, color: '#6b7280' },
  metricV: { marginTop: 4, fontWeight: '700' },
  table: { minWidth: 980, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  tHead: { backgroundColor: '#f8fafc' },
  tCell: { width: 140, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  empty: { color: '#6b7280', padding: 10 },
  btnAlt: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff', alignItems: 'center' },
  btnDanger: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff1f2', alignItems: 'center' },
  btnDangerTx: { color: '#991b1b' },
  action: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 6 },
  kvK: { color: '#6b7280' },
  kvV: { color: '#111827', fontWeight: '600' },
  note: { marginTop: 8, color: '#374151' },
});