import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';
import Loader from '../../../../../../foundation/ui/Loader';

const statusColors = {
  pending: { bg: '#fef3c7', tx: '#92400e' },
  approved: { bg: '#dcfce7', tx: '#166534' },
  rejected: { bg: '#ffe4e6', tx: '#9f1239' },
};

export default function ReceiptsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: 'all', paymentMethod: 'all', fromDate: '', toDate: '' });
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [receiptView, setReceiptView] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const q = new URLSearchParams();
      if (filters.status !== 'all') q.set('status', filters.status);
      if (filters.paymentMethod !== 'all') q.set('paymentMethod', filters.paymentMethod);
      if (filters.fromDate) q.set('fromDate', filters.fromDate);
      if (filters.toDate) q.set('toDate', filters.toDate);
      const data = await apiClient.get(`/receipts?${q.toString()}`);
      setRows(data?.data?.receipts || []);
    } catch (e) { setError(e.message || 'Failed to load receipts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.status, filters.paymentMethod, filters.fromDate, filters.toDate]);

  const totals = useMemo(() => rows.reduce((acc, r) => {
    acc.total += Number(r.amount || 0);
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, { total: 0, pending: 0, approved: 0, rejected: 0 }), [rows]);

  const approve = async (id) => {
    try {
      await apiClient.post(`/receipts/${id}/approve`);
      await load();
    } catch (e) { Alert.alert('Error', e.message || 'Failed to approve receipt'); }
  };

  const reject = async () => {
    if (!rejecting) return;
    try {
      await apiClient.post(`/receipts/${rejecting._id}/reject`, { reason });
      setRejecting(null);
      setReason('');
      await load();
    } catch (e) { Alert.alert('Error', e.message || 'Failed to reject receipt'); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Receipts (Central Approval Queue)</Text>
        <Text style={styles.subtitle}>Only approved receipts are posted to account balances and invoice settlement.</Text>

        <View style={styles.kpiGrid}>
          <StatCard label="Total Amount" value={`PKR ${totals.total.toLocaleString()}`} />
          <StatCard label="Pending" value={String(totals.pending)} />
          <StatCard label="Approved" value={String(totals.approved)} />
          <StatCard label="Rejected" value={String(totals.rejected)} />
        </View>

        <View style={styles.filterGrid}>
          <Input label="Status" value={filters.status} onChangeText={(v) => setFilters((s) => ({ ...s, status: v }))} placeholder="pending/approved/rejected/all" />
          <Input label="Payment Method" value={filters.paymentMethod} onChangeText={(v) => setFilters((s) => ({ ...s, paymentMethod: v }))} placeholder="all/online/cash" />
          <Input label="From Date" value={filters.fromDate} onChangeText={(v) => setFilters((s) => ({ ...s, fromDate: v }))} placeholder="YYYY-MM-DD" />
          <Input label="To Date" value={filters.toDate} onChangeText={(v) => setFilters((s) => ({ ...s, toDate: v }))} placeholder="YYYY-MM-DD" />
          <Pressable style={styles.btnAlt} onPress={() => setFilters({ status: 'pending', paymentMethod: 'all', fromDate: '', toDate: '' })}><Text>Reset</Text></Pressable>
        </View>

        {error ? <Text style={styles.err}>{error}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.h2}>Receipt Ledger</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Receipt No', 'Payer Role', 'Payer Name', 'Amount', 'Payment', 'Paid To', 'Payment Date', 'Reference', 'Linked Invoice', 'Status', 'Created At', 'Actions']} />
            {!rows.length ? <Text style={styles.empty}>No receipts found.</Text> : rows.map((r) => {
              const badge = statusColors[r.status] || { bg: '#f4f4f5', tx: '#3f3f46' };
              return (
                <View key={r._id} style={styles.tRow}>
                  <Text style={styles.tCell}>{r.receiptNo || '-'}</Text>
                  <Text style={styles.tCell}>{r.payerRole || '-'}</Text>
                  <Text style={styles.tCell}>{r.payerName || '-'}</Text>
                  <Text style={styles.tCell}>PKR {Number(r.amount || 0).toLocaleString()}</Text>
                  <Text style={styles.tCell}>{String(r.paymentMethod || '-').toUpperCase()}</Text>
                  <Text style={styles.tCell}>{r.paymentMethod === 'online' ? (r.paidToAccountId?.accountName || '-') : (r.receivedByUserId?.fullName || r.receivedByName || '-')}</Text>
                  <Text style={styles.tCell}>{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '-'}</Text>
                  <Text style={styles.tCell}>{r.referenceNo || '-'}</Text>
                  <Text style={styles.tCell}>{r.linkedInvoiceNo || '-'}</Text>
                  <View style={styles.tCell}><Text style={[styles.badge, { backgroundColor: badge.bg, color: badge.tx }]}>{r.status || 'pending'}</Text></View>
                  <Text style={styles.tCell}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</Text>
                  <View style={[styles.tCell, styles.actionsCell]}>
                    <Pressable style={styles.btnAlt} onPress={() => setReceiptView(r)}><Text>View Receipt</Text></Pressable>
                    {r.attachmentUrl ? <Pressable style={styles.btnAlt} onPress={() => Linking.openURL(r.attachmentUrl)}><Text>URL</Text></Pressable> : null}
                    {r.status === 'pending' ? <Pressable style={styles.btnOk} onPress={() => approve(r._id)}><Text style={styles.btnOkTx}>Approve</Text></Pressable> : null}
                    {r.status === 'pending' ? <Pressable style={styles.btnDanger} onPress={() => setRejecting(r)}><Text style={styles.btnDangerTx}>Reject</Text></Pressable> : null}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(receiptView)} transparent animationType="fade" onRequestClose={() => setReceiptView(null)}>
        <View style={styles.overlay}><View style={styles.modal}>
          <Text style={styles.h2}>Receipt Preview</Text>
          <KV k="Receipt No" v={receiptView?.receiptNo} /><KV k="Status" v={receiptView?.status} />
          <KV k="Payer" v={receiptView?.payerName} /><KV k="Role" v={receiptView?.payerRole} />
          <KV k="Amount" v={`PKR ${Number(receiptView?.amount || 0).toLocaleString()}`} /><KV k="Payment" v={receiptView?.paymentMethod} />
          <KV k="Paid To" v={receiptView?.paymentMethod === 'online' ? (receiptView?.paidToAccountId?.accountName || '-') : (receiptView?.receivedByUserId?.fullName || receiptView?.receivedByName || '-')} />
          <KV k="Payment Date" v={receiptView?.paymentDate ? new Date(receiptView.paymentDate).toLocaleDateString() : '-'} />
          <KV k="Reference" v={receiptView?.referenceNo || '-'} /><KV k="Linked Invoice" v={receiptView?.linkedInvoiceNo || '-'} />
          <Text style={styles.noteTitle}>Description / Notes</Text>
          <Text style={styles.note}>{receiptView?.notes || '-'}</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.btnAlt} onPress={() => setReceiptView(null)}><Text>Close</Text></Pressable>
            <Pressable
              style={styles.btnOk}
              onPress={() => {
                const html = `<html><body style="font-family:Arial,sans-serif;padding:18px;color:#111;"><h2 style="margin:0">Rawyan ERP</h2><div style="font-size:12px;color:#555;margin-bottom:12px;">Payment Receipt (Admin Review Copy)</div><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;"><tr><td><b>Receipt No</b></td><td>${escapeHtml(receiptView?.receiptNo)}</td><td><b>Status</b></td><td>${escapeHtml(receiptView?.status)}</td></tr><tr><td><b>Payer</b></td><td>${escapeHtml(receiptView?.payerName || '-')}</td><td><b>Payer Role</b></td><td>${escapeHtml(receiptView?.payerRole || '-')}</td></tr><tr><td><b>Amount</b></td><td>PKR ${Number(receiptView?.amount || 0).toLocaleString()}</td><td><b>Payment Method</b></td><td>${escapeHtml(receiptView?.paymentMethod || '-')}</td></tr><tr><td><b>Paid To</b></td><td colspan="3">${escapeHtml(receiptView?.paymentMethod === 'online' ? (receiptView?.paidToAccountId?.accountName || '-') : (receiptView?.receivedByUserId?.fullName || receiptView?.receivedByName || '-'))}</td></tr><tr><td><b>Payment Date</b></td><td>${receiptView?.paymentDate ? new Date(receiptView.paymentDate).toLocaleDateString() : '-'}</td><td><b>Reference</b></td><td>${escapeHtml(receiptView?.referenceNo || '-')}</td></tr><tr><td><b>Linked Invoice</b></td><td>${escapeHtml(receiptView?.linkedInvoiceNo || '-')}</td><td><b>Created At</b></td><td>${receiptView?.createdAt ? new Date(receiptView.createdAt).toLocaleString() : '-'}</td></tr><tr><td><b>Description / Notes</b></td><td colspan="3">${escapeHtml(receiptView?.notes || '-')}</td></tr></table></body></html>`;
                Linking.openURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
              }}
            ><Text style={styles.btnOkTx}>Print Receipt</Text></Pressable>
          </View>
        </View></View>
      </Modal>

      <Modal visible={Boolean(rejecting)} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <View style={styles.overlay}><View style={styles.modal}>
          <Text style={styles.h2}>Reject {rejecting?.receiptNo || 'Receipt'}</Text>
          <Input label="Rejection Reason" value={reason} onChangeText={setReason} multiline />
          <View style={styles.actionRow}>
            <Pressable style={styles.btnAlt} onPress={() => setRejecting(null)}><Text>Cancel</Text></Pressable>
            <Pressable style={styles.btnDanger} onPress={reject}><Text style={styles.btnDangerTx}>Submit Reject</Text></Pressable>
          </View>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function escapeHtml(value) { return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }
function StatCard({ label, value }) { return <View style={styles.statCard}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }
function Input({ label, multiline, ...props }) { return <View style={{ marginBottom: 8 }}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline ? { minHeight: 80, textAlignVertical: 'top' } : null]} multiline={multiline} {...props} /></View>; }
function KV({ k, v }) { return <View style={styles.kv}><Text style={styles.kvK}>{k}</Text><Text style={styles.kvV}>{v || '-'}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  h2: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  err: { color: '#b91c1c', marginTop: 8 },
  kpiGrid: { marginTop: 10, gap: 8 },
  statCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { marginTop: 4, fontWeight: '700', color: '#111827' },
  filterGrid: { marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fafafa', padding: 10 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  table: { minWidth: 1320, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  tHead: { backgroundColor: '#f8fafc' },
  tCell: { width: 150, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  actionsCell: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  empty: { color: '#6b7280', padding: 10 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', fontSize: 11, fontWeight: '700' },
  btnAlt: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
  btnOk: { borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 8, backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
  btnOkTx: { color: '#065f46', fontWeight: '700' },
  btnDanger: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, backgroundColor: '#fff1f2', paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
  btnDangerTx: { color: '#9f1239', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12, maxHeight: '90%' },
  actionRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 5, gap: 8 },
  kvK: { color: '#6b7280' },
  kvV: { color: '#111827', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  noteTitle: { marginTop: 8, fontWeight: '700', color: '#111827' },
  note: { marginTop: 2, color: '#374151' },
});