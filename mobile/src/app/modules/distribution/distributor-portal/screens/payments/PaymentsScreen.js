import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../infrastructure/api/client';
import Card from '../../../../../foundation/ui/Card';
import Loader from '../../../../../foundation/ui/Loader';

function formatCurrency(value) {
  const n = Number(value || 0);
  return `Rs ${n.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB');
}

function deadlineLabel(status, days, remaining) {
  if (Number(remaining || 0) <= 0) return { text: 'Settled', style: styles.badgeSettled };
  if (status === 'overdue') return { text: 'Overdue', style: styles.badgeOverdue };
  if (status === 'due_soon') return { text: `Due in ${days} day${Number(days) === 1 ? '' : 's'}`, style: styles.badgeDueSoon };
  return { text: 'On Track', style: styles.badgeTrack };
}

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '' || v === 'all') return;
    q.set(k, v);
  });
  return q.toString();
}

export default function PaymentsScreen() {
  return <DistributorPaymentsModule mode="primary" title="Distributor Payments" subtitle="Track primary payments received from warehouse and your settlement progress." />;
}

export function DistributorPaymentsModule({ mode = 'primary', title, subtitle }) {
  const [primaryRows, setPrimaryRows] = useState([]);
  const [secondaryRows, setSecondaryRows] = useState([]);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [warehouseId, setWarehouseId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('all');

  const warehouseOptions = useMemo(() => {
    const source = mode === 'primary' ? primaryRows : secondaryRows;
    const seen = new Map();
    source.forEach((row) => {
      const id = String(row.warehouseId || '');
      if (!id || seen.has(id)) return;
      seen.set(id, row.warehouseName || 'Warehouse');
    });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [mode, primaryRows, secondaryRows]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const query = buildQuery({
        warehouse_id: warehouseId,
        start_date: startDate,
        end_date: endDate,
        status: mode === 'primary' ? status : undefined,
      });
      if (mode === 'primary') {
        const data = await apiClient.get(`/payments/primary?${query}`);
        setPrimaryRows(data?.data?.primaryPayments || []);
      } else {
        const data = await apiClient.get(`/payments/secondary?${query}`);
        setSecondaryRows(data?.data?.secondaryPayments || []);
      }
    } catch (error) {
      setErr(error?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [endDate, mode, startDate, status, warehouseId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const totalReceived = primaryRows.reduce((acc, row) => acc + Number(row.amountTotal || 0), 0);
    const totalPaidBack = primaryRows.reduce((acc, row) => acc + Number(row.amountPaidBack || 0), 0);
    const totalRemaining = primaryRows.reduce((acc, row) => acc + Number(row.amountRemaining || 0), 0);
    const overdue = primaryRows.filter((row) => row.deadlineStatus === 'overdue' && Number(row.amountRemaining || 0) > 0).length;
    const dueSoon = primaryRows.filter((row) => row.deadlineStatus === 'due_soon' && Number(row.amountRemaining || 0) > 0).length;
    return { totalReceived, totalPaidBack, totalRemaining, overdue, dueSoon };
  }, [primaryRows]);

  const openInvoice = async (invoiceNo) => {
    try {
      const data = await apiClient.get(`/payments/primary/${invoiceNo}`);
      setInvoiceDetail(data?.data || null);
    } catch (error) {
      setErr(error?.message || 'Failed to load invoice');
    }
  };

  if (loading && !(primaryRows.length || secondaryRows.length)) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}
      </Card>

      {mode === 'primary' ? (
        <>
          <View style={styles.metricsWrap}>
            <MetricCard label="Total Received" value={formatCurrency(totals.totalReceived)} />
            <MetricCard label="Total Paid Back" value={formatCurrency(totals.totalPaidBack)} />
            <MetricCard label="Total Remaining" value={formatCurrency(totals.totalRemaining)} />
          </View>
          <Card>
            <Text style={styles.warnText}>You have {totals.overdue} overdue invoice(s) and {totals.dueSoon} due soon invoice(s).</Text>
          </Card>
        </>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Filters</Text>
        <Text style={styles.label}>Warehouse</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          <View style={styles.filterChips}>
            <Chip label="All" active={warehouseId === 'all'} onPress={() => setWarehouseId('all')} />
            {warehouseOptions.map((w) => (
              <Chip key={w.value} label={w.label} active={warehouseId === w.value} onPress={() => setWarehouseId(w.value)} />
            ))}
          </View>
        </ScrollView>
        <Input label="From Date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        <Input label="To Date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
        {mode === 'primary' ? (
          <>
            <Text style={styles.label}>Status</Text>
            <View style={styles.filterChips}>
              <Chip label="All" active={status === 'all'} onPress={() => setStatus('all')} />
              <Chip label="Open" active={status === 'open'} onPress={() => setStatus('open')} />
              <Chip label="Closed" active={status === 'closed'} onPress={() => setStatus('closed')} />
            </View>
          </>
        ) : null}
        <Pressable style={styles.reloadBtn} onPress={load}><Text style={styles.reloadText}>{loading ? 'Loading...' : 'Apply Filters'}</Text></Pressable>
      </Card>

      <Card>
        {mode === 'primary' ? (
          <ScrollView horizontal>
            <View style={styles.tableWide}>
              <Row head cols={['Invoice No', 'Warehouse Name', 'Amount Total', 'Paid Back', 'Remaining', 'Pay Date', 'Return Date', 'Deadline', 'Action']} />
              {primaryRows.map((row) => {
                const badge = deadlineLabel(row.deadlineStatus, row.daysToDeadline, row.amountRemaining);
                return (
                  <View key={row._id} style={styles.row}>
                    <Text style={styles.cell}>{row.invoiceNo}</Text>
                    <Text style={styles.cell}>{row.warehouseName || '-'}</Text>
                    <Text style={styles.cell}>{formatCurrency(row.amountTotal)}</Text>
                    <Text style={styles.cell}>{formatCurrency(row.amountPaidBack)}</Text>
                    <Text style={styles.cell}>{formatCurrency(row.amountRemaining)}</Text>
                    <Text style={styles.cell}>{formatDate(row.payDate)}</Text>
                    <Text style={styles.cell}>{formatDate(row.returnDate)}</Text>
                    <View style={styles.cell}><Text style={[styles.badge, badge.style]}>{badge.text}</Text></View>
                    <View style={styles.cell}><Pressable style={styles.smallBtn} onPress={() => openInvoice(row.invoiceNo)}><Text style={styles.smallBtnText}>View Invoice/Receipt</Text></Pressable></View>
                  </View>
                );
              })}
              {!primaryRows.length ? <Text style={styles.empty}>{loading ? 'Loading...' : 'No primary payments found.'}</Text> : null}
            </View>
          </ScrollView>
        ) : (
          <ScrollView horizontal>
            <View style={styles.tableMid}>
              <Row head cols={['Primary Invoice-No', 'Warehouse Name', 'Paid Amount', 'Paid Date', 'Detail', 'Action']} />
              {secondaryRows.map((row) => (
                <View key={row._id} style={styles.row}>
                  <Text style={styles.cell}>{row.primaryInvoiceNo}</Text>
                  <Text style={styles.cell}>{row.warehouseName || '-'}</Text>
                  <Text style={styles.cell}>{formatCurrency(row.amountPaid)}</Text>
                  <Text style={styles.cell}>{formatDate(row.paidDate)}</Text>
                  <Text style={styles.cell}>{row.details || '-'}</Text>
                  <View style={styles.cell}><Pressable style={styles.smallBtn} onPress={() => openInvoice(row.primaryInvoiceNo)}><Text style={styles.smallBtnText}>View Receipt</Text></Pressable></View>
                </View>
              ))}
              {!secondaryRows.length ? <Text style={styles.empty}>{loading ? 'Loading...' : 'No secondary payments found.'}</Text> : null}
            </View>
          </ScrollView>
        )}
      </Card>

      {invoiceDetail?.primaryPayment ? <InvoiceModal detail={invoiceDetail} onClose={() => setInvoiceDetail(null)} /> : null}
    </ScrollView>
  );
}

function InvoiceModal({ detail, onClose }) {
  const p = detail.primaryPayment || {};
  const paid = Number(p.amountPaidBack || 0);
  const remaining = Number(p.amountRemaining || 0);
  const status = p.deadlineStatus;
  const days = p.daysToDeadline;
  const banner = remaining <= 0
    ? 'Invoice settled.'
    : status === 'overdue'
      ? `Payment overdue since ${formatDate(p.returnDate)}. Remaining: ${formatCurrency(remaining)}`
      : status === 'due_soon'
        ? `Payment due on ${formatDate(p.returnDate)} (in ${days} day${Number(days) === 1 ? '' : 's'}). Remaining: ${formatCurrency(remaining)}`
        : `On track. Payment deadline is ${formatDate(p.returnDate)}. Remaining: ${formatCurrency(remaining)}`;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Invoice Detail</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>Close</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.banner}>{banner}</Text>
            <Field label="Invoice No" value={p.invoiceNo} />
            <Field label="Warehouse" value={p.warehouseName} />
            <Field label="Distributor" value={p.distributorName} />
            <Field label="Amount Total" value={formatCurrency(p.amountTotal)} />
            <Field label="Pay Date" value={formatDate(p.payDate)} />
            <Field label="Return Date" value={formatDate(p.returnDate)} />
            <Field label="Paid Back" value={formatCurrency(paid)} />
            <Field label="Remaining" value={formatCurrency(remaining)} />
            <Field label="Details" value={p.details || '-'} />

            <Text style={styles.sectionTitle}>Settlement Records</Text>
            <View style={styles.settlementTable}>
              <Row head cols={['Paid Amount', 'Paid Date', 'Detail']} compact />
              {(detail.settlements || []).map((row) => (
                <Row key={row._id} cols={[formatCurrency(row.amountPaid), formatDate(row.paidDate), row.details || '-']} compact />
              ))}
              {!(detail.settlements || []).length ? <Text style={styles.empty}>No settlement records.</Text> : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '-'}</Text>
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

function Chip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active ? styles.chipActive : null]} onPress={onPress}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function Input({ label, value, onChangeText, placeholder }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

function Row({ cols, head, compact }) {
  return (
    <View style={[styles.row, head ? styles.headRow : null]}>
      {cols.map((c, i) => <Text key={`${i}-${c}`} style={[compact ? styles.compactCell : styles.cell, head ? styles.headCell : null]}>{String(c)}</Text>)}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  error: { marginTop: 8, color: '#b91c1c' },
  metricsWrap: { flexDirection: 'row', gap: 8 },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontSize: 18, fontWeight: '700', color: '#111827' },
  warnText: { color: '#92400e', fontSize: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2, marginBottom: 4 },
  label: { fontSize: 12, color: '#374151', marginTop: 6 },
  input: { marginTop: 5, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: '#111827' },
  filterChips: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 11, color: '#374151' },
  chipTextActive: { color: '#fff' },
  reloadBtn: { marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center', backgroundColor: '#fafafa' },
  reloadText: { fontSize: 12, fontWeight: '600', color: '#111827' },
  tableWide: { minWidth: 1400, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  tableMid: { minWidth: 1000, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  headRow: { backgroundColor: '#f8fafc' },
  cell: { width: 155, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 12 },
  compactCell: { width: 130, paddingHorizontal: 8, paddingVertical: 8, color: '#111827', fontSize: 12 },
  headCell: { fontWeight: '700' },
  empty: { color: '#6b7280', fontSize: 12, padding: 10 },
  smallBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff' },
  smallBtnText: { fontSize: 11, fontWeight: '600', color: '#111827' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: '600' },
  badgeSettled: { backgroundColor: '#dcfce7', color: '#166534' },
  badgeOverdue: { backgroundColor: '#fee2e2', color: '#991b1b' },
  badgeDueSoon: { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeTrack: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 12 },
  modalCard: { maxHeight: '90%', borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden' },
  modalHead: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  closeText: { fontSize: 12, fontWeight: '600', color: '#111827' },
  modalBody: { padding: 14, gap: 8 },
  banner: { borderWidth: 1, borderColor: '#fcd34d', backgroundColor: '#fffbeb', color: '#92400e', borderRadius: 10, padding: 10, fontSize: 12 },
  fieldWrap: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  fieldLabel: { color: '#6b7280', fontSize: 11 },
  fieldValue: { marginTop: 2, color: '#111827', fontSize: 13, fontWeight: '600' },
  settlementTable: { marginTop: 4, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
});