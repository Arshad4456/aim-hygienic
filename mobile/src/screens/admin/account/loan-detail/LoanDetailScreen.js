import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const METHODS = [['cash', 'Cash'], ['bank_transfer', 'Bank Transfer'], ['cheque', 'Cheque'], ['online', 'Online']];
const BASE_LOAN = { partyName: '', partyType: 'Individual', phone: '', cnicNtn: '', principalAmount: '', loanDate: new Date().toISOString().slice(0, 10), dueDate: '', sourceAccountId: '', paymentMethod: 'cash', referenceNo: '', notes: '', attachmentUrl: '' };
const BASE_RETURN = { loanId: '', amount: '', paymentDate: new Date().toISOString().slice(0, 10), accountId: '', method: 'cash', referenceNo: '', notes: '', attachmentUrl: '' };

function fmt(n) { return Number(n || 0).toLocaleString(); }

export default function LoanDetailScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('received');
  const [accounts, setAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loanForm, setLoanForm] = useState(BASE_LOAN);
  const [returnForm, setReturnForm] = useState(BASE_RETURN);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanDetail, setLoanDetail] = useState(null);

  const openLoans = useMemo(() => loans.filter((l) => l.status === 'open' && Number(l.remainingAmount || 0) > 0), [loans]);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const [a, l, s] = await Promise.all([apiClient.get('/accounts'), apiClient.get(`/loans?loanType=${tab}`), apiClient.get('/loans/summary')]);
      setAccounts(a?.data?.accounts || []);
      setLoans(l?.data?.loans || []);
      setSummary(s?.data?.summary || null);
    } catch (e) { setErr(e.message || 'Failed to load loan detail'); }
    finally { setLoading(false); }
  };

  const loadDetail = async (id) => {
    if (!id) return setLoanDetail(null);
    try { const d = await apiClient.get(`/loans/${id}`); setLoanDetail(d?.data || null); }
    catch (e) { setErr(e.message || 'Failed to load loan detail'); }
  };

  useEffect(() => { load(); }, [tab]);
  useEffect(() => { if (selectedLoan) loadDetail(selectedLoan); }, [selectedLoan]);

  const createLoan = async () => {
    setErr('');
    try {
      await apiClient.post('/loans', { ...loanForm, loanType: tab, principalAmount: Number(loanForm.principalAmount || 0) });
      setLoanForm(BASE_LOAN);
      await load();
    } catch (e) { setErr(e.message || 'Failed to create loan'); }
  };

  const createReturn = async () => {
    if (!returnForm.loanId) return setErr('Select loan for return.');
    setErr('');
    try {
      await apiClient.post(`/loans/${returnForm.loanId}/payments`, { ...returnForm, amount: Number(returnForm.amount || 0) });
      setReturnForm(BASE_RETURN);
      await load();
      if (selectedLoan) await loadDetail(selectedLoan);
    } catch (e) { setErr(e.message || 'Failed to create return entry'); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Loan Detail</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <View style={styles.summaryGrid}>
          <Summary title="Received Loans (Open)" value={summary ? fmt(summary.totalReceivedLoansOpenAmount) : '0'} />
          <Summary title="Given Loans (Open)" value={summary ? fmt(summary.totalGivenLoansOpenAmount) : '0'} />
          <Summary title="Overdue Loans" value={summary?.overdueLoansCount || 0} />
          <Summary title="Upcoming Due (7d)" value={summary?.upcomingDueCount || 0} />
        </View>
        <View style={styles.tabRow}><Tab label="Received Loan" active={tab === 'received'} onPress={() => setTab('received')} /><Tab label="Given Loan" active={tab === 'given'} onPress={() => setTab('given')} /></View>
      </Card>

      <Card>
        <Text style={styles.h2}>{tab === 'received' ? 'Create Received Loan' : 'Create Given Loan'}</Text>
        <Input label={tab === 'received' ? 'Lender Name' : 'Borrower Name'} value={loanForm.partyName} onChangeText={(v) => setLoanForm((s) => ({ ...s, partyName: v }))} />
        <Input label="Type" value={loanForm.partyType} onChangeText={(v) => setLoanForm((s) => ({ ...s, partyType: v }))} />
        <Input label="Phone" value={loanForm.phone} onChangeText={(v) => setLoanForm((s) => ({ ...s, phone: v }))} />
        <Input label="CNIC/NTN" value={loanForm.cnicNtn} onChangeText={(v) => setLoanForm((s) => ({ ...s, cnicNtn: v }))} />
        <Input label="Loan Amount (PKR)" value={loanForm.principalAmount} onChangeText={(v) => setLoanForm((s) => ({ ...s, principalAmount: v }))} keyboardType="numeric" />
        <Input label="Loan Date (YYYY-MM-DD)" value={loanForm.loanDate} onChangeText={(v) => setLoanForm((s) => ({ ...s, loanDate: v }))} />
        <Input label="Due Date (YYYY-MM-DD)" value={loanForm.dueDate} onChangeText={(v) => setLoanForm((s) => ({ ...s, dueDate: v }))} />
        <Selector title="Account" value={loanForm.sourceAccountId} items={accounts.map((a) => [a._id, `${a.accountName} (${a.currency})`])} onChange={(v) => setLoanForm((s) => ({ ...s, sourceAccountId: v }))} />
        <Selector title="Payment Method" value={loanForm.paymentMethod} items={METHODS} onChange={(v) => setLoanForm((s) => ({ ...s, paymentMethod: v }))} />
        <Input label="Reference No" value={loanForm.referenceNo} onChangeText={(v) => setLoanForm((s) => ({ ...s, referenceNo: v }))} />
        <Input label="Attachment URL" value={loanForm.attachmentUrl} onChangeText={(v) => setLoanForm((s) => ({ ...s, attachmentUrl: v }))} />
        <Input label="Notes/Reason" value={loanForm.notes} onChangeText={(v) => setLoanForm((s) => ({ ...s, notes: v }))} multiline />
        <Pressable style={styles.btn} onPress={createLoan}><Text style={styles.btnTx}>Save Loan</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.h2}>{tab === 'received' ? 'Return Received Loan' : 'Return Given Loan'}</Text>
        <Selector title={`Select ${tab === 'received' ? 'Received' : 'Given'} Loan`} value={returnForm.loanId} items={openLoans.map((l) => [l._id, `${l.partyName} (Remaining ${fmt(l.remainingAmount)})`])} onChange={(v) => setReturnForm((s) => ({ ...s, loanId: v }))} />
        <Input label="Return Amount" value={returnForm.amount} onChangeText={(v) => setReturnForm((s) => ({ ...s, amount: v }))} keyboardType="numeric" />
        <Input label="Payment Date (YYYY-MM-DD)" value={returnForm.paymentDate} onChangeText={(v) => setReturnForm((s) => ({ ...s, paymentDate: v }))} />
        <Selector title="Account" value={returnForm.accountId} items={accounts.map((a) => [a._id, `${a.accountName} (${a.currency})`])} onChange={(v) => setReturnForm((s) => ({ ...s, accountId: v }))} />
        <Selector title="Method" value={returnForm.method} items={METHODS} onChange={(v) => setReturnForm((s) => ({ ...s, method: v }))} />
        <Input label="Reference" value={returnForm.referenceNo} onChangeText={(v) => setReturnForm((s) => ({ ...s, referenceNo: v }))} />
        <Input label="Attachment URL" value={returnForm.attachmentUrl} onChangeText={(v) => setReturnForm((s) => ({ ...s, attachmentUrl: v }))} />
        <Input label="Notes" value={returnForm.notes} onChangeText={(v) => setReturnForm((s) => ({ ...s, notes: v }))} multiline />
        <Pressable style={styles.btn} onPress={createReturn}><Text style={styles.btnTx}>Save Return</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.h2}>{tab === 'received' ? 'Received Loan List' : 'Given Loan List'}</Text>
        <ScrollView horizontal contentContainerStyle={styles.rowWrap}>{loans.map((l) => <Pressable key={l._id} style={[styles.chip, selectedLoan === l._id ? styles.chipActive : null]} onPress={() => setSelectedLoan(l._id)}><Text style={selectedLoan === l._id ? styles.chipTx : null}>{l.partyName}</Text></Pressable>)}</ScrollView>
      </Card>

      <Card>
        <Text style={styles.h2}>{tab === 'received' ? 'Received Loans Ledger' : 'Given Loan Ledger'}</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <View style={[styles.tRow, styles.tHead]}>{['Party', 'Loan Date', 'Due Date', 'Principal', 'Returned/Received', 'Remaining', 'Status'].map((h) => <Text key={h} style={styles.tCell}>{h}</Text>)}</View>
            {loans.map((l) => (
              <View key={l._id} style={styles.tRow}>
                <Text style={styles.tCell}>{l.partyName || '-'}</Text>
                <Text style={styles.tCell}>{String(l.loanDate || '').slice(0, 10) || '-'}</Text>
                <Text style={styles.tCell}>{String(l.dueDate || '').slice(0, 10) || '-'}</Text>
                <Text style={styles.tCell}>{fmt(l.principalAmount)}</Text>
                <Text style={styles.tCell}>{fmt(l.totalReturnedOrReceived)}</Text>
                <Text style={styles.tCell}>{fmt(l.remainingAmount)}</Text>
                <Text style={styles.tCell}>{l.status || '-'}</Text>
              </View>
            ))}
            {!loans.length ? <Text style={styles.empty}>No loans found.</Text> : null}
          </View>
        </ScrollView>
      </Card>

      {loanDetail?.loan ? (
        <Card>
          <Text style={styles.h2}>Loan Detail — {loanDetail.loan.partyName}</Text>
          <KV k="Principal" v={fmt(loanDetail.loan.principalAmount)} />
          <KV k="Total Returned/Received" v={fmt(loanDetail.loan.totalReturnedOrReceived)} />
          <KV k="Remaining" v={fmt(loanDetail.loan.remainingAmount)} />

          <Text style={[styles.h2, { marginTop: 12 }]}>Return History</Text>
          <ScrollView horizontal><View style={styles.table}><View style={[styles.tRow, styles.tHead]}>{['Date', 'Amount', 'Account', 'Method', 'Reference', 'Notes', 'Attachment'].map((h) => <Text key={h} style={styles.tCell}>{h}</Text>)}</View>
            {(loanDetail.payments || []).map((p) => <View key={p._id} style={styles.tRow}><Text style={styles.tCell}>{p.paymentDate ? new Date(p.paymentDate).toLocaleString() : '-'}</Text><Text style={styles.tCell}>{fmt(p.amount)}</Text><Text style={styles.tCell}>{p.accountId?.accountName || '-'}</Text><Text style={styles.tCell}>{p.method || '-'}</Text><Text style={styles.tCell}>{p.referenceNo || '-'}</Text><Text style={styles.tCell}>{p.notes || '-'}</Text><Text style={styles.tCell}>{p.attachmentUrl || '-'}</Text></View>)}
            {!(loanDetail.payments || []).length ? <Text style={styles.empty}>No return history yet.</Text> : null}
          </View></ScrollView>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Summary({ title, value }) { return <View style={styles.summary}><Text style={styles.sumTitle}>{title}</Text><Text style={styles.sumValue}>{String(value)}</Text></View>; }
function Tab({ label, active, onPress }) { return <Pressable style={[styles.tab, active ? styles.tabActive : null]} onPress={onPress}><Text style={active ? styles.tabTxActive : styles.tabTx}>{label}</Text></Pressable>; }
function Input({ label, multiline, ...props }) { return <View style={{ marginBottom: 8 }}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline ? { minHeight: 72, textAlignVertical: 'top' } : null]} multiline={multiline} {...props} /></View>; }
function Selector({ title, value, items, onChange }) { return <View style={{ marginBottom: 8 }}><Text style={styles.label}>{title}</Text><ScrollView horizontal contentContainerStyle={styles.rowWrap}>{items.map(([v, l]) => <Pressable key={v} style={[styles.chip, value === v ? styles.chipActive : null]} onPress={() => onChange(v)}><Text style={value === v ? styles.chipTx : null}>{l}</Text></Pressable>)}</ScrollView></View>; }
function KV({ k, v }) { return <View style={styles.kv}><Text style={styles.k}>{k}</Text><Text style={styles.v}>{String(v)}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 }, title: { fontSize: 22, fontWeight: '700' }, h2: { fontSize: 17, fontWeight: '700', marginBottom: 8 }, err: { color: '#b91c1c', marginTop: 6 },
  summaryGrid: { marginTop: 10, gap: 8 }, summary: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fff' }, sumTitle: { fontSize: 12, color: '#6b7280' }, sumValue: { marginTop: 4, fontSize: 18, fontWeight: '700' },
  tabRow: { marginTop: 10, flexDirection: 'row', gap: 8 }, tab: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f9fafb' }, tabActive: { backgroundColor: '#fff', borderColor: '#a7f3d0' }, tabTx: { color: '#52525b' }, tabTxActive: { color: '#111827', fontWeight: '700' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 }, input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  rowWrap: { flexDirection: 'row', gap: 8, paddingVertical: 2 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' }, chipActive: { backgroundColor: '#059669', borderColor: '#059669' }, chipTx: { color: '#fff' },
  btn: { borderRadius: 10, backgroundColor: '#059669', paddingVertical: 10, alignItems: 'center' }, btnTx: { color: '#fff', fontWeight: '700' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#f3f4f6', paddingVertical: 6 }, k: { color: '#6b7280' }, v: { fontWeight: '600' },
  table: { minWidth: 980, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHead: { backgroundColor: '#f8fafc' }, tCell: { width: 140, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  empty: { color: '#6b7280', padding: 10 },
});