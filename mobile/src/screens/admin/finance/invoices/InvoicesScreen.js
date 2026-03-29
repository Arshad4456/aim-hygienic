import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function InvoicesScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCompanyOrders(), fetchPrimaryInvoiceTransactions()])
      .then(([allOrders, primaryTxns]) => {
        if (!active) return;
        setOrders([...allOrders, ...primaryTxns.map(mapPrimaryTransactionToInvoice)]);
      })
      .catch((e) => { if (active) setErr(e.message || 'Failed to load invoices'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const primaryInvoices = useMemo(
    () =>
      orders.filter((o) => {
        const status = String(o.status || '').toLowerCase();
        const saleType = resolveSaleType(o);
        return saleType === 'primary' && ['approved', 'dispatched', 'delivered'].includes(status);
      }),
    [orders]
  );

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Invoices</Text>
            <Text style={styles.subtitle}>Primary sales invoices from order management (approved, dispatched, delivered).</Text>
          </View>
          <Text style={styles.clock}>{now.toLocaleString()}</Text>
        </View>

        <View style={styles.statsWrap}>
          <StatCard label="Primary Invoices" value={String(primaryInvoices.length)} />
          <StatCard label="Total Primary Amount" value={`PKR ${primaryInvoices.reduce((s, o) => s + Number(o.totalAmount || 0), 0).toLocaleString()}`} />
        </View>

        {err ? <Text style={styles.err}>{err}</Text> : null}
      </Card>

      <InvoiceTable title="Primary Order Invoices" rows={primaryInvoices} />
    </ScrollView>
  );
}

async function fetchCompanyOrders() {
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

async function fetchPrimaryInvoiceTransactions() {
  const res = await apiClient.get('/inventory/transactions?transactionType=SALE_STOCK');
  const rows = Array.isArray(res?.data?.transactions) ? res.data.transactions : [];
  return rows.filter((txn) => {
    const status = String(txn?.requestStatus || '').toUpperCase();
    if (!['DISPATCHED', 'DELIVERED'].includes(status)) return false;
    return isPrimaryTransaction(txn);
  });
}

function isPrimaryTransaction(txn) {
  const sourceRole = String(txn?.requestSourceRole || txn?.fromEntityType || '').toLowerCase();
  if (sourceRole.includes('brand') || sourceRole.includes('distributor')) return true;
  const toEntityType = String(txn?.toEntityType || '').toLowerCase();
  return toEntityType === 'brand' || toEntityType === 'distributor';
}

function mapPrimaryTransactionToInvoice(txn) {
  const normalizedItems = Array.isArray(txn?.items)
    ? txn.items.map((item) => ({
      ...item,
      quantity: Number(item?.totalPacks || item?.quantity || 0),
      unitPrice: Number(item?.onePackPrice || item?.unitPrice || 0),
    }))
    : [];

  return {
    _id: txn?._id || txn?.transactionCode,
    orderNo: txn?.transactionCode || txn?._id,
    invoiceNo: txn?.transactionCode || txn?._id,
    saleType: 'primary',
    distributorName: txn?.distributorName || txn?.fromEntityName || txn?.toEntityName || '-',
    territoryName: txn?.territory || txn?.territoryName || '-',
    totalAmount: Number(txn?.grandTotal || txn?.totalAmount || txn?.subtotal || 0),
    updatedAt: txn?.requestStatusUpdatedAt || txn?.updatedAt || txn?.transactionAt || txn?.createdAt,
    status: String(txn?.requestStatus || 'DISPATCHED').toLowerCase(),
    items: normalizedItems,
    toWarehouseName: txn?.warehouseName || '',
    fromEntityName: txn?.fromEntityName || '',
    customerName: txn?.distributorName || txn?.toEntityName || '',
  };
}

function resolveSaleType(order) {
  const saleType = String(order?.saleType || '').trim().toLowerCase();
  if (saleType === 'primary' || saleType === 'secondary') return saleType;

  const sourceType = String(order?.sourceType || '').trim().toLowerCase();
  if (sourceType === 'brand' || sourceType === 'distributor') return 'primary';
  if (sourceType === 'customer' || sourceType === 'order_booker') return 'secondary';

  const customerType = String(order?.customerType || '').trim().toLowerCase();
  if (customerType === 'brand' || customerType === 'distributor') return 'primary';
  if (customerType === 'customer' || customerType === 'salesman') return 'secondary';

  const fromEntityRole = String(order?.fromEntityRole || '').trim().toLowerCase();
  if (fromEntityRole.includes('brand') || fromEntityRole.includes('distributor')) return 'primary';

  return 'primary';
}

function InvoiceTable({ title, rows }) {
  return (
    <Card>
      <Text style={styles.h2}>{title}</Text>
      <ScrollView horizontal>
        <View style={styles.table}>
          <Row head cols={['Invoice/Order #', 'Sale Type', 'Distributor', 'Territory', 'Total Amount', 'Delivered Date', 'Status', 'Action']} />
          {!rows.length ? <Text style={styles.empty}>No invoices found.</Text> : rows.map((o) => (
            <View key={o._id} style={styles.tRow}>
              <Text style={styles.tCell}>{o.orderNo || o.invoiceNo || o._id}</Text>
              <Text style={styles.tCell}>{o.saleType || '-'}</Text>
              <Text style={styles.tCell}>{o.distributorName || o.customerName || o.distributorId || '-'}</Text>
              <Text style={styles.tCell}>{o.territoryName || o.areaName || '-'}</Text>
              <Text style={styles.tCell}>PKR {Number(o.totalAmount || 0).toLocaleString()}</Text>
              <Text style={styles.tCell}>{o.updatedAt ? new Date(o.updatedAt).toLocaleDateString() : '-'}</Text>
              <Text style={styles.tCell}>Delivered</Text>
              <View style={styles.tCell}><Pressable style={styles.btnAlt} onPress={() => openInvoice(o)}><Text>Invoice</Text></Pressable></View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}

function openInvoice(order) {
  const itemRows = (order.items || [])
    .map((item, idx) => {
      const qty = Number(item.totalPacks || item.quantity || 0);
      const rate = Number(item.onePackPrice || item.unitPrice || 0);
      const gross = qty * rate;
      return `<tr><td>${idx + 1}</td><td>${escapeHtml(item.productName || '-')}</td><td>${qty}</td><td>${rate.toFixed(2)}</td><td>${gross.toFixed(2)}</td></tr>`;
    })
    .join('');

  const html = `<html><body style="font-family:Arial,sans-serif;padding:16px;color:#111;"><div style="display:flex;justify-content:space-between;align-items:center;"><div style="display:flex;align-items:center;gap:10px;"><div style="width:54px;height:54px;border-radius:10px;background:linear-gradient(135deg,#065f46,#10b981);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">AH</div><div><div style="font-weight:700;font-size:18px;">AIM Hygienic (Pvt) Limited</div><div style="font-size:11px;color:#555;">Sales Invoice</div></div></div><div style="font-size:12px;text-align:right;"><div><b>Invoice #:</b> ${escapeHtml(order.orderNo || order.invoiceNo || order._id || '-')}</div><div><b>Date:</b> ${order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : '-'}</div></div></div><div style="margin-top:10px;font-size:12px;"><b>Invoice From:</b> ${escapeHtml(order.toWarehouseName || order.fromEntityName || 'AIM Hygienic')}</div><div style="font-size:12px;"><b>Bill To:</b> ${escapeHtml(order.distributorName || order.customerName || order.distributorId || '-')}</div><div style="font-size:12px;"><b>Territory:</b> ${escapeHtml(order.territoryName || order.areaName || '-')}</div><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:12px;font-size:12px;"><thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${itemRows || '<tr><td colspan="5">No item details available</td></tr>'}</tbody></table><div style="margin-top:12px;display:flex;justify-content:flex-end;font-size:12px;"><div style="min-width:260px;"><div style="display:flex;justify-content:space-between;"><span>Total Amount:</span><strong>${Number(order.totalAmount || 0).toFixed(2)}</strong></div></div></div><div style="margin-top:16px;text-align:center;font-size:12px;">Thank you for business with AIM Hygienic (Pvt) Limited.</div></body></html>`;

  Linking.openURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    .catch(() => Alert.alert('Error', 'Unable to open invoice preview on this device.'));
}

function escapeHtml(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHead : null]}>{cols.map((c, i) => <Text key={i} style={styles.tCell}>{String(c)}</Text>)}</View>; }
function StatCard({ label, value }) { return <View style={styles.statCard}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { color: '#6b7280', marginTop: 4 },
  clock: { fontSize: 11, color: '#52525b', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fafafa' },
  statsWrap: { marginTop: 10, gap: 8 },
  statCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  statLabel: { color: '#6b7280', fontSize: 12 },
  statValue: { marginTop: 4, color: '#111827', fontWeight: '700' },
  err: { marginTop: 8, color: '#b91c1c' },
  h2: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#111827' },
  table: { minWidth: 1080, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  tHead: { backgroundColor: '#f8fafc' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  tCell: { width: 135, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  empty: { padding: 10, color: '#6b7280' },
  btnAlt: { borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: '#eef2ff', borderRadius: 8, alignItems: 'center', paddingVertical: 6 },
});