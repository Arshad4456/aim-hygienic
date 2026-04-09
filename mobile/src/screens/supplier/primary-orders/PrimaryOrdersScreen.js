import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '../../../api/client';
import { uploadViaBackendPresigned } from '../../../api/uploads';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import {
  buildPrimarySupplierDocumentHtml,
  formatDateTime,
  getInvoiceKey,
  mapReceiptsByInvoice,
  sumApprovedReceiptAmount,
} from '../../../utils/orderDocuments';

function formatCurrency(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function totalItems(transaction) {
  return Array.isArray(transaction?.items)
    ? transaction.items.reduce((sum, item) => sum + Number(item?.quantity || item?.totalPacks || 0), 0)
    : 0;
}

async function openHtml(html) {
  const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  await Linking.openURL(url);
}

export default function PrimaryOrdersScreen() {
  const [rows, setRows] = useState([]);
  const [receiptsByInvoice, setReceiptsByInvoice] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingId, setUploadingId] = useState('');
  const [previewRow, setPreviewRow] = useState(null);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState(null);

  const notify = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setErr('');

    try {
      const txRes = await apiClient.get('/inventory/transactions/supplier/primary?limit=300');
      const transactions = txRes?.data?.transactions || [];
      setRows(transactions);

      const invoiceNos = transactions.map((item) => getInvoiceKey(item)).filter(Boolean);
      if (invoiceNos.length) {
        try {
          const receiptsRes = await apiClient.get(`/receipts?linkedInvoiceNo=${encodeURIComponent(invoiceNos.join(','))}`);
          setReceiptsByInvoice(mapReceiptsByInvoice(receiptsRes?.data?.receipts || []));
        } catch (receiptError) {
          setReceiptsByInvoice({});
          notify('error', receiptError?.message || 'Failed to load linked receipts');
        }
      } else {
        setReceiptsByInvoice({});
      }
    } catch (error) {
      const message = error?.message || 'Failed to load supplier primary orders';
      setErr(message);
      notify('error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const assigned = rows.length;
    const podUploaded = rows.filter((item) => item?.podUrl).length;
    const pendingPod = rows.filter((item) => !item?.podUrl).length;
    const totalQty = rows.reduce((sum, item) => sum + totalItems(item), 0);
    const allReceipts = Object.values(receiptsByInvoice).flat();
    const linkedReceipts = allReceipts.length;
    const approvedReceiptAmount = sumApprovedReceiptAmount(allReceipts);
    return { assigned, podUploaded, pendingPod, totalQty, linkedReceipts, approvedReceiptAmount };
  }, [rows, receiptsByInvoice]);

  const openDocument = async (row) => {
    try {
      const receipts = receiptsByInvoice[getInvoiceKey(row)] || [];
      await openHtml(buildPrimarySupplierDocumentHtml(row, receipts));
    } catch (error) {
      notify('error', error?.message || 'Failed to open invoice / receipt');
    }
  };

  const onUploadPod = async (row) => {
    try {
      const picker = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picker.canceled) return;
      const asset = picker.assets?.[0];
      if (!asset?.uri) return;

      setUploadingId(String(row?._id || 'uploading'));
      const contentType = asset.mimeType || 'image/jpeg';
      const fileResponse = await fetch(asset.uri);
      const fileBlob = await fileResponse.blob();
      const presigned = await uploadViaBackendPresigned({
        presignPayload: { transactionId: row._id, contentType },
        fileBlob,
        contentType,
      });
      await apiClient.post(`/inventory/transactions/${row._id}/pod`, {
        objectKey: presigned.objectKey,
        publicUrl: presigned.publicUrl,
      });

      notify('success', 'Proof of delivery uploaded successfully.');
      await loadData(true);
    } catch (error) {
      notify('error', error?.message || 'Failed to upload proof of delivery');
    } finally {
      setUploadingId('');
    }
  };

  const confirmUpload = (row) => {
    Alert.alert('Upload POD', 'Select a proof image for this primary order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Upload', onPress: () => onUploadPod(row) },
    ]);
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {toast ? <Text style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>{toast.message}</Text> : null}

      <Card>
        <Text style={styles.title}>Primary Orders from Company Admin</Text>
        <Text style={styles.subtitle}>View assigned primary orders, open invoice / receipt documents, and upload proof of delivery from mobile.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <View style={styles.statsGrid}>
          <StatCard label="Assigned Orders" value={stats.assigned} />
          <StatCard label="POD Uploaded" value={stats.podUploaded} />
          <StatCard label="Pending POD" value={stats.pendingPod} />
          <StatCard label="Total Qty" value={stats.totalQty} />
          <StatCard label="Linked Receipts" value={stats.linkedReceipts} />
          <StatCard label="Approved Receipt Amount" value={formatCurrency(stats.approvedReceiptAmount)} />
        </View>

        <Pressable style={[styles.refreshBtn, refreshing ? styles.btnDisabled : null]} onPress={() => loadData(true)} disabled={refreshing}>
          <Text style={styles.refreshText}>{refreshing ? 'Refreshing...' : 'Refresh Orders'}</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Assigned Primary Order Ledger</Text>
        <Text style={styles.sectionHint}>Supplier can open each order, view invoice / receipt summary, and upload POD.</Text>

        {rows.length === 0 ? <Text style={styles.empty}>No assigned primary orders found.</Text> : null}

        {rows.map((row) => {
          const receipts = receiptsByInvoice[getInvoiceKey(row)] || [];
          const invoiceNo = getInvoiceKey(row);
          return (
            <View key={row._id} style={styles.orderCard}>
              <View style={styles.orderHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderNo}>{invoiceNo || 'Primary Order'}</Text>
                  <Text style={styles.orderMeta}>Dispatch From: {row?.dispatchFromWarehouseName || row?.warehouseName || '-'}</Text>
                  <Text style={styles.orderMeta}>Supplier: {row?.supplierName || '-'}</Text>
                </View>
                <View style={[styles.badge, row?.podUrl ? styles.badgeSuccess : styles.badgeWarning]}>
                  <Text style={[styles.badgeText, row?.podUrl ? styles.badgeTextSuccess : styles.badgeTextWarning]}>{row?.podUrl ? 'POD Uploaded' : 'Pending POD'}</Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <Metric label="Status" value={String(row?.requestStatus || '-').toUpperCase()} />
                <Metric label="Amount" value={formatCurrency(row?.grandTotal || row?.subtotal || 0)} />
                <Metric label="Qty" value={totalItems(row)} />
                <Metric label="Receipts" value={receipts.length} />
              </View>

              <View style={styles.actionRow}>
                <ActionBtn label="Open" onPress={() => setPreviewRow({ ...row, linkedReceipts: receipts })} />
                <ActionBtn label="Invoice / Receipt" onPress={() => openDocument(row)} />
                <ActionBtn label={uploadingId === row._id ? 'Uploading...' : 'Upload POD'} onPress={() => confirmUpload(row)} disabled={uploadingId === row._id} />
              </View>
            </View>
          );
        })}
      </Card>

      <Modal visible={Boolean(previewRow)} animationType="slide" transparent onRequestClose={() => setPreviewRow(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Supplier Primary Order</Text>
              <ActionBtn label="Close" onPress={() => setPreviewRow(null)} />
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Field label="Primary Order No" value={getInvoiceKey(previewRow) || '-'} />
              <Field label="Status" value={String(previewRow?.requestStatus || '-').toUpperCase()} />
              <Field label="Requested By" value={previewRow?.fromEntityName || '-'} />
              <Field label="Dispatch Warehouse" value={previewRow?.dispatchFromWarehouseName || previewRow?.warehouseName || '-'} />
              <Field label="Supplier" value={previewRow?.supplierName || '-'} />
              <Field label="Date / Time" value={formatDateTime(previewRow?.transactionAt || previewRow?.createdAt)} />
              <Field label="Approved Receipt Amount" value={formatCurrency(sumApprovedReceiptAmount(previewRow?.linkedReceipts || []))} />

              <View style={styles.box}>
                <Text style={styles.boxTitle}>Proof of Delivery</Text>
                {previewRow?.podUrl ? (
                  <View style={styles.podWrap}>
                    <Image source={{ uri: previewRow.podUrl }} style={styles.podImage} resizeMode="contain" />
                    <Text style={styles.boxText}>Uploaded At: {formatDateTime(previewRow?.podUploadedAt || previewRow?.proofOfDeliveryAt)}</Text>
                    <Pressable onPress={() => Linking.openURL(previewRow.podUrl)}>
                      <Text style={styles.linkText}>Open POD Image</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.boxText}>No proof of delivery uploaded yet.</Text>
                    <ActionBtn label={uploadingId === previewRow?._id ? 'Uploading...' : 'Upload POD'} onPress={() => confirmUpload(previewRow)} disabled={uploadingId === previewRow?._id} />
                  </View>
                )}
              </View>

              <View style={styles.box}>
                <Text style={styles.boxTitle}>Product Detail</Text>
                {(previewRow?.items || []).map((item, index) => (
                  <View key={`${index}-${item?.productName || item?.productCode || 'item'}`} style={styles.itemRow}>
                    <Text style={styles.itemTitle}>{index + 1}. {item?.productName || item?.productCode || '-'}</Text>
                    <Text style={styles.itemMeta}>Qty: {Number(item?.quantity || item?.totalPacks || 0)} | Rate: {Number(item?.onePackPrice || item?.unitPrice || item?.rate || 0).toFixed(2)}</Text>
                  </View>
                ))}
                {!(previewRow?.items || []).length ? <Text style={styles.boxText}>No items found.</Text> : null}
              </View>

              <View style={styles.box}>
                <Text style={styles.boxTitle}>Linked Receipts</Text>
                {(previewRow?.linkedReceipts || []).map((receipt) => (
                  <View key={receipt?._id || receipt?.receiptNo} style={styles.receiptRow}>
                    <Text style={styles.itemTitle}>{receipt?.receiptNo || '-'}</Text>
                    <Text style={styles.itemMeta}>{receipt?.paymentMethod || '-'} • {formatCurrency(receipt?.amount || 0)} • {String(receipt?.status || '-').toUpperCase()}</Text>
                  </View>
                ))}
                {!(previewRow?.linkedReceipts || []).length ? <Text style={styles.boxText}>No linked receipts found.</Text> : null}
              </View>

              <ActionBtn label="Open Invoice / Receipt" onPress={() => openDocument(previewRow)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metricBlock}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Field({ label, value }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function ActionBtn({ label, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.actionBtn, disabled ? styles.btnDisabled : null]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 28, gap: 12 },
  toast: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 12 },
  toastSuccess: { backgroundColor: '#ecfdf5', borderColor: '#86efac', color: '#166534' },
  toastError: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' },
  title: { fontSize: 21, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  statsGrid: { marginTop: 12, gap: 10 },
  statCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#f8fafc' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { marginTop: 4, fontSize: 22, fontWeight: '700', color: '#111827' },
  refreshBtn: { marginTop: 12, borderRadius: 12, backgroundColor: '#0f766e', paddingVertical: 11, alignItems: 'center' },
  refreshText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionHint: { marginTop: 4, color: '#6b7280', fontSize: 12 },
  empty: { marginTop: 12, color: '#6b7280' },
  orderCard: { marginTop: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 12, backgroundColor: '#fff' },
  orderHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  orderNo: { fontSize: 16, fontWeight: '700', color: '#111827' },
  orderMeta: { marginTop: 4, color: '#4b5563', fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeWarning: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextSuccess: { color: '#166534' },
  badgeTextWarning: { color: '#92400e' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  metricBlock: { minWidth: '47%', borderWidth: 1, borderColor: '#eef2f7', borderRadius: 10, padding: 10, backgroundColor: '#f9fafb' },
  metricLabel: { fontSize: 11, color: '#6b7280' },
  metricValue: { marginTop: 3, fontSize: 13, fontWeight: '700', color: '#111827' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: { borderRadius: 10, backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  btnDisabled: { opacity: 0.55 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', justifyContent: 'center', padding: 12 },
  modalCard: { maxHeight: '92%', borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden' },
  modalHead: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 14, gap: 10 },
  fieldWrap: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  fieldLabel: { fontSize: 11, color: '#6b7280' },
  fieldValue: { marginTop: 3, fontSize: 13, fontWeight: '600', color: '#111827' },
  box: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#f9fafb' },
  boxTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  boxText: { marginTop: 7, fontSize: 12, color: '#4b5563' },
  linkText: { marginTop: 8, color: '#2563eb', textDecorationLine: 'underline', fontWeight: '600' },
  podWrap: { marginTop: 10 },
  podImage: { width: '100%', height: 220, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  itemRow: { marginTop: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 8 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  itemMeta: { marginTop: 3, fontSize: 12, color: '#4b5563' },
  receiptRow: { marginTop: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 8 },
});
