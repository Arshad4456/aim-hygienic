import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

export default function ReceiptsScreen() {
  const [form, setForm] = useState({
    receiptType: 'invoice_payment',
    amount: '',
    paymentMethod: 'online',
    paidToAccountId: '',
    receivedByUserId: '',
    receivedByName: '',
    paymentDate: '',
    referenceNo: '',
    linkedInvoiceNo: '',
    notes: '',
    attachmentUrl: '',
  });
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [receiptsRes, accountsRes, usersRes, ordersRes, primaryTxRes] = await Promise.allSettled([
        apiClient.get('/receipts'),
        apiClient.get('/accounts'),
        apiClient.get('/users'),
        fetchPagedOrders(),
        apiClient.get('/inventory/transactions?transactionType=SALE_STOCK'),
      ]);

      setRows(receiptsRes.status === 'fulfilled' ? receiptsRes.value?.data?.receipts || [] : []);

      setAccounts(
        accountsRes.status === 'fulfilled'
          ? (accountsRes.value?.data?.accounts || []).filter((x) => String(x.status || 'active') === 'active')
          : []
      );

      setCollectors(
        usersRes.status === 'fulfilled'
          ? (usersRes.value?.data?.users || []).filter((x) =>
              ['salesman', 'cashier', 'order booker', 'orderbooker'].includes(String(x.role || '').toLowerCase())
            )
          : []
      );

      const orderInvoices =
        ordersRes.status === 'fulfilled'
          ? (ordersRes.value || []).filter((x) => ['approved', 'dispatched', 'delivered'].includes(String(x.status || '').toLowerCase()))
          : [];
      const primaryInvoices =
        primaryTxRes.status === 'fulfilled'
          ? mapPrimaryTransactionsToInvoices(primaryTxRes.value?.data?.transactions || [])
          : [];

      const byInvoiceNo = new Map();
      [...orderInvoices, ...primaryInvoices].forEach((item) => {
        const key = item.orderNo || item.invoiceNo || item._id;
        if (!key) return;
        byInvoiceNo.set(key, item);
      });
      setInvoices(Array.from(byInvoiceNo.values()));
    } catch (e) {
      setErr(e.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);
  const pendingCount = useMemo(() => rows.filter((r) => r.status === 'pending').length, [rows]);

  const accountOptions = useMemo(
    () => [
      { value: '', label: accounts.length ? 'Select Account' : 'No accounts available' },
      ...accounts.map((x) => ({
        value: x._id,
        label: x.accountName || [x.bankName, x.accountNumber].filter(Boolean).join(' - ') || x._id,
      })),
    ],
    [accounts]
  );

  const collectorOptions = useMemo(
    () => [
      { value: '', label: collectors.length ? 'Select Collector' : 'No collectors available' },
      ...collectors.map((x) => ({
        value: x._id,
        label: `${x.fullName || x.username || x.mobile} (${x.role || ''})`,
      })),
    ],
    [collectors]
  );

  const invoiceOptions = useMemo(
    () => [
      { value: '', label: invoices.length ? 'Select Invoice' : 'No approved/dispatched/delivered invoice' },
      ...invoices.map((x) => ({
        value: x.orderNo || x.invoiceNo || x._id,
        label: `${x.orderNo || x.invoiceNo || x._id} [${x.status || '-'}] (${x.saleType || '-'})`,
      })),
    ],
    [invoices]
  );

  const submit = async () => {
    if (!form.amount || !form.paymentDate) {
      setErr('Amount and payment date are required.');
      return;
    }
    if (form.paymentMethod === 'online' && !form.paidToAccountId) {
      setErr('Please select company account for online payment.');
      return;
    }
    if (form.paymentMethod === 'online' && !form.referenceNo) {
      setErr('Reference number is required for online payment.');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      const payload = {
        receiptType: form.receiptType,
        amount: Number(form.amount || 0),
        paymentMethod: form.paymentMethod,
        paidToAccountId: form.paymentMethod === 'online' ? form.paidToAccountId : undefined,
        receivedByUserId: form.paymentMethod === 'cash' ? form.receivedByUserId : undefined,
        receivedByName: form.paymentMethod === 'cash' ? form.receivedByName : undefined,
        paymentDate: form.paymentDate,
        referenceNo: form.referenceNo,
        linkedInvoiceNo: form.receiptType === 'invoice_payment' ? form.linkedInvoiceNo : '',
        notes: form.notes,
      };

      const created = await apiClient.post('/receipts', payload);
      const createdId = created?.data?.receipt?._id;

      if (form.attachmentUrl && createdId) {
        await apiClient.patch(`/receipts/${createdId}/attachment`, { attachmentUrl: form.attachmentUrl });
      }

      setForm((s) => ({
        ...s,
        amount: '',
        paymentDate: '',
        referenceNo: '',
        linkedInvoiceNo: '',
        notes: '',
        receivedByName: '',
        attachmentUrl: '',
      }));

      await load();
    } catch (e) {
      setErr(e.message || 'Failed to submit receipt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Generate Receipt</Text>
        <Text style={styles.subtitle}>Generate payment receipts and track admin approval status.</Text>
        <Text style={styles.hint}>For mobile parity, provide Attachment URL directly after uploading proof elsewhere.</Text>

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Selector
          label="Receipt Type"
          value={form.receiptType}
          onChange={(v) => setForm((s) => ({ ...s, receiptType: v }))}
          options={[
            { value: 'invoice_payment', label: 'Payment Against Invoice' },
            { value: 'advance_payment', label: 'Advance Payment' },
            { value: 'general_payment', label: 'General Payment' },
          ]}
        />

        <Input label="Amount" value={form.amount} onChangeText={(v) => setForm((s) => ({ ...s, amount: v }))} keyboardType="numeric" />

        <Selector
          label="Payment Method"
          value={form.paymentMethod}
          onChange={(v) => setForm((s) => ({ ...s, paymentMethod: v }))}
          options={[
            { value: 'online', label: 'Online (Bank Transfer)' },
            { value: 'cash', label: 'Cash' },
          ]}
        />

        {form.paymentMethod === 'online' ? (
          <Selector label="Company Account" value={form.paidToAccountId} onChange={(v) => setForm((s) => ({ ...s, paidToAccountId: v }))} options={accountOptions} />
        ) : null}

        {form.paymentMethod === 'cash' ? (
          <Selector label="Received By Person" value={form.receivedByUserId} onChange={(v) => setForm((s) => ({ ...s, receivedByUserId: v }))} options={collectorOptions} />
        ) : null}

        {form.paymentMethod === 'cash' ? (
          <Input label="Receiver Name (optional)" value={form.receivedByName} onChangeText={(v) => setForm((s) => ({ ...s, receivedByName: v }))} />
        ) : null}

        <Input label="Payment Date" value={form.paymentDate} onChangeText={(v) => setForm((s) => ({ ...s, paymentDate: v }))} placeholder="YYYY-MM-DD" />
        <Input label="Reference No" value={form.referenceNo} onChangeText={(v) => setForm((s) => ({ ...s, referenceNo: v }))} />

        {form.receiptType === 'invoice_payment' ? (
          <Selector
            label="Linked Invoice (optional)"
            value={form.linkedInvoiceNo}
            onChange={(v) => setForm((s) => ({ ...s, linkedInvoiceNo: v }))}
            options={invoiceOptions}
          />
        ) : null}

        <Input
          label="Attachment Proof URL"
          value={form.attachmentUrl}
          onChangeText={(v) => setForm((s) => ({ ...s, attachmentUrl: v }))}
          placeholder="https://..."
        />
        <Input label="Notes" value={form.notes} onChangeText={(v) => setForm((s) => ({ ...s, notes: v }))} />

        <Pressable style={[styles.submitBtn, saving ? styles.submitBtnDisabled : null]} disabled={saving} onPress={submit}>
          <Text style={styles.submitBtnText}>{saving ? 'Submitting...' : 'Submit Receipt'}</Text>
        </Pressable>
      </Card>

      <View style={styles.metricsWrap}>
        <MetricCard label="My Receipts" value={String(rows.length)} />
        <MetricCard label="My Total" value={`PKR ${total.toLocaleString()}`} />
        <MetricCard label="Pending" value={String(pendingCount)} />
      </View>

      <Card>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Receipt No', 'Amount', 'Payment', 'Paid To', 'Date', 'Linked Invoice', 'Status', 'Rejection Reason', 'Action']} />
            {!rows.length ? (
              <Text style={styles.empty}>No receipts yet.</Text>
            ) : (
              rows.map((r) => (
                <View key={r._id} style={styles.row}>
                  <Text style={styles.cell}>{r.receiptNo || '-'}</Text>
                  <Text style={styles.cell}>PKR {Number(r.amount || 0).toLocaleString()}</Text>
                  <Text style={styles.cell}>{r.paymentMethod || '-'}</Text>
                  <Text style={styles.cell}>{r.paymentMethod === 'online' ? (r.paidToAccountId?.accountName || '-') : (r.receivedByName || '-')}</Text>
                  <Text style={styles.cell}>{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '-'}</Text>
                  <Text style={styles.cell}>{r.linkedInvoiceNo || '-'}</Text>
                  <Text style={styles.cell}>{r.status || 'pending'}</Text>
                  <Text style={[styles.cell, styles.rejectCell]}>{r.rejectionReason || '-'}</Text>
                  <View style={styles.cell}>
                    {r.attachmentUrl ? (
                      <Pressable style={styles.urlBtn} onPress={() => Linking.openURL(r.attachmentUrl)}>
                        <Text style={styles.urlBtnText}>URL</Text>
                      </Pressable>
                    ) : (
                      <Text>-</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

async function fetchPagedOrders() {
  const limit = 200;
  let page = 1;
  let totalPages = 1;
  const allOrders = [];
  while (page <= totalPages) {
    const res = await apiClient.get(`/orders?limit=${limit}&page=${page}`);
    const data = res?.data || {};
    const rows = Array.isArray(data.orders) ? data.orders : [];
    allOrders.push(...rows);
    totalPages = Math.max(Number(data?.pagination?.totalPages) || 1, 1);
    page += 1;
  }
  return allOrders;
}

function mapPrimaryTransactionsToInvoices(transactions = []) {
  return transactions
    .filter((txn) => {
      const status = String(txn?.requestStatus || '').toUpperCase();
      return ['DISPATCHED', 'DELIVERED'].includes(status);
    })
    .map((txn) => ({
      _id: txn?._id || txn?.transactionCode,
      orderNo: txn?.transactionCode || txn?._id,
      invoiceNo: txn?.transactionCode || txn?._id,
      saleType: 'primary',
      status: String(txn?.requestStatus || '').toLowerCase(),
    }));
}

function Input({ label, value, onChangeText, placeholder, keyboardType }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

function Selector({ label, value, onChange, options }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipsWrap}>
          {options.map((o) => (
            <Pressable key={o.value} style={[styles.chip, value === o.value ? styles.chipActive : null]} onPress={() => onChange(o.value)}>
              <Text style={[styles.chipText, value === o.value ? styles.chipTextActive : null]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
  );
}

function Row({ cols, head }) {
  return (
    <View style={[styles.row, head ? styles.headRow : null]}>
      {cols.map((c) => (
        <Text key={c} style={[styles.cell, head ? styles.headText : null]}>{c}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26, gap: 12 },
  title: { fontSize: 21, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  hint: { marginTop: 4, color: '#1d4ed8', fontSize: 11 },
  err: { marginTop: 8, color: '#b91c1c' },
  fieldWrap: { marginTop: 8 },
  label: { fontSize: 12, color: '#52525b', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: '#111827' },
  chipsWrap: { flexDirection: 'row', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { color: '#374151', fontSize: 11 },
  chipTextActive: { color: '#fff' },
  submitBtn: { marginTop: 10, borderRadius: 10, backgroundColor: '#059669', alignItems: 'center', paddingVertical: 10 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  metricsWrap: { flexDirection: 'row', gap: 8 },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontWeight: '700', color: '#111827' },
  table: { minWidth: 1200, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  headRow: { backgroundColor: '#f8fafc' },
  cell: { width: 130, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 11 },
  headText: { fontWeight: '700' },
  rejectCell: { color: '#be123c' },
  urlBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, alignSelf: 'flex-start' },
  urlBtnText: { fontSize: 11, fontWeight: '600', color: '#111827' },
  empty: { color: '#6b7280', fontSize: 12, padding: 10 },
});
