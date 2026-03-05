import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const ACCOUNT_TYPES = [
  ['bank', 'Bank Account'], ['cash', 'Cash Account'], ['easypaisa', 'Easypaisa'], ['jazzcash', 'JazzCash'], ['other', 'Other'],
];
const REFERENCE_TYPES = [
  ['primary_payment', 'Primary Payment'], ['secondary_payment', 'Secondary Payment'], ['expense', 'Expense'], ['salary', 'Salary'], ['supplier_payment', 'Supplier Payment'], ['manual_entry', 'Manual Entry'], ['other', 'Other'],
];

const NEW_ACCOUNT = {
  accountName: '', accountType: 'bank', bankName: 'Meezan Bank', branchName: '', branchCode: '', accountTitle: '', accountNumber: '', iban: '', swiftCode: '',
  openingBalance: '', openingDate: new Date().toISOString().slice(0, 10), currency: 'PKR', status: 'active', notes: '',
};
const NEW_TX = {
  type: 'cash_in', amount: '', transactionDate: new Date().toISOString().slice(0, 10), referenceType: 'manual_entry', referenceId: '', description: '', attachmentUrl: '',
};

function fmt(n) { return Number(n || 0).toLocaleString(); }

export default function ManageScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(NEW_ACCOUNT);
  const [txForm, setTxForm] = useState(NEW_TX);
  const [editModal, setEditModal] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const loadAccounts = useCallback(async () => {
    const res = await apiClient.get('/accounts');
    const next = res?.data?.accounts || [];
    setAccounts(next);
    setSelectedAccountId((prev) => prev && next.some((a) => a._id === prev) ? prev : next[0]?._id || null);
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) { setDetail(null); setTransactions([]); return; }
    const [d, t] = await Promise.all([apiClient.get(`/accounts/${id}`), apiClient.get(`/accounts/${id}/transactions`)]);
    setDetail(d?.data || null);
    setTransactions(t?.data?.transactions || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true); setErr('');
    try { await loadAccounts(); }
    catch (e) { setErr(e.message || 'Failed to load accounts'); }
    finally { setLoading(false); }
  }, [loadAccounts]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { if (selectedAccountId) loadDetail(selectedAccountId).catch((e) => setErr(e.message || 'Failed to load detail')); }, [selectedAccountId, loadDetail]);

  const expenseSplit = useMemo(() => {
    const out = { salary: 0, supplier_payment: 0, expense: 0, logistics: 0 };
    transactions.forEach((it) => {
      if (it.type !== 'cash_out') return;
      if (Object.prototype.hasOwnProperty.call(out, it.referenceType)) out[it.referenceType] += Number(it.amount || 0);
      else out.logistics += Number(it.amount || 0);
    });
    return out;
  }, [transactions]);

  const createAccount = async () => {
    setSaving(true); setErr('');
    try {
      await apiClient.post('/accounts', { ...form, openingBalance: Number(form.openingBalance || 0) });
      setForm(NEW_ACCOUNT);
      await loadAccounts();
    } catch (e) { setErr(e.message || 'Failed to create account'); }
    finally { setSaving(false); }
  };

  const updateAccount = async () => {
    if (!editModal?._id) return;
    setSaving(true); setErr('');
    try {
      await apiClient.put(`/accounts/${editModal._id}`, editModal);
      const id = editModal._id;
      setEditModal(null);
      await Promise.all([loadAccounts(), loadDetail(id)]);
    } catch (e) { setErr(e.message || 'Failed to update account'); }
    finally { setSaving(false); }
  };

  const deactivate = (id) => Alert.alert('Deactivate', 'Deactivate account?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Deactivate', style: 'destructive', onPress: async () => {
      try { await apiClient.patch(`/accounts/${id}/deactivate`); await Promise.all([loadAccounts(), loadDetail(id)]); }
      catch (e) { setErr(e.message || 'Failed to deactivate account'); }
    } },
  ]);

  const remove = (id) => Alert.alert('Delete', 'Delete this account and all transactions?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await apiClient.delete(`/accounts/${id}`); await loadAccounts(); }
      catch (e) { setErr(e.message || 'Failed to delete account'); }
    } },
  ]);

  const addTx = async () => {
    if (!selectedAccountId) return;
    setSaving(true); setErr('');
    try {
      await apiClient.post(`/accounts/${selectedAccountId}/transactions`, { ...txForm, amount: Number(txForm.amount || 0) });
      setTxForm(NEW_TX);
      await loadDetail(selectedAccountId);
    } catch (e) { setErr(e.message || 'Failed to add transaction'); }
    finally { setSaving(false); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Account Management</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.h2}>Create Account</Text>
        <Input label="Account Name" value={form.accountName} onChangeText={(v) => setForm((s) => ({ ...s, accountName: v }))} />
        <Dropdown label="Account Type" value={form.accountType} items={ACCOUNT_TYPES} onChange={(v) => setForm((s) => ({ ...s, accountType: v }))} />
        <Input label="Bank Name" value={form.bankName} onChangeText={(v) => setForm((s) => ({ ...s, bankName: v }))} />
        <Input label="Branch Name" value={form.branchName} onChangeText={(v) => setForm((s) => ({ ...s, branchName: v }))} />
        <Input label="Account Number" value={form.accountNumber} onChangeText={(v) => setForm((s) => ({ ...s, accountNumber: v }))} />
        <Input label="Opening Balance" value={form.openingBalance} onChangeText={(v) => setForm((s) => ({ ...s, openingBalance: v }))} keyboardType="numeric" />
        <Input label="Opening Date (YYYY-MM-DD)" value={form.openingDate} onChangeText={(v) => setForm((s) => ({ ...s, openingDate: v }))} />
        <Pressable style={styles.btn} onPress={createAccount} disabled={saving}><Text style={styles.btnText}>{saving ? 'Saving...' : 'Create Account'}</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.h2}>Accounts</Text>
        <ScrollView horizontal contentContainerStyle={styles.rowWrap}>
          {accounts.map((a) => (
            <Pressable key={a._id} style={[styles.chip, selectedAccountId === a._id ? styles.chipActive : null]} onPress={() => setSelectedAccountId(a._id)}>
              <Text style={selectedAccountId === a._id ? styles.chipActiveText : null}>{a.accountName}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      {detail?.account ? (
        <Card>
          <Text style={styles.h2}>Account Detail — {detail.account.accountName}</Text>
          <KV k="Type" v={detail.account.accountType} />
          <KV k="Currency" v={detail.account.currency || 'PKR'} />
          <KV k="Status" v={detail.account.status} />
          <KV k="Current Balance" v={fmt(detail.account.currentBalance)} />
          <KV k="Total Cash In" v={fmt(detail.account.totalCashIn)} />
          <KV k="Total Cash Out" v={fmt(detail.account.totalCashOut)} />

          <View style={styles.actionRow}>
            <Pressable style={styles.btnAlt} onPress={() => setEditModal(detail.account)}><Text>Edit</Text></Pressable>
            <Pressable style={styles.btnAlt} onPress={() => deactivate(detail.account._id)}><Text>Deactivate</Text></Pressable>
            <Pressable style={styles.btnDanger} onPress={() => remove(detail.account._id)}><Text style={{ color: '#991b1b' }}>Delete</Text></Pressable>
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.h2}>Add Transaction</Text>
        <Dropdown label="Type" value={txForm.type} items={[['cash_in', 'Cash In'], ['cash_out', 'Cash Out']]} onChange={(v) => setTxForm((s) => ({ ...s, type: v }))} />
        <Input label="Amount" value={txForm.amount} onChangeText={(v) => setTxForm((s) => ({ ...s, amount: v }))} keyboardType="numeric" />
        <Input label="Transaction Date (YYYY-MM-DD)" value={txForm.transactionDate} onChangeText={(v) => setTxForm((s) => ({ ...s, transactionDate: v }))} />
        <Dropdown label="Reference Type" value={txForm.referenceType} items={REFERENCE_TYPES} onChange={(v) => setTxForm((s) => ({ ...s, referenceType: v }))} />
        <Input label="Reference ID" value={txForm.referenceId} onChangeText={(v) => setTxForm((s) => ({ ...s, referenceId: v }))} />
        <Input label="Description" value={txForm.description} onChangeText={(v) => setTxForm((s) => ({ ...s, description: v }))} />
        <Input label="Attachment URL" value={txForm.attachmentUrl} onChangeText={(v) => setTxForm((s) => ({ ...s, attachmentUrl: v }))} />
        <Pressable style={styles.btn} onPress={addTx} disabled={saving || !selectedAccountId}><Text style={styles.btnText}>{saving ? 'Saving...' : 'Add Transaction'}</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.h2}>Expense Split</Text>
        <KV k="Salary" v={fmt(expenseSplit.salary)} />
        <KV k="Supplier Payment" v={fmt(expenseSplit.supplier_payment)} />
        <KV k="Expense" v={fmt(expenseSplit.expense)} />
        <KV k="Logistics" v={fmt(expenseSplit.logistics)} />
      </Card>

      <Card>
        <Text style={styles.h2}>Transaction Ledger</Text>
        <ScrollView horizontal><View style={styles.table}>{<Head />} {transactions.map((tx) => <Row key={tx._id} tx={tx} onReceipt={() => setReceipt(tx)} />)} {!transactions.length ? <Text style={styles.empty}>No transactions yet.</Text> : null}</View></ScrollView>
      </Card>

      <Modal visible={Boolean(editModal)} transparent animationType="fade" onRequestClose={() => setEditModal(null)}>
        <View style={styles.overlay}><View style={styles.modal}><Text style={styles.h2}>Edit Account</Text>
          <Input label="Account Name" value={editModal?.accountName || ''} onChangeText={(v) => setEditModal((s) => ({ ...s, accountName: v }))} />
          <Input label="Bank Name" value={editModal?.bankName || ''} onChangeText={(v) => setEditModal((s) => ({ ...s, bankName: v }))} />
          <Input label="Status" value={editModal?.status || ''} onChangeText={(v) => setEditModal((s) => ({ ...s, status: v }))} />
          <View style={styles.actionRow}><Pressable style={styles.btnAlt} onPress={() => setEditModal(null)}><Text>Cancel</Text></Pressable><Pressable style={styles.btn} onPress={updateAccount}><Text style={styles.btnText}>Update</Text></Pressable></View>
        </View></View>
      </Modal>

      <Modal visible={Boolean(receipt)} transparent animationType="fade" onRequestClose={() => setReceipt(null)}>
        <View style={styles.overlay}><View style={styles.modal}><Text style={styles.h2}>Transaction Receipt</Text>
          <KV k="Account" v={detail?.account?.accountName || '-'} />
          <KV k="Transaction ID" v={receipt?._id || '-'} />
          <KV k="Type" v={receipt?.type || '-'} />
          <KV k="Amount" v={fmt(receipt?.amount)} />
          <KV k="Date" v={receipt?.transactionDate ? new Date(receipt.transactionDate).toLocaleString() : '-'} />
          <KV k="Reference Type" v={String(receipt?.referenceType || '-').replaceAll('_', ' ')} />
          <KV k="Reference ID" v={receipt?.referenceId || '-'} />
          <KV k="Description" v={receipt?.description || '-'} />
          <Pressable style={styles.btnAlt} onPress={() => setReceipt(null)}><Text>Close</Text></Pressable>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function Head() { return <View style={[styles.tRow, styles.tHead]}>{['Date', 'Type', 'Amount', 'Ref Type', 'Ref ID', 'Description', 'Action'].map((h) => <Text key={h} style={styles.tCell}>{h}</Text>)}</View>; }
function Row({ tx, onReceipt }) { return <View style={styles.tRow}><Text style={styles.tCell}>{tx.transactionDate ? new Date(tx.transactionDate).toLocaleString() : '-'}</Text><Text style={styles.tCell}>{tx.type}</Text><Text style={styles.tCell}>{fmt(tx.amount)}</Text><Text style={styles.tCell}>{tx.referenceType}</Text><Text style={styles.tCell}>{tx.referenceId || '-'}</Text><Text style={styles.tCell}>{tx.description || '-'}</Text><View style={[styles.tCell, { width: 120 }]}><Pressable style={styles.btnAlt} onPress={onReceipt}><Text>Receipt</Text></Pressable></View></View>; }
function Input({ label, ...props }) { return <View style={{ marginBottom: 8 }}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} {...props} /></View>; }
function Dropdown({ label, value, items, onChange }) { return <View style={{ marginBottom: 8 }}><Text style={styles.label}>{label}</Text><ScrollView horizontal contentContainerStyle={styles.rowWrap}>{items.map(([v, l]) => <Pressable key={v} style={[styles.chip, value === v ? styles.chipActive : null]} onPress={() => onChange(v)}><Text style={value === v ? styles.chipActiveText : null}>{l}</Text></Pressable>)}</ScrollView></View>; }
function KV({ k, v }) { return <View style={styles.kv}><Text style={styles.k}>{k}</Text><Text style={styles.v}>{String(v ?? '-')}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 28 }, title: { fontSize: 22, fontWeight: '700' }, h2: { fontSize: 17, fontWeight: '700', marginBottom: 8 }, err: { color: '#b91c1c', marginTop: 6 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  rowWrap: { flexDirection: 'row', gap: 8, paddingVertical: 2 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' }, chipActive: { backgroundColor: '#059669', borderColor: '#059669' }, chipActiveText: { color: '#fff' },
  btn: { backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }, btnText: { color: '#fff', fontWeight: '700' },
  btnAlt: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center', backgroundColor: '#fff' }, btnDanger: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#f3f4f6', paddingVertical: 6 }, k: { color: '#6b7280' }, v: { fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  table: { minWidth: 980, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHead: { backgroundColor: '#f8fafc' }, tCell: { width: 140, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  empty: { color: '#6b7280', padding: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 14 }, modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
});
