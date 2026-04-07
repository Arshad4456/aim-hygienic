import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../auth/useAuth';
import apiClient from '../../api/client';
import Card from '../../ui/Card';
import Loader from '../../ui/Loader';
import DutyTrackingCard from '../../modules/tracking/DutyTrackingCard';

const dashboardLinks = [{ title: 'Dashboard', route: 'supplier:dashboard' }];

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

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [uploadingFor, setUploadingFor] = useState('');
  const [dispatchingFor, setDispatchingFor] = useState('');

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return dashboardLinks;
    return dashboardLinks.filter((item) => item.title.toLowerCase().includes(value));
  }, [query]);

  const userName = user?.fullName || user?.name || 'Supplier';
  const userRole = user?.role || 'Supplier';
  const userInitials = useMemo(() => {
    const parts = String(userName).split(' ').filter(Boolean);
    const first = parts[0]?.[0] || 'S';
    const second = parts[1]?.[0] || 'P';
    return `${first}${second}`.toUpperCase();
  }, [userName]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    setOrdersError('');
    try {
      const res = await apiClient.get('/orders/supplier-deliveries?limit=500');
      setOrders(res?.data?.orders || []);
    } catch (e) {
      setOrdersError(e.message || 'Failed to load primary deliveries');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const dispatchOrder = async (orderId) => {
    setDispatchingFor(orderId);
    setOrdersError('');
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'dispatched' });
      await loadOrders();
    } catch (e) {
      setOrdersError(e.message || 'Failed to dispatch order');
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
    setOrdersError('');
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
      setOrdersError(e.message || 'Failed to upload POD');
    } finally {
      setUploadingFor('');
    }
  };

  if (loadingOrders && !orders.length) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.companyName}>AIM HYGIENICS (PVT) LIMITED</Text>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Supplier Dashboard</Text>
            <Text style={styles.subtitle}>Use quick search to navigate all available items for your dashboard.</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </View>
        </View>

        <Text style={styles.userMeta}>{userName} • {userRole}</Text>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search this dashboard..."
          placeholderTextColor="#6b7280"
        />
      </Card>

      <DutyTrackingCard />

      <Card>
        <Text style={styles.sectionTitle}>Modules</Text>
        <Text style={styles.sectionHint}>Navigate all pages assigned to this dashboard.</Text>
        <View style={styles.modulesWrap}>
          {filtered.map((item) => (
            <Pressable key={item.route} style={styles.moduleItem} onPress={() => navigation?.navigate?.(item.route)}>
              <Text style={styles.moduleText}>{item.title}</Text>
            </Pressable>
          ))}
          {!filtered.length ? <Text style={styles.empty}>No match found.</Text> : null}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Primary Dispatch Queue</Text>
        <Text style={styles.sectionHint}>Approved primary orders for your warehouse mapping. Dispatch first, then upload POD.</Text>
        {ordersError ? <Text style={styles.error}>{ordersError}</Text> : null}
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
                <View style={styles.actionRow}>
                  {isApproved ? (
                    <Pressable style={[styles.btn, styles.dispatchBtn, dispatchingFor === order._id ? styles.actionDisabled : null]} disabled={dispatchingFor === order._id} onPress={() => dispatchOrder(order._id)}>
                      <Text style={styles.btnText}>{dispatchingFor === order._id ? 'Dispatching...' : 'Dispatch'}</Text>
                    </Pressable>
                  ) : null}
                  {order.podUrl ? (
                    <Text style={styles.uploaded}>POD Uploaded</Text>
                  ) : isDispatched ? (
                    <Pressable style={[styles.btn, styles.uploadBtn, uploadingFor === order._id ? styles.actionDisabled : null]} disabled={uploadingFor === order._id} onPress={() => uploadPod(order._id)}>
                      <Text style={styles.btnText}>{uploadingFor === order._id ? 'Uploading...' : 'Upload POD'}</Text>
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
  content: { padding: 12, paddingBottom: 26, gap: 12 },
  companyName: { fontSize: 10, color: '#6b7280', fontWeight: '600', letterSpacing: 0.4, marginBottom: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  userMeta: { marginTop: 8, color: '#52525b', fontSize: 12 },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#0369a1', fontWeight: '700' },
  search: { marginTop: 12, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 12, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionHint: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  modulesWrap: { marginTop: 10, gap: 8 },
  moduleItem: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 10 },
  moduleText: { color: '#111827', fontSize: 13 },
  empty: { color: '#6b7280', fontSize: 12, paddingVertical: 8 },
  error: { marginTop: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 10, padding: 10, fontSize: 12 },
  orderCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  orderTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  orderMeta: { marginTop: 3, color: '#4b5563', fontSize: 12 },
  actionRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  btn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  dispatchBtn: { backgroundColor: '#4f46e5' },
  uploadBtn: { backgroundColor: '#2563eb' },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  actionDisabled: { opacity: 0.65 },
  uploaded: { color: '#047857', fontSize: 12, fontWeight: '700' },
  pending: { color: '#b45309', fontSize: 12 },
});
