import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import OrderDocumentModal from '../../../ui/OrderDocumentModal';
import { getInvoiceKey, mapReceiptsByInvoice } from '../../../utils/orderDocuments';

function toStatusLabel(status) {
  return String(status || 'pending').toUpperCase();
}

function parseNoteMap(value) {
  return Object.fromEntries(
    String(value || '')
      .split(',')
      .map((seg) => seg.split(':'))
      .filter((parts) => parts.length >= 2)
      .map(([k, ...rest]) => [k, rest.join(':')])
  );
}

function podUploaderName(row) {
  return row?.podUploadedBy?.name || row?.pod_uploaded_by?.name || row?.podUploadedBy || row?.proofOfDeliveryBy || '-';
}

function rowTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'rejected') return styles.rowRejected;
  if (value === 'approved' || value === 'dispatched') return styles.rowApproved;
  return null;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [err, setErr] = useState('');
  const [previewRow, setPreviewRow] = useState(null);
  const [documentRow, setDocumentRow] = useState(null);
  const [receiptsByInvoice, setReceiptsByInvoice] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ customerName: '', address: '', notes: '' });

  const notify = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await apiClient.get('/orders/secondary/distributor?limit=500');
      const nextOrders = res?.data?.orders || [];
      setOrders(nextOrders);

      const invoiceNos = nextOrders.map((item) => getInvoiceKey(item)).filter(Boolean);
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
      const message = error?.message || 'Failed to load secondary orders';
      setErr(message);
      notify('error', message);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const requestRows = useMemo(
    () => orders.filter((row) => ['pending', 'approved', 'rejected', 'dispatched'].includes(String(row.status || '').toLowerCase())),
    [orders]
  );

  const openPreview = useCallback((row) => {
    setPreviewRow(row);
    setEditing(false);
    setDraft({
      customerName: row.customerName || row.fromEntityName || '',
      address: row.address || row.deliveryAddress || '',
      notes: row.notes || row.note || '',
    });
  }, []);

  const openRequest = async (id) => {
    try {
      await apiClient.patch(`/orders/${id}/mark-read`);
      notify('success', 'Request opened.');
      await loadOrders();
    } catch (error) {
      notify('error', error?.message || 'Failed to open request');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await apiClient.patch(`/orders/${id}/status`, { status });
      notify('success', `Request ${status} successfully.`);
      await loadOrders();
    } catch (error) {
      notify('error', error?.message || 'Failed to update request status');
    }
  };

  const deleteOrder = (id) => {
    Alert.alert('Delete order', 'Delete this secondary order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/orders/${id}`);
            notify('success', 'Order deleted.');
            await loadOrders();
          } catch (error) {
            notify('error', error?.message || 'Failed to delete order');
          }
        },
      },
    ]);
  };

  const onSaveEdit = async () => {
    if (!previewRow?._id) return;
    setSaving(true);
    try {
      await apiClient.patch(`/orders/${previewRow._id}`, {
        customerName: draft.customerName,
        address: draft.address,
        notes: draft.notes,
      });
      notify('success', 'Secondary order updated.');
      setEditing(false);
      await loadOrders();
    } catch (error) {
      notify('error', error?.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const onInvoice = (order) => {
    setDocumentRow({ ...order, linkedReceipts: receiptsByInvoice[getInvoiceKey(order)] || [] });
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {toast ? <Text style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>{toast.message}</Text> : null}
      <Card>
        <Text style={styles.title}>Distributor Secondary Orders</Text>
        <Text style={styles.subtitle}>Review related secondary order requests and ledger records.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Text style={styles.sectionTitle}>Secondary Order Request list</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Order No', 'Source', 'From', 'To', 'Date/Time', 'Status', 'POD', 'Read/Unread', 'Action'].map((h) => (
                <Text key={h} style={[styles.cell, styles.headerCell]}>{h}</Text>
              ))}
            </View>
            {requestRows.length === 0 ? <Text style={styles.help}>No secondary requests.</Text> : requestRows.map((row) => (
              <View key={row._id} style={[styles.dataRow, rowTone(row.status)]}>
                <Text style={styles.cell}>{row.orderNo || '-'}</Text>
                <Text style={styles.cell}>{row.sourceType || '-'}</Text>
                <Text style={styles.cell}>{row.fromEntityName || row.customerName || '-'}</Text>
                <Text style={styles.cell}>{row.toWarehouseName || '-'}</Text>
                <Text style={styles.cell}>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</Text>
                <Text style={styles.cell}>{toStatusLabel(row.status)}</Text>
                <Text style={styles.cell}>{row.podUrl ? 'Uploaded' : 'Not Uploaded'}</Text>
                <Text style={styles.cell}>{row.unreadForDistributor ? 'Unread' : 'Read'}</Text>
                <View style={[styles.cell, styles.actionCell]}>
                  <ActionBtn label="Open" onPress={() => openRequest(row._id)} />
                  <ActionBtn label="Preview/Edit" onPress={() => openPreview(row)} />
                  <ActionBtn label="Reject" onPress={() => updateStatus(row._id, 'rejected')} danger />
                  <ActionBtn label="Approve" onPress={() => updateStatus(row._id, 'approved')} />
                  <ActionBtn label="Dispatched" onPress={() => updateStatus(row._id, 'dispatched')} />
                  <ActionBtn label="Delivered" onPress={() => updateStatus(row._id, 'delivered')} disabled={!row.podUrl} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.sectionTitle}>Secondary Orders Ledger</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Order No', 'Source', 'From', 'To', 'Date/Time (read-only)', 'POD', 'Action'].map((h) => (
                <Text key={h} style={[styles.cell, styles.headerCell]}>{h}</Text>
              ))}
            </View>
            {orders.length === 0 ? <Text style={styles.help}>No secondary order ledger records.</Text> : orders.map((row) => (
              <View key={`ledger-${row._id}`} style={styles.dataRow}>
                <Text style={styles.cell}>{row.orderNo || '-'}</Text>
                <Text style={styles.cell}>{row.sourceType || '-'}</Text>
                <Text style={styles.cell}>{row.fromEntityName || row.customerName || '-'}</Text>
                <Text style={styles.cell}>{row.toWarehouseName || '-'}</Text>
                <Text style={styles.cell}>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</Text>
                <Text style={styles.cell}>{row.podUrl ? 'Uploaded' : 'Not Uploaded'}</Text>
                <View style={[styles.cell, styles.actionCell]}>
                  <ActionBtn label="Preview/Edit" onPress={() => openPreview(row)} />
                  <ActionBtn label="Invoice/Receipt" onPress={() => onInvoice(row)} />
                  <ActionBtn label="Delete" onPress={() => deleteOrder(row._id)} danger />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(previewRow)} animationType="slide" transparent onRequestClose={() => setPreviewRow(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Secondary Request Preview</Text>
              <View style={styles.modalActions}>
                {String(previewRow?.status || '').toLowerCase() === 'pending' ? (
                  <ActionBtn label={editing ? 'Cancel Edit' : 'Edit'} onPress={() => setEditing((v) => !v)} />
                ) : null}
                <ActionBtn label="Close" onPress={() => setPreviewRow(null)} />
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Field label="Order No" value={previewRow?.orderNo || '-'} />
              <Field label="Status" value={toStatusLabel(previewRow?.status)} />
              <Field label="Source" value={previewRow?.sourceType || '-'} />
              <Field label="From" value={previewRow?.fromEntityName || previewRow?.customerName || '-'} />
              <Field label="To" value={previewRow?.toWarehouseName || previewRow?.toEntityName || previewRow?.distributorName || '-'} />
              <Field label="Territory" value={previewRow?.territory || previewRow?.territoryName || previewRow?.areaName || '-'} />
              {editing ? <InputField label="Customer Name" value={draft.customerName} onChangeText={(v) => setDraft((s) => ({ ...s, customerName: v }))} /> : <Field label="Customer Name" value={draft.customerName || '-'} />}
              <Field label="Date/Time (read-only)" value={previewRow?.createdAt ? new Date(previewRow.createdAt).toLocaleString() : '-'} />
              <Field label="Linked Receipts" value={String((receiptsByInvoice[getInvoiceKey(previewRow)] || []).length)} />
              {editing ? <InputField multiline label="Address" value={draft.address} onChangeText={(v) => setDraft((s) => ({ ...s, address: v }))} /> : <Field label="Address" value={draft.address || '-'} />}
              {editing ? <InputField multiline label="Notes" value={draft.notes} onChangeText={(v) => setDraft((s) => ({ ...s, notes: v }))} /> : <Field label="Notes" value={draft.notes || '-'} />}
              {editing ? <ActionBtn label={saving ? 'Saving...' : 'Save'} onPress={onSaveEdit} disabled={saving} /> : null}

              <View style={styles.box}>
                <Text style={styles.boxTitle}>Proof of Delivery</Text>
                {previewRow?.podUrl || previewRow?.proofOfDeliveryImageUrl ? (
                  <View style={styles.podGrid}>
                    <Image source={{ uri: previewRow?.podUrl || previewRow?.proofOfDeliveryImageUrl }} style={styles.podImage} resizeMode="contain" />
                    <View>
                      <Text style={styles.boxText}>Uploaded At: {previewRow?.podUploadedAt || previewRow?.proofOfDeliveryAt ? new Date(previewRow?.podUploadedAt || previewRow?.proofOfDeliveryAt).toLocaleString() : '-'}</Text>
                      <Text style={styles.boxText}>Uploaded By: {podUploaderName(previewRow)}</Text>
                      <Pressable onPress={() => Linking.openURL(previewRow?.podUrl || previewRow?.proofOfDeliveryImageUrl)}>
                        <Text style={styles.linkText}>Open Image</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : <Text style={styles.help}>No proof of delivery uploaded yet.</Text>}
              </View>

              <View style={styles.box}>
                <Text style={styles.boxTitle}>Product Detail</Text>
                <ScrollView horizontal>
                  <View style={styles.productTable}>
                    <View style={styles.productHead}>
                      {['S.No', 'Section', 'Product', 'Qty', 'Rate', 'TO', 'Disc', 'Extra', 'Bons', 'GST%'].map((h) => (
                        <Text key={h} style={[styles.productCell, styles.productHeadCell]}>{h}</Text>
                      ))}
                    </View>
                    {(previewRow?.items || previewRow?.orderItems || []).map((item, idx) => {
                      const notes = parseNoteMap(item.notes || item.note || '');
                      return (
                        <View key={`${idx}-${item.productId || item.productCode || item.productName || 'item'}`} style={styles.productDataRow}>
                          <Text style={styles.productCell}>{idx + 1}</Text>
                          <Text style={styles.productCell}>{item.section || previewRow?.saleType || 'secondary'}</Text>
                          <Text style={styles.productCell}>{item.productName || item.name || item.productCode || '-'}</Text>
                          <Text style={styles.productCell}>{item.quantity || item.totalPacks || item.qty || 0}</Text>
                          <Text style={styles.productCell}>{item.unitPrice || item.rate || 0}</Text>
                          <Text style={styles.productCell}>{notes.to || item.toValue || 0}</Text>
                          <Text style={styles.productCell}>{notes.disc || item.discValue || 0}</Text>
                          <Text style={styles.productCell}>{notes.extra || item.extraValue || 0}</Text>
                          <Text style={styles.productCell}>{notes.bons || item.bonsValue || 0}</Text>
                          <Text style={styles.productCell}>{item.gstPer || notes.gstPer || 0}</Text>
                        </View>
                      );
                    })}
                    {!(previewRow?.items || previewRow?.orderItems || []).length ? <Text style={styles.help}>No products found.</Text> : null}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ActionBtn({ label, onPress, danger, disabled }) {
  return (
    <Pressable disabled={disabled} style={[styles.actionBtn, danger ? styles.actionDanger : null, disabled ? styles.actionDisabled : null]} onPress={onPress}>
      <Text style={[styles.actionText, danger ? styles.actionDangerText : null]}>{label}</Text>
    </Pressable>
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

function InputField({ label, value, onChangeText, multiline }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={[styles.input, multiline ? styles.inputMulti : null]} value={value} onChangeText={onChangeText} multiline={multiline} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  error: { marginTop: 8, color: '#b91c1c' },
  sectionTitle: { marginTop: 16, marginBottom: 8, fontSize: 18, fontWeight: '700', color: '#111827' },
  tableWrap: { minWidth: 1300, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  rowRejected: { backgroundColor: '#fef2f2' },
  rowApproved: { backgroundColor: '#eff6ff' },
  cell: { width: 145, padding: 9, color: '#111827', fontSize: 12 },
  headerCell: { fontWeight: '700' },
  actionCell: { width: 390, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff' },
  actionText: { fontSize: 11, fontWeight: '600', color: '#111827' },
  actionDanger: { borderColor: '#fecaca', backgroundColor: '#fff1f2' },
  actionDangerText: { color: '#b91c1c' },
  actionDisabled: { opacity: 0.5 },
  toast: { marginBottom: 10, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12 },
  toastSuccess: { backgroundColor: '#ecfdf5', borderColor: '#86efac', color: '#166534' },
  toastError: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' },
  help: { padding: 10, color: '#6b7280', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', justifyContent: 'center', padding: 12 },
  modalCard: { maxHeight: '90%', borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden' },
  modalHead: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 7 },
  modalContent: { padding: 14, gap: 10 },
  fieldWrap: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  fieldLabel: { fontSize: 11, color: '#6b7280' },
  fieldValue: { marginTop: 2, fontSize: 13, fontWeight: '600', color: '#111827' },
  input: { marginTop: 5, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827' },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  box: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  boxTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  boxText: { marginTop: 6, fontSize: 12, color: '#374151' },
  boxMuted: { marginTop: 4, fontSize: 11, color: '#4b5563' },
  podGrid: { marginTop: 8, gap: 10 },
  podImage: { width: '100%', height: 200, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f8fafc' },
  productTable: { marginTop: 8, minWidth: 900, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  productHead: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  productDataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  productCell: { width: 95, paddingHorizontal: 8, paddingVertical: 7, color: '#111827', fontSize: 11 },
  productHeadCell: { fontWeight: '700' },
  linkText: { marginTop: 8, color: '#2563eb', textDecorationLine: 'underline' },
});