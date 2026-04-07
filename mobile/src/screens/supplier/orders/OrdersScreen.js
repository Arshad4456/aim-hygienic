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
      const res = await apiClient.get('/orders/supplier-deliveries?limit=500');
      setOrders(res?.data?.orders || []);
    } catch (e) {
      setError(e.message || 'Failed to load primary deliveries');
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

      await apiClient.post(`/orders/${orderId}/pod`, { objectKey, publicUrl });
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
        <Text style={styles.title}>Primary Orders</Text>
        <Text style={styles.subtitle}>Approved/dispatched primary orders for your warehouse mapping. Dispatch first, then upload POD.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ marginTop: 10, gap: 8 }}>
          {orders.map((order) => {
            const isApproved = String(order.status || '').toLowerCase() === 'approved';
            const isDispatched = String(order.status || '').toLowerCase() === 'dispatched';
            return (
              <View key={order._id} style={styles.orderCard}>
                <Text style={styles.orderTitle}>{order.orderNo || '-'} • {String(order.status || '-').toUpperCase()}</Text>
                <Text style={styles.orderMeta}>Warehouse: {order.toWarehouseName || '-'}</Text>
                <Text style={styles.orderMeta}>From: {order.customerName || order.fromEntityName || '-'}</Text>
                <Text style={styles.orderMeta}>Invoice: {order.invoiceNo || '-'}</Text>

                <View style={styles.actions}>
                  {isApproved ? (
                    <Pressable
                      style={[styles.actionBtn, styles.dispatchBtn, dispatchingFor === order._id ? styles.actionDisabled : null]}
                      disabled={dispatchingFor === order._id}
                      onPress={() => dispatchOrder(order._id)}
                    >
                      <Text style={styles.actionText}>{dispatchingFor === order._id ? 'Dispatching...' : 'Dispatch'}</Text>
                    </Pressable>
                  ) : null}

                  {order.podUrl ? (
                    <Text style={styles.uploaded}>POD Uploaded</Text>
                  ) : isDispatched ? (
                    <Pressable
                      style={[styles.actionBtn, styles.uploadBtn, uploadingFor === order._id ? styles.actionDisabled : null]}
                      disabled={uploadingFor === order._id}
                      onPress={() => uploadPod(order._id)}
                    >
                      <Text style={styles.actionText}>{uploadingFor === order._id ? 'Uploading...' : 'Upload POD'}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.pending}>Upload after dispatch</Text>
                  )}
                </View>
              </View>
            );
          })}

          {!orders.length ? <Text style={styles.empty}>No primary deliveries found for your mapped warehouse(s).</Text> : null}
        </View>
      </Card>
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
  orderCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  orderTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  orderMeta: { marginTop: 3, color: '#4b5563', fontSize: 12 },
  actions: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  actionBtn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  dispatchBtn: { backgroundColor: '#4f46e5' },
  uploadBtn: { backgroundColor: '#2563eb' },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  actionDisabled: { opacity: 0.65 },
  uploaded: { color: '#047857', fontSize: 12, fontWeight: '700' },
  pending: { color: '#b45309', fontSize: 12 },
  empty: { color: '#6b7280', fontSize: 12, paddingVertical: 8 },
});
