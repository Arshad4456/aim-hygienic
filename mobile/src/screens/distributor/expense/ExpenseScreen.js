import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

const types = [
  { value: 'builty', label: 'Builty Expense' },
  { value: 'credit_note', label: 'Credit Note Expense' },
  { value: 'support', label: 'Additional Support' },
  { value: 'claim_discount', label: 'Discount Claim' },
  { value: 'claim_offer', label: 'Offer Claim' },
  { value: 'claim_coupon', label: 'Coupon/Lucky Draw Claim' },
];

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'online', label: 'Online' },
  { value: 'cheque', label: 'Cheque' },
];

export default function ExpenseScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState(null);
  const [currentUser, setCurrentUser] = useState({});
  const [loadingUser, setLoadingUser] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    subType: 'builty',
    expenseDate: '',
    amount: '',
    paymentMethod: 'cash',
    referenceNo: '',
    paidTo: '',
    description: '',
    attachmentUrl: '',
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setErr('');
      try {
        const me = await apiClient.get('/users/me');
        const user = me?.data?.user || {};
        if (!mounted) return;
        setCurrentUser(user);

        const expensesRes = await apiClient.get('/expenses?section=distributor');
        const expenses = expensesRes?.data?.expenses || [];
        const distributorId = user?._id || user?.id;
        const mine = expenses.filter((x) => String(x?.distributorId || '') === String(distributorId || ''));
        if (!mounted) return;
        setRows(mine);
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load distributor expenses');
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingUser(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const autoTerritory = useMemo(
    () =>
      currentUser?.territoryName ||
      currentUser?.territory ||
      currentUser?.areaName ||
      currentUser?.zoneName ||
      currentUser?.regionName ||
      currentUser?.fieldName ||
      '',
    [currentUser]
  );

  const totalExpense = useMemo(() => rows.reduce((sum, r) => sum + Number(r?.amount || 0), 0), [rows]);

  const monthlyTotal = useMemo(() => {
    const now = new Date();
    return rows
      .filter((r) => {
        const d = new Date(r?.expenseDate || r?.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, r) => sum + Number(r?.amount || 0), 0);
  }, [rows]);

  const submit = async () => {
    const territory = autoTerritory || '';
    if (!territory) {
      Alert.alert('Territory not configured', 'Territory is not configured for this distributor. Please contact admin.');
      return;
    }
    if (!form.expenseDate || !form.amount || !form.description) {
      Alert.alert('Missing fields', 'Please fill date, amount and description.');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      const payload = {
        section: 'distributor',
        subType: form.subType,
        category: form.subType,
        distributorId: currentUser?._id || currentUser?.id,
        territory,
        expenseDate: form.expenseDate,
        amount: Number(form.amount || 0),
        paymentMethod: form.paymentMethod,
        paymentMode: form.paymentMethod === 'online' ? 'bank_transfer' : form.paymentMethod,
        paidTo: form.paidTo,
        paymentReference: form.referenceNo,
        description: form.description,
        notes: form.description,
        attachmentUrl: form.attachmentUrl,
        approvalRequired: true,
        status: 'pending',
        title: 'Distributor submitted expense',
        expenseId: `DSE-${Date.now()}`,
      };

      const res = await apiClient.post('/expenses', payload);
      const next = res?.data?.expense;
      if (next) setRows((s) => [next, ...s]);

      setForm((s) => ({
        ...s,
        amount: '',
        expenseDate: '',
        referenceNo: '',
        paidTo: '',
        description: '',
        attachmentUrl: '',
      }));
    } catch (e) {
      setErr(e.message || 'Failed to submit expense');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Submit Distributor Expense</Text>
        <Text style={styles.subtitle}>Every submitted expense remains pending until Admin approves or rejects it.</Text>

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Input label="Territory/Region" value={loadingUser ? 'Loading...' : autoTerritory || 'Not configured'} editable={false} />
        <Selector
          label="Expense Type"
          value={form.subType}
          onChange={(v) => setForm((s) => ({ ...s, subType: v }))}
          options={types}
        />
        <Input label="Date" value={form.expenseDate} onChangeText={(v) => setForm((s) => ({ ...s, expenseDate: v }))} placeholder="YYYY-MM-DD" />
        <Input label="Amount" value={form.amount} onChangeText={(v) => setForm((s) => ({ ...s, amount: v }))} keyboardType="numeric" />
        <Selector
          label="Payment Method"
          value={form.paymentMethod}
          onChange={(v) => setForm((s) => ({ ...s, paymentMethod: v }))}
          options={paymentMethods}
        />
        <Input label="Reference No" value={form.referenceNo} onChangeText={(v) => setForm((s) => ({ ...s, referenceNo: v }))} />
        <Input label="Paid To" value={form.paidTo} onChangeText={(v) => setForm((s) => ({ ...s, paidTo: v }))} />
        <Input label="Description" value={form.description} onChangeText={(v) => setForm((s) => ({ ...s, description: v }))} multiline />
        <Input label="Attachment URL" value={form.attachmentUrl} onChangeText={(v) => setForm((s) => ({ ...s, attachmentUrl: v }))} />

        <Pressable style={[styles.btn, saving ? styles.btnDisabled : null]} onPress={submit} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Submitting...' : 'Submit Expense'}</Text>
        </Pressable>
      </Card>

      <View style={styles.metricsWrap}>
        <Metric label="Total Expense" value={`PKR ${totalExpense.toLocaleString()}`} />
        <Metric label="This Month Total Expense" value={`PKR ${monthlyTotal.toLocaleString()}`} />
      </View>

      <Card>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Date', 'Type', 'Amount', 'Territory', 'Reference', 'Status', 'Admin Decision', 'Action']} />
            {rows.map((r) => (
              <Row
                key={r?._id || r?.expenseId}
                cols={[
                  r?.expenseDate ? new Date(r.expenseDate).toLocaleDateString() : '-',
                  r?.subType || '-',
                  `PKR ${Number(r?.amount || 0).toLocaleString()}`,
                  r?.territory || '-',
                  r?.paymentReference || '-',
                  r?.status || 'pending',
                  r?.status === 'approved'
                    ? `Approved by ${r?.approvedBy || 'Admin'}`
                    : r?.status === 'rejected'
                      ? 'Rejected by Admin'
                      : 'Awaiting review',
                  'Preview',
                ]}
                onPreview={() => setPreview(r)}
              />
            ))}
            {!rows.length ? <Text style={styles.empty}>No expenses submitted yet.</Text> : null}
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(preview)} transparent animationType="slide" onRequestClose={() => setPreview(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Expense Preview</Text>
              <Pressable style={styles.closeBtn} onPress={() => setPreview(null)}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              <PreviewRow label="Expense ID" value={preview?.expenseId || preview?._id} />
              <PreviewRow label="Date" value={preview?.expenseDate ? new Date(preview.expenseDate).toLocaleDateString() : '-'} />
              <PreviewRow label="Type" value={preview?.subType || '-'} />
              <PreviewRow label="Amount" value={`PKR ${Number(preview?.amount || 0).toLocaleString()}`} />
              <PreviewRow label="Territory" value={preview?.territory || '-'} />
              <PreviewRow label="Payment Method" value={String(preview?.paymentMethod || '-').toUpperCase()} />
              <PreviewRow label="Reference" value={preview?.paymentReference || '-'} />
              <PreviewRow label="Paid To" value={preview?.paidTo || '-'} />
              <PreviewRow label="Status" value={preview?.status || 'pending'} />
              <PreviewRow label="Attachment" value={preview?.attachmentUrl || '-'} />
              <Text style={styles.descTitle}>Description</Text>
              <Text style={styles.descText}>{preview?.description || preview?.notes || '-'}</Text>
            </ScrollView>
            <Pressable style={[styles.btn, { marginTop: 12 }]} onPress={() => setPreview(null)}>
              <Text style={styles.btnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Input({ label, multiline, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.textarea : null]}
        placeholderTextColor="#9ca3af"
        multiline={Boolean(multiline)}
        {...props}
      />
    </View>
  );
}

function Selector({ label, value, onChange, options }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipsWrap}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, value === opt.value ? styles.chipActive : null]}
          >
            <Text style={[styles.chipText, value === opt.value ? styles.chipTextActive : null]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
  );
}

function Row({ cols, head, onPreview }) {
  return (
    <View style={[styles.row, head ? styles.head : null]}>
      {cols.map((col, idx) => {
        if (!head && idx === cols.length - 1) {
          return (
            <View key={`${idx}-${col}`} style={styles.cell}>
              <Pressable onPress={onPreview} style={styles.previewBtn}>
                <Text style={styles.previewBtnText}>Preview</Text>
              </Pressable>
            </View>
          );
        }
        return (
          <Text key={`${idx}-${col}`} style={styles.cell}>
            {String(col)}
          </Text>
        );
      })}
    </View>
  );
}

function PreviewRow({ label, value }) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={styles.previewValue}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26, gap: 12 },
  title: { fontSize: 21, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  err: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
  fieldWrap: { marginTop: 10, gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textarea: { minHeight: 84, textAlignVertical: 'top' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 11, color: '#374151' },
  chipTextActive: { color: '#fff' },
  btn: { marginTop: 12, borderRadius: 10, backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  metricsWrap: { flexDirection: 'row', gap: 8 },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontWeight: '700', color: '#111827' },
  table: { minWidth: 1200, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 150, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  previewBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  previewBtnText: { color: '#4338ca', fontWeight: '700', fontSize: 11 },
  empty: { color: '#6b7280', padding: 10, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 12 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  closeText: { color: '#111827', fontSize: 12, fontWeight: '700' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: '#f4f4f5', paddingVertical: 6 },
  previewLabel: { color: '#6b7280', fontSize: 12 },
  previewValue: { color: '#111827', fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  descTitle: { marginTop: 10, fontSize: 13, fontWeight: '700', color: '#111827' },
  descText: { marginTop: 4, color: '#374151', fontSize: 12 },
});
