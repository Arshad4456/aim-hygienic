import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

async function fileToBase64FromUri(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}

function badgeTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'delivered') return styles.badgeDelivered;
  if (value === 'dispatched') return styles.badgeDispatched;
  if (value === 'approved') return styles.badgeApproved;
  if (value === 'rejected') return styles.badgeRejected;
  return styles.badgePending;
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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

function ActionBtn({ label, onPress, disabled, variant = 'default' }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionBtn,
        variant === 'primary' ? styles.actionPrimary : null,
        variant === 'secondary' ? styles.actionSecondary : null,
        disabled ? styles.actionDisabled : null,
      ]}
    >
      <Text style={[styles.actionText, variant === 'primary' || variant === 'secondary' ? styles.actionTextLight : null]}>{label}</Text>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingFor, setUploadingFor] = useState('');
  const [dispatchingFor, setDispatchingFor] = useState('');
  const [previewRow, setPreviewRow] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/orders/salesman-deliveries?limit=500');
      setOrders(res?.data?.orders || []);
    } catch (e) {
      setError(e.message || 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const summary = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.total += 1;
        if (String(order.status || '').toLowerCase() === 'approved') acc.approved += 1;
        if (String(order.status || '').toLowerCase() === 'dispatched') acc.dispatched += 1;
        if (order.podUrl) acc.podUploaded += 1;
        acc.totalQty += Array.isArray(order.items)
          ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
          : 0;
        return acc;
      },
      { total: 0, approved: 0, dispatched: 0, podUploaded: 0, totalQty: 0 }
    );
  }, [orders]);

  const dispatchOrder = async (orderId) => {
    setDispatchingFor(orderId);
    setError('');
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'dispatched' });
      await loadOrders();
      if (String(previewRow?._id || '') === String(orderId)) {
        setPreviewRow((current) => (current ? { ...current, status: 'dispatched' } : current));
      }
    } catch (e) {
      setError(e.message || 'Failed to dispatch order');
    } finally {
      setDispatchingFor('');
    }
  };

  const uploadPod = async (orderId) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploadingFor(orderId);
    setError('');
    try {
      const base64 = await fileToBase64FromUri(asset.uri);
      const proxyRes = await apiClient.post('/uploads/pod-proxy', {
        orderId,
        contentType: asset.mimeType || 'image/jpeg',
        fileBase64: base64,
      });

      const objectKey = proxyRes?.data?.objectKey;
      const publicUrl = proxyRes?.data?.publicUrl;
      if (!publicUrl) throw new Error('Upload failed. Missing public URL.');

      await apiClient.post(`/orders/${orderId}/pod`, { objectKey, publicUrl });
      await loadOrders();
      if (String(previewRow?._id || '') === String(orderId)) {
        setPreviewRow((current) => (current ? { ...current, podUrl: publicUrl, pod_url: publicUrl } : current));
      }
    } catch (e) {
      setError(e.message || 'Failed to upload POD');
    } finally {
      setUploadingFor('');
    }
  };

  const openPod = async (row) => {
    const url = row?.podUrl || row?.pod_url || row?.proofOfDeliveryImageUrl;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (e) {
      setError(e.message || 'Failed to open POD image');
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Salesman Deliveries</Text>
        <Text style={styles.subtitle}>Track assigned secondary deliveries, dispatch orders, and upload proof of delivery.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.statGrid}>
          <StatCard label="Assigned" value={summary.total} />
          <StatCard label="Approved" value={summary.approved} />
          <StatCard label="Dispatched" value={summary.dispatched} />
          <StatCard label="POD Uploaded" value={summary.podUploaded} />
          <StatCard label="Total Qty" value={summary.totalQty} />
        </View>

        <ScrollView horizontal style={{ marginTop: 12 }}>
          <View style={styles.table}>
            <View style={[styles.row, styles.headRow]}>
              {['Order / Invoice', 'Customer / Business', 'Address', 'Distributor', 'Field', 'Status', 'POD', 'Actions'].map((label) => (
                <Text key={label} style={[styles.cell, styles.headText]}>{label}</Text>
              ))}
            </View>

            {orders.map((order) => {
              const isApproved = String(order.status || '').toLowerCase() === 'approved';
              const isDispatched = String(order.status || '').toLowerCase() === 'dispatched';
              const podUploaded = Boolean(order.podUrl || order.pod_url || order.proofOfDeliveryImageUrl);
              return (
                <View key={order._id} style={styles.row}>
                  <View style={styles.cellWide}>
                    <Text style={styles.cellText}>{order.orderNo || '-'}</Text>
                    <Text style={styles.smallText}>{order.invoiceNo || '-'}</Text>
                  </View>
                  <Text style={styles.cell}>{order.customerName || order.businessName || '-'}</Text>
                  <Text style={styles.cell}>{order.address || '-'}</Text>
                  <Text style={styles.cell}>{order.distributorName || order.toWarehouseName || '-'}</Text>
                  <Text style={styles.cell}>{order.fieldName || order.fieldId || '-'}</Text>
                  <View style={styles.cellWide}>
                    <Text style={[styles.badge, badgeTone(order.status)]}>{String(order.status || 'pending').toUpperCase()}</Text>
                  </View>
                  <View style={styles.cellWide}>
                    {podUploaded ? (
                      <ActionBtn label="Open POD" onPress={() => openPod(order)} />
                    ) : isDispatched ? (
                      <ActionBtn
                        label={uploadingFor === order._id ? 'Uploading...' : 'Upload POD'}
                        disabled={uploadingFor === order._id}
                        onPress={() => uploadPod(order._id)}
                        variant="primary"
                      />
                    ) : (
                      <Text style={styles.pending}>Dispatch first</Text>
                    )}
                  </View>
                  <View style={styles.cellWide}>
                    <View style={styles.actionStack}>
                      <ActionBtn label="Open" onPress={() => setPreviewRow(order)} />
                      {isApproved ? (
                        <ActionBtn
                          label={dispatchingFor === order._id ? 'Dispatching...' : 'Dispatch'}
                          disabled={dispatchingFor === order._id}
                          onPress={() => dispatchOrder(order._id)}
                          variant="secondary"
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}

            {!orders.length ? <Text style={styles.empty}>No deliveries found for your current scope.</Text> : null}
          </View>
        </ScrollView>
      </Card>

      <Modal visible={Boolean(previewRow)} transparent animationType="slide" onRequestClose={() => setPreviewRow(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delivery Detail</Text>
              <ActionBtn label="Close" onPress={() => setPreviewRow(null)} />
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {previewRow ? (
                <>
                  <View style={styles.fieldGrid}>
                    <Field label="Order No" value={previewRow.orderNo || '-'} />
                    <Field label="Invoice" value={previewRow.invoiceNo || '-'} />
                    <Field label="Customer" value={previewRow.customerName || previewRow.businessName || '-'} />
                    <Field label="Distributor" value={previewRow.distributorName || previewRow.toWarehouseName || '-'} />
                    <Field label="Address" value={previewRow.address || '-'} />
                    <Field label="Field" value={previewRow.fieldName || previewRow.fieldId || '-'} />
                    <Field label="Status" value={String(previewRow.status || '').toUpperCase()} />
                    <Field label="POD By" value={previewRow?.podUploadedBy?.name || previewRow?.pod_uploaded_by?.name || '-'} />
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Products</Text>
                    <ScrollView horizontal>
                      <View style={styles.productTable}>
                        <View style={[styles.row, styles.headRow]}>
                          {['#', 'Product', 'Qty', 'Rate', 'Amount'].map((label) => (
                            <Text key={label} style={[styles.productCell, styles.headText]}>{label}</Text>
                          ))}
                        </View>
                        {(previewRow.items || []).map((item, index) => (
                          <View key={`${previewRow._id}-${index}`} style={styles.row}>
                            <Text style={styles.productCell}>{index + 1}</Text>
                            <Text style={styles.productCell}>{item.productName || '-'}</Text>
                            <Text style={styles.productCell}>{Number(item.quantity || 0)}</Text>
                            <Text style={styles.productCell}>{Number(item.unitPrice || 0).toFixed(2)}</Text>
                            <Text style={styles.productCell}>{(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Proof of Delivery</Text>
                    {previewRow.podUrl || previewRow.pod_url || previewRow.proofOfDeliveryImageUrl ? (
                      <>
                        <Image source={{ uri: previewRow.podUrl || previewRow.pod_url || previewRow.proofOfDeliveryImageUrl }} style={styles.podImage} resizeMode="cover" />
                        <View style={styles.inlineActions}>
                          <ActionBtn label="Open POD" onPress={() => openPod(previewRow)} />
                        </View>
                      </>
                    ) : (
                      <Text style={styles.pending}>No POD uploaded yet.</Text>
                    )}

                    <View style={styles.inlineActions}>
                      {String(previewRow.status || '').toLowerCase() === 'approved' ? (
                        <ActionBtn
                          label={dispatchingFor === previewRow._id ? 'Dispatching...' : 'Dispatch Order'}
                          disabled={dispatchingFor === previewRow._id}
                          onPress={() => dispatchOrder(previewRow._id)}
                          variant="secondary"
                        />
                      ) : null}
                      {String(previewRow.status || '').toLowerCase() === 'dispatched' && !(previewRow.podUrl || previewRow.pod_url || previewRow.proofOfDeliveryImageUrl) ? (
                        <ActionBtn
                          label={uploadingFor === previewRow._id ? 'Uploading...' : 'Upload POD'}
                          disabled={uploadingFor === previewRow._id}
                          onPress={() => uploadPod(previewRow._id)}
                          variant="primary"
                        />
                      ) : null}
                    </View>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  title: { fontSize: 21, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  error: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
  statGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { minWidth: 115, flexGrow: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 10 },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  statValue: { marginTop: 6, fontSize: 22, color: '#111827', fontWeight: '800' },
  table: { minWidth: 1220, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headRow: { backgroundColor: '#f8fafc' },
  cell: { width: 145, paddingHorizontal: 8, paddingVertical: 9, fontSize: 12, color: '#111827' },
  cellWide: { width: 185, paddingHorizontal: 8, paddingVertical: 9, justifyContent: 'center' },
  cellText: { fontSize: 12, color: '#111827' },
  smallText: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  headText: { fontWeight: '700', color: '#374151' },
  actionStack: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn: { borderRadius: 999, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  actionPrimary: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  actionSecondary: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  actionDisabled: { opacity: 0.65 },
  actionText: { color: '#111827', fontSize: 11, fontWeight: '700' },
  actionTextLight: { color: '#fff' },
  pending: { color: '#b45309', fontSize: 12 },
  empty: { padding: 12, color: '#6b7280', fontSize: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: '700' },
  badgePending: { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeApproved: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  badgeDispatched: { backgroundColor: '#ede9fe', color: '#5b21b6' },
  badgeDelivered: { backgroundColor: '#dcfce7', color: '#166534' },
  badgeRejected: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', justifyContent: 'center', padding: 12 },
  modalCard: { maxHeight: '92%', borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden' },
  modalHeader: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 14, gap: 12 },
  fieldGrid: { gap: 10 },
  fieldWrap: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, backgroundColor: '#fff' },
  fieldLabel: { fontSize: 11, color: '#6b7280' },
  fieldValue: { marginTop: 3, fontSize: 13, fontWeight: '600', color: '#111827' },
  modalSection: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#fafafa' },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  productTable: { minWidth: 560, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden', marginTop: 10 },
  productCell: { width: 112, paddingHorizontal: 8, paddingVertical: 8, fontSize: 11, color: '#111827' },
  podImage: { width: '100%', height: 220, borderRadius: 10, backgroundColor: '#f4f4f5', borderWidth: 1, borderColor: '#e5e7eb', marginTop: 10 },
  inlineActions: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
