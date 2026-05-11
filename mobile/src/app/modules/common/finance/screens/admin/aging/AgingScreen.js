import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';
import Loader from '../../../../../../foundation/ui/Loader';

const buckets = ['current', '1_30', '31_60', '61_90', '91_120', '120_plus'];

function getBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1_30';
  if (daysOverdue <= 60) return '31_60';
  if (daysOverdue <= 90) return '61_90';
  if (daysOverdue <= 120) return '91_120';
  return '120_plus';
}

export default function AgingScreen() {
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [party, setParty] = useState(null);
  const [filters, setFilters] = useState({ entityType: 'both', status: 'all', fromDate: '', toDate: '', asOfDate: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    let active = true;
    Promise.all([apiClient.get('/orders?limit=500'), apiClient.get('/receipts?status=approved')])
      .then(([o, r]) => {
        if (!active) return;
        setOrders(o?.data?.orders || []);
        setReceipts(r?.data?.receipts || []);
      })
      .catch((e) => { if (active) setError(e.message || 'Failed to load aging report'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const computed = useMemo(() => {
    const asOf = new Date(`${filters.asOfDate}T23:59:59`);
    const delivered = orders.filter((o) => String(o.status || '').toLowerCase() === 'delivered');

    const items = delivered
      .filter((o) => {
        const t = String(o.saleType || '').toLowerCase();
        if (filters.entityType === 'customer') return t === 'secondary';
        if (filters.entityType === 'distributor') return t === 'primary';
        return true;
      })
      .filter((o) => {
        const invoiceDate = new Date(o.invoiceGeneratedAt || o.deliveredAt || o.updatedAt || o.createdAt || '1970-01-01T00:00:00Z');
        if (filters.fromDate && invoiceDate < new Date(`${filters.fromDate}T00:00:00`)) return false;
        if (filters.toDate && invoiceDate > new Date(`${filters.toDate}T23:59:59`)) return false;
        return true;
      })
      .map((o) => {
        const invoiceNo = o.invoiceNo || o.orderNo || String(o._id);
        const invoiceDate = new Date(o.invoiceGeneratedAt || o.deliveredAt || o.updatedAt || o.createdAt || '1970-01-01T00:00:00Z');
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        const paid = receipts
          .filter((r) => r.linkedInvoiceNo === invoiceNo || String(r.linkedOrderId || '') === String(o._id || ''))
          .reduce((s, r) => s + Number(r.amount || 0), 0);
        const total = Number(o.totalAmount || 0);
        const remaining = Math.max(0, total - paid);
        const daysOverdue = Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000);
        return {
          order: o,
          invoiceNo,
          partyName: o.distributorName || o.customerName || o.fromEntityName || 'Unknown',
          partyType: String(o.saleType || '').toLowerCase() === 'primary' ? 'Distributor' : 'Customer',
          invoiceDate,
          dueDate,
          total,
          paid,
          remaining,
          daysOverdue,
          bucket: getBucket(daysOverdue),
        };
      })
      .filter((x) => x.remaining > 0)
      .filter((x) => {
        if (filters.status === 'all') return true;
        if (filters.status === 'unpaid') return x.paid <= 0;
        if (filters.status === 'partial') return x.paid > 0 && x.remaining > 0;
        return true;
      });

    const grouped = new Map();
    items.forEach((it) => {
      const key = `${it.partyType}:${it.partyName}`;
      if (!grouped.has(key)) grouped.set(key, { key, partyName: it.partyName, partyType: it.partyType, current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '91_120': 0, '120_plus': 0, total: 0, details: [] });
      const row = grouped.get(key);
      row[it.bucket] += it.remaining;
      row.total += it.remaining;
      row.details.push(it);
    });

    const table = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
    const summary = table.reduce((acc, r) => {
      buckets.forEach((b) => { acc[b] += r[b]; });
      acc.total += r.total;
      return acc;
    }, { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '91_120': 0, '120_plus': 0, total: 0 });

    return { table, summary };
  }, [orders, receipts, filters]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>AR Aging Report</Text>
        <Text style={styles.subtitle}>Outstanding invoice balances with standard aging buckets.</Text>

        <View style={styles.grid}>
          <MiniCard label="Total Outstanding" value={`PKR ${computed.summary.total.toLocaleString()}`} />
          <MiniCard label="Current" value={`PKR ${computed.summary.current.toLocaleString()}`} />
          <MiniCard label="1-30" value={`PKR ${computed.summary['1_30'].toLocaleString()}`} />
          <MiniCard label="31-60" value={`PKR ${computed.summary['31_60'].toLocaleString()}`} />
          <MiniCard label="61-90" value={`PKR ${computed.summary['61_90'].toLocaleString()}`} />
          <MiniCard label="91-120" value={`PKR ${computed.summary['91_120'].toLocaleString()}`} />
          <MiniCard label="120+" value={`PKR ${computed.summary['120_plus'].toLocaleString()}`} />
          <MiniCard label="Top Overdue" value={computed.table[0]?.partyName || '-'} />
        </View>

        <View style={styles.filterWrap}>
          <Input label="Entity Type" value={filters.entityType} onChangeText={(v) => setFilters((s) => ({ ...s, entityType: v }))} placeholder="both/customer/distributor" />
          <Input label="Status" value={filters.status} onChangeText={(v) => setFilters((s) => ({ ...s, status: v }))} placeholder="all/unpaid/partial" />
          <Input label="Invoice From" value={filters.fromDate} onChangeText={(v) => setFilters((s) => ({ ...s, fromDate: v }))} placeholder="YYYY-MM-DD" />
          <Input label="Invoice To" value={filters.toDate} onChangeText={(v) => setFilters((s) => ({ ...s, toDate: v }))} placeholder="YYYY-MM-DD" />
          <Input label="As Of Date" value={filters.asOfDate} onChangeText={(v) => setFilters((s) => ({ ...s, asOfDate: v }))} placeholder="YYYY-MM-DD" />
          <Pressable style={styles.btnAlt} onPress={() => setFilters({ entityType: 'both', status: 'all', fromDate: '', toDate: '', asOfDate: new Date().toISOString().slice(0, 10) })}><Text>Reset</Text></Pressable>
        </View>

        {error ? <Text style={styles.err}>{error}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.h2}>Aging Summary by Party</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Party', 'Type', 'Current', '1-30', '31-60', '61-90', '91-120', '120+', 'Total', 'Action']} />
            {!computed.table.length ? <Text style={styles.empty}>No outstanding records.</Text> : computed.table.map((r) => (
              <View key={r.key} style={styles.tRow}>
                <Text style={styles.tCell}>{r.partyName}</Text><Text style={styles.tCell}>{r.partyType}</Text>
                <Text style={styles.tCell}>{r.current.toLocaleString()}</Text><Text style={styles.tCell}>{r['1_30'].toLocaleString()}</Text>
                <Text style={styles.tCell}>{r['31_60'].toLocaleString()}</Text><Text style={styles.tCell}>{r['61_90'].toLocaleString()}</Text>
                <Text style={styles.tCell}>{r['91_120'].toLocaleString()}</Text><Text style={styles.tCell}>{r['120_plus'].toLocaleString()}</Text>
                <Text style={styles.tCell}>{r.total.toLocaleString()}</Text>
                <View style={styles.tCell}><Pressable style={styles.btnAlt} onPress={() => setParty(r)}><Text>View Details</Text></Pressable></View>
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(party)} transparent animationType="fade" onRequestClose={() => setParty(null)}>
        <View style={styles.overlay}><View style={styles.modal}>
          <View style={styles.modalHead}><Text style={styles.h2}>Aging Details - {party?.partyName}</Text><Pressable style={styles.btnAlt} onPress={() => setParty(null)}><Text>✕</Text></Pressable></View>
          <ScrollView horizontal>
            <View style={styles.table}>
              <Row head cols={['Invoice No', 'Invoice Date', 'Due Date', 'Total', 'Paid', 'Remaining', 'Days Overdue', 'Bucket', 'Action']} />
              {(party?.details || []).map((d) => (
                <View key={`${d.invoiceNo}-${d.order?._id || ''}`} style={styles.tRow}>
                  <Text style={styles.tCell}>{d.invoiceNo}</Text>
                  <Text style={styles.tCell}>{d.invoiceDate.toLocaleDateString()}</Text>
                  <Text style={styles.tCell}>{d.dueDate.toLocaleDateString()}</Text>
                  <Text style={styles.tCell}>{d.total.toLocaleString()}</Text>
                  <Text style={styles.tCell}>{d.paid.toLocaleString()}</Text>
                  <Text style={styles.tCell}>{d.remaining.toLocaleString()}</Text>
                  <Text style={styles.tCell}>{d.daysOverdue}</Text>
                  <Text style={styles.tCell}>{d.bucket.replaceAll('_', '-')}</Text>
                  <View style={styles.tCell}><Pressable style={styles.btnAlt} onPress={() => Alert.alert('Info', 'Invoice preview is available from Finance → Invoices')}><Text>View Invoice</Text></Pressable></View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }
function MiniCard({ label, value }) { return <View style={styles.mini}><Text style={styles.miniL}>{label}</Text><Text style={styles.miniV}>{value}</Text></View>; }
function Input({ label, ...props }) { return <View style={{ marginBottom: 8 }}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} {...props} /></View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { color: '#6b7280', marginTop: 4 },
  h2: { fontSize: 16, fontWeight: '700', color: '#111827' },
  err: { marginTop: 8, color: '#b91c1c' },
  grid: { marginTop: 10, gap: 8 },
  mini: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  miniL: { fontSize: 12, color: '#6b7280' },
  miniV: { marginTop: 4, fontWeight: '700', color: '#111827' },
  filterWrap: { marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fafafa', padding: 10 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  table: { minWidth: 1080, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  tHead: { backgroundColor: '#f8fafc' },
  tCell: { width: 120, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  empty: { color: '#6b7280', padding: 10 },
  btnAlt: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12, maxHeight: '90%' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
});