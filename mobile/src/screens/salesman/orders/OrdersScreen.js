import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingFor, setUploadingFor] = useState('');
  const [dispatchingFor, setDispatchingFor] = useState('');

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

  const dispatchOrder = async (orderId) => {
    setDispatchingFor(orderId);
    setError('');
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'dispatched' });
      await loadOrders();
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

      await apiClient.post(`/orders/${orderId}/pod`, {
        objectKey,
        publicUrl,
      });

      await loadOrders();
    } catch (e) {
      setError(e.message || 'Failed to upload POD');
    } finally {
      setUploadingFor('');
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Salesman Deliveries</Text>
        <Text style={styles.subtitle}>Track assigned secondary deliveries and upload proof of delivery.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ScrollView horizontal style={{ marginTop: 10 }}>
          <View style={styles.table}>
            <Row head cols={['Order / Invoice', 'Customer / Business', 'Address', 'Distributor', 'Field', 'Status', 'POD Status', 'Actions']} />

            {orders.map((order) => {
              const isApproved = String(order.status || '').toLowerCase() === 'approved';
              const isDispatched = String(order.status || '').toLowerCase() === 'dispatched';
              const podUploaded = Boolean(order.podUrl);

              return (
                <View key={order._id} style={styles.row}>
                  <View style={styles.cellWide}>
                    <Text style={styles.cellText}>{order.orderNo || '-'}</Text>
                    <Text style={styles.smallText}>{order.invoiceNo || '-'}</Text>
                  </View>
                  <Text style={styles.cell}>{order.customerName || order.businessName || '-'}</Text>
                  <Text style={styles.cell}>{order.address || '-'}</Text>
                  <Text style={styles.cell}>{order.distributorName || order.toWarehouseName || '-'}</Text>
                  <Text style={styles.cell}>{order.fieldName || '-'}</Text>
                  <Text style={styles.cell}>{String(order.status || '-').toUpperCase()}</Text>

                  <View style={styles.cellWide}>
                    {podUploaded ? (
                      <Text style={styles.uploaded}>Uploaded</Text>
                    ) : isDispatched ? (
                      <Pressable
                        style={[styles.actionBtn, uploadingFor === order._id ? styles.actionDisabled : null]}
                        disabled={uploadingFor === order._id}
                        onPress={() => uploadPod(order._id)}
                      >
                        <Text style={styles.actionBtnText}>{uploadingFor === order._id ? 'Uploading...' : 'Upload POD'}</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.pending}>Not Uploaded (Dispatch first)</Text>
                    )}
                  </View>

                  <View style={styles.cellWide}>
                    {isApproved ? (
                      <Pressable
                        style={[styles.dispatchBtn, dispatchingFor === order._id ? styles.actionDisabled : null]}
                        disabled={dispatchingFor === order._id}
                        onPress={() => dispatchOrder(order._id)}
                      >
                        <Text style={styles.dispatchBtnText}>{dispatchingFor === order._id ? 'Dispatching...' : 'Dispatch'}</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.smallText}>-</Text>
                    )}
                  </View>
                </View>
              );
            })}

            {!orders.length ? <Text style={styles.empty}>No deliveries found for your field.</Text> : null}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
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
  table: { minWidth: 1180, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headRow: { backgroundColor: '#f8fafc' },
  cell: { width: 145, paddingHorizontal: 8, paddingVertical: 9, fontSize: 12, color: '#111827' },
  cellWide: { width: 185, paddingHorizontal: 8, paddingVertical: 9, justifyContent: 'center' },
  cellText: { fontSize: 12, color: '#111827' },
  smallText: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  headText: { fontWeight: '700', color: '#374151' },
  actionBtn: { borderRadius: 999, backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  dispatchBtn: { borderRadius: 999, backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  dispatchBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  actionDisabled: { opacity: 0.65 },
  uploaded: { color: '#047857', fontSize: 12, fontWeight: '700' },
  pending: { color: '#b45309', fontSize: 12 },
  empty: { padding: 12, color: '#6b7280', fontSize: 12 },
});
