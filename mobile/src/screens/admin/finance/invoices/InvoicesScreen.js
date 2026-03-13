import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';
import DocumentPreviewScreen from '../../../../features/documents/DocumentPreviewScreen';

export default function InvoicesScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(new Date());
  const [previewId, setPreviewId] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    apiClient.get('/orders?limit=200')
      .then((res) => { if (active) setOrders(res?.data?.orders || []); })
      .catch((e) => { if (active) setErr(e.message || 'Failed to load invoices'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const deliveredInvoices = useMemo(() => orders.filter((o) => String(o.status || '').toLowerCase() === 'delivered'), [orders]);
  const primaryInvoices = useMemo(() => deliveredInvoices.filter((o) => String(o.saleType || '').toLowerCase() === 'primary'), [deliveredInvoices]);
  const secondaryInvoices = useMemo(() => deliveredInvoices.filter((o) => String(o.saleType || '').toLowerCase() === 'secondary'), [deliveredInvoices]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Invoices</Text>
            <Text style={styles.subtitle}>All delivered sales invoices from order management.</Text>
          </View>
          <Text style={styles.clock}>{now.toLocaleString()}</Text>
        </View>

        <View style={styles.statsWrap}>
          <StatCard label="Delivered Invoices" value={String(deliveredInvoices.length)} />
          <StatCard label="Total Delivered Amount" value={`PKR ${deliveredInvoices.reduce((s, o) => s + Number(o.totalAmount || 0), 0).toLocaleString()}`} />
          <StatCard label="Primary Invoices" value={String(primaryInvoices.length)} />
          <StatCard label="Secondary Invoices" value={String(secondaryInvoices.length)} />
        </View>

        {err ? <Text style={styles.err}>{err}</Text> : null}
      </Card>

      <InvoiceTable title="Primary Order Invoices" rows={primaryInvoices} onOpenPreview={(id) => setPreviewId(id)} />
      <InvoiceTable title="Secondary Order Invoices" rows={secondaryInvoices} onOpenPreview={(id) => setPreviewId(id)} />

      <DocumentPreviewScreen visible={Boolean(previewId)} onClose={() => setPreviewId('')} documentType="invoice" documentId={previewId} />
    </ScrollView>
  );
}

function InvoiceTable({ title, rows, onOpenPreview }) {
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
              <View style={styles.tCell}><Pressable style={styles.btnAlt} onPress={() => onOpenPreview(String(o._id || ''))}><Text>Invoice</Text></Pressable></View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}


function Row({ cols, head }) {
  return (
    <View style={[styles.tRow, head ? styles.tHead : null]}>
      {cols.map((col, idx) => <Text key={`${col}-${idx}`} style={[styles.tCell, head ? styles.tHeadText : null]}>{col}</Text>)}
    </View>
  );
}

function StatCard({ label, value }) {
  return (<View style={styles.statCard}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>);
}

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  clock: { fontSize: 11, color: "#6b7280" },
  statsWrap: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: { minWidth: 140, borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 10, padding: 8, backgroundColor: "#fff" },
  statLabel: { fontSize: 11, color: "#6b7280" },
  statValue: { marginTop: 2, fontWeight: "700", color: "#111827" },
  err: { marginTop: 10, color: "#b91c1c" },
  h2: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 8 },
  table: { minWidth: 980 },
  tRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e4e4e7", alignItems: "center" },
  tHead: { backgroundColor: "#f4f4f5" },
  tHeadText: { fontWeight: "700" },
  tCell: { width: 140, padding: 8, fontSize: 12, color: "#111827" },
  btnAlt: { borderWidth: 1, borderColor: "#c7d2fe", backgroundColor: "#eef2ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  empty: { color: "#6b7280", padding: 10 },
});
