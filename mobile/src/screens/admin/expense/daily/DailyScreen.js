import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function DailyScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [form, setForm] = useState({ expenseDate: '', spenderUserId: '', expenseType: 'Cash Expense', amount: '', fromAccountId: '', paidTo: '', referenceNo: '', description: '', attachmentUrl: '', isTransfer: false, transferToAccountId: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([apiClient.get('/expenses?section=daily'), apiClient.get('/users'), apiClient.get('/accounts')]);
      setRows(a?.data?.expenses || []);
      setUsers(b?.data?.users || []);
      setAccounts(c?.data?.accounts || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const spenderOptions = useMemo(() => users.filter((u) => String(u.role || '').toLowerCase() !== 'customer').map((u) => ({ value: u._id, label: `${u.fullName || u.name || u.username || 'User'} (${u.role || '-'})`, spenderName: u.fullName || u.name || u.username || 'User' })), [users]);

  const filteredRows = useMemo(() => {
    const from = filterFrom ? new Date(`${filterFrom}T00:00:00`) : null;
    const to = filterTo ? new Date(`${filterTo}T23:59:59`) : null;
    return rows.filter((row) => {
      const d = new Date(row.expenseDate || row.createdAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [rows, filterFrom, filterTo]);

  const topSpenders = useMemo(() => Object.entries(filteredRows.reduce((m, r) => { const k = r.spenderName || 'Unknown'; m[k] = (m[k] || 0) + Number(r.amount || 0); return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3), [filteredRows]);

  const submit = async () => {
    const option = spenderOptions.find((u) => u.value === form.spenderUserId);
    const amount = Number(form.amount || 0);
    const payload = {
      section: 'daily',
      subType: form.isTransfer ? 'bank_transfer' : 'daily_expense',
      category: form.expenseType,
      expenseType: form.expenseType,
      spenderUserId: form.spenderUserId,
      spenderName: option ? option.spenderName : '',
      amount,
      fromAccountId: form.fromAccountId,
      paidTo: form.paidTo,
      paymentMethod: form.expenseType === 'Cash Expense' ? 'cash' : 'online',
      paymentMode: form.expenseType === 'Cash Expense' ? 'cash' : 'bank_transfer',
      paymentReference: form.referenceNo,
      expenseDate: form.expenseDate,
      description: form.description,
      notes: form.description,
      attachmentUrl: form.attachmentUrl,
      isTransfer: form.isTransfer,
      transferToAccountId: form.transferToAccountId,
      approvalRequired: amount > 50000,
      status: amount > 50000 ? 'pending' : 'posted',
      expenseId: `DAY-${Date.now()}`,
      title: 'Daily operational expense',
    };
    const r = await apiClient.post('/expenses', payload);
    setRows((s) => [r?.data?.expense, ...s].filter(Boolean));
  };

  const onDelete = async (id) => {
    await apiClient.delete(`/expenses/${id}`);
    setRows((s) => s.filter((row) => row._id !== id));
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Daily Expense</Text>
        <Text style={styles.subtitle}>Track operational spending by user/role with transfer separation and daily insights.</Text>
        <Input label="Expense Date" value={form.expenseDate} onChangeText={(v) => setForm((s) => ({ ...s, expenseDate: v }))} placeholder="YYYY-MM-DD" />
        <Selector title="Spender/User" value={form.spenderUserId} items={[['', 'Select user'], ...spenderOptions.map((u) => [u.value, u.label])]} onChange={(v) => setForm((s) => ({ ...s, spenderUserId: v }))} />
        <Selector title="Expense Type" value={form.expenseType} items={[['Cash Expense', 'Cash Expense'], ['Online Payment', 'Online Payment'], ['Bank-to-Bank Transfer', 'Bank-to-Bank Transfer']]} onChange={(v) => setForm((s) => ({ ...s, expenseType: v, isTransfer: v === 'Bank-to-Bank Transfer' }))} />
        <Input label="Amount" value={form.amount} onChangeText={(v) => setForm((s) => ({ ...s, amount: v }))} keyboardType="numeric" />
        <Selector title="Paid From Account" value={form.fromAccountId} items={[['', 'Select account'], ...accounts.map((a) => [a._id, `${a.accountName} (${a.accountType})`])]} onChange={(v) => setForm((s) => ({ ...s, fromAccountId: v }))} />
        <Input label="Paid To" value={form.paidTo} onChangeText={(v) => setForm((s) => ({ ...s, paidTo: v }))} />
        <Input label="Reference No" value={form.referenceNo} onChangeText={(v) => setForm((s) => ({ ...s, referenceNo: v }))} />
        <Input label="Description" value={form.description} onChangeText={(v) => setForm((s) => ({ ...s, description: v }))} multiline />
        <Input label="Attachment URL" value={form.attachmentUrl} onChangeText={(v) => setForm((s) => ({ ...s, attachmentUrl: v }))} />
        {form.isTransfer ? <Selector title="Transfer To Account" value={form.transferToAccountId} items={[['', 'Select account'], ...accounts.map((a) => [a._id, `${a.accountName} (${a.accountType})`])]} onChange={(v) => setForm((s) => ({ ...s, transferToAccountId: v }))} /> : null}
        <Pressable style={styles.btn} onPress={submit}><Text style={styles.btnTx}>Save Daily Expense</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.h2}>Top Spenders</Text>
        {topSpenders.map(([name, amount]) => <Metric key={name} label={name} value={money(amount)} />)}
        {!topSpenders.length ? <Text style={styles.hint}>No spender data</Text> : null}
        <Input label="From Date" value={filterFrom} onChangeText={setFilterFrom} placeholder="YYYY-MM-DD" />
        <Input label="To Date" value={filterTo} onChangeText={setFilterTo} placeholder="YYYY-MM-DD" />
      </Card>

      <Card>
        <Text style={styles.h2}>Daily Expense Ledger</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Date', 'Spender', 'Type', 'Amount', 'Paid To', 'Status', 'Attachment', 'Action']} />
            {!filteredRows.length ? <Text style={styles.empty}>No daily expenses for selected filters.</Text> : filteredRows.map((r) => (
              <View key={r._id} style={styles.tRow}>
                <Text style={styles.tCell}>{fmtDate(r.expenseDate)}</Text>
                <Text style={styles.tCell}>{r.spenderName || '-'}</Text>
                <Text style={styles.tCell}>{r.expenseType || r.category || '-'}</Text>
                <Text style={styles.tCell}>{money(r.amount)}</Text>
                <Text style={styles.tCell}>{r.paidTo || '-'}</Text>
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
          <Text style={styles.h2}>AIM Hygienic Daily Expense Receipt</Text>
          <KV label="Expense Date" value={fmtDate(selectedReceipt?.expenseDate)} />
          <KV label="Spender" value={selectedReceipt?.spenderName || '-'} />
          <KV label="Type" value={selectedReceipt?.expenseType || selectedReceipt?.category || '-'} />
          <KV label="Amount" value={money(selectedReceipt?.amount)} />
          <KV label="Status" value={selectedReceipt?.status || '-'} />
          <Text style={styles.note}>{selectedReceipt?.description || selectedReceipt?.notes || '-'}</Text>
          <View style={styles.action}><Pressable style={styles.btnAlt} onPress={() => setSelectedReceipt(null)}><Text>Close</Text></Pressable></View>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function fmtDate(v) { return v ? new Date(v).toLocaleDateString() : '-'; }
function money(v) { return `PKR ${Number(v || 0).toLocaleString()}`; }
function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }
function Metric({ label, value }) { return <View style={styles.metric}><Text style={styles.metricL}>{label}</Text><Text style={styles.metricV}>{value}</Text></View>; }
function Input({ label, multiline, ...props }) { return <View style={{ marginTop: 8 }}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline ? { minHeight: 72, textAlignVertical: 'top' } : null]} multiline={multiline} {...props} /></View>; }
function Selector({ title, value, items, onChange }) { return <View style={{ marginTop: 8 }}><Text style={styles.label}>{title}</Text><ScrollView horizontal contentContainerStyle={styles.rowWrap}>{items.map(([v, l]) => <Pressable key={String(v)} style={[styles.chip, value === v ? styles.chipActive : null]} onPress={() => onChange(v)}><Text style={value === v ? styles.chipTx : null}>{l}</Text></Pressable>)}</ScrollView></View>; }
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