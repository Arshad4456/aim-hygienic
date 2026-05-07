import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  formatDateTime,
  formatDate,
  getInvoiceKey,
  sumApprovedReceiptAmount,
  sumReceiptAmount,
} from '../utils/orderDocuments';

function currency(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function field(label, value) {
  return { label, value: value === undefined || value === null || value === '' ? '-' : String(value) };
}

function buildSummary(order, variant) {
  if (variant === 'primary-supplier') {
    return [
      field('Primary Order No', getInvoiceKey(order) || '-'),
      field('Status', String(order?.requestStatus || order?.status || 'pending').toUpperCase()),
      field('Date / Time', formatDateTime(order?.transactionAt || order?.createdAt)),
      field('Supplier', order?.supplierName || '-'),
      field('Requested By', order?.fromEntityName || order?.requesterName || '-'),
      field('Dispatch Warehouse', order?.dispatchFromWarehouseName || order?.warehouseName || '-'),
      field('Region', order?.regionName || '-'),
      field('Zone', order?.zoneName || '-'),
      field('Territory', order?.territoryName || order?.territory || order?.areaName || '-'),
      field('POD Status', order?.podUrl ? 'Uploaded' : 'Pending Upload'),
    ];
  }

  return [
    field('Invoice No', getInvoiceKey(order) || '-'),
    field('Status', String(order?.status || 'pending').toUpperCase()),
    field('Date / Time', formatDateTime(order?.createdAt || order?.updatedAt)),
    field('Source', order?.sourceType || '-'),
    field('From', order?.fromEntityName || order?.customerName || '-'),
    field('To', order?.toWarehouseName || order?.toEntityName || order?.distributorName || '-'),
    field('Address', order?.address || order?.deliveryAddress || '-'),
    field('Territory', order?.territoryName || order?.territory || order?.areaName || '-'),
    field('POD Status', order?.podUrl || order?.proofOfDeliveryImageUrl ? 'Uploaded' : 'Not Uploaded'),
  ];
}

function buildItems(order, variant) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.map((item, index) => {
    const qty = Number(item?.quantity || item?.totalPacks || item?.qty || 0);
    const rate = Number(item?.onePackPrice || item?.unitPrice || item?.rate || 0);
    const amount = Number(item?.totalPrice || qty * rate);
    return {
      id: `${index}-${item?.productId || item?.productCode || item?.productName || 'item'}`,
      index: index + 1,
      product: item?.productName || item?.name || item?.productCode || '-',
      section: variant === 'primary-supplier' ? null : item?.section || order?.saleType || 'secondary',
      qty,
      rate,
      amount,
    };
  });
}

export default function OrderDocumentModal({ visible, onClose, order, receipts = [], variant = 'secondary' }) {
  const summary = buildSummary(order, variant);
  const items = buildItems(order, variant);
  const title = variant === 'primary-supplier' ? 'Supplier Primary Order Invoice / Receipt' : 'Secondary Order Invoice / Receipt';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.brandCard}>
              <Text style={styles.brandTitle}>Rawyan ERP</Text>
              <Text style={styles.brandSubtitle}>Mobile document view</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.summaryGrid}>
                {summary.map((item) => (
                  <View key={item.label} style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>{item.label}</Text>
                    <Text style={styles.summaryValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Detail</Text>
              {!items.length ? <Text style={styles.empty}>No products found.</Text> : items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{item.index}. {item.product}</Text>
                  {item.section ? <Text style={styles.itemMeta}>Section: {item.section}</Text> : null}
                  <Text style={styles.itemMeta}>Qty: {item.qty}</Text>
                  <Text style={styles.itemMeta}>Rate: {currency(item.rate)}</Text>
                  <Text style={styles.itemMeta}>Amount: {currency(item.amount)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Linked Receipts</Text>
              <View style={styles.receiptStats}>
                <Text style={styles.receiptStat}>Count: {receipts.length}</Text>
                <Text style={styles.receiptStat}>Approved: {currency(sumApprovedReceiptAmount(receipts))}</Text>
                <Text style={styles.receiptStat}>Total: {currency(sumReceiptAmount(receipts))}</Text>
              </View>
              {!receipts.length ? <Text style={styles.empty}>No linked receipts found.</Text> : receipts.map((receipt) => (
                <View key={receipt?._id || receipt?.receiptNo} style={styles.receiptCard}>
                  <Text style={styles.itemTitle}>{receipt?.receiptNo || '-'}</Text>
                  <Text style={styles.itemMeta}>Payer: {receipt?.payerName || '-'}</Text>
                  <Text style={styles.itemMeta}>Method: {receipt?.paymentMethod || '-'}</Text>
                  <Text style={styles.itemMeta}>Amount: {currency(receipt?.amount || 0)}</Text>
                  <Text style={styles.itemMeta}>Status: {String(receipt?.status || '-').toUpperCase()}</Text>
                  <Text style={styles.itemMeta}>Date: {formatDate(receipt?.paymentDate)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'center', padding: 12 },
  card: { maxHeight: '92%', borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1, paddingRight: 10 },
  closeBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  closeText: { fontSize: 12, fontWeight: '600', color: '#111827' },
  body: { padding: 14, gap: 14 },
  brandCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#f8fafc' },
  brandTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  brandSubtitle: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  summaryGrid: { gap: 10 },
  summaryBox: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, backgroundColor: '#fff' },
  summaryLabel: { fontSize: 11, color: '#6b7280' },
  summaryValue: { marginTop: 4, fontSize: 13, fontWeight: '700', color: '#111827' },
  itemCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, backgroundColor: '#fff' },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  itemMeta: { marginTop: 4, fontSize: 12, color: '#4b5563' },
  receiptStats: { gap: 4 },
  receiptStat: { fontSize: 12, color: '#374151', fontWeight: '600' },
  receiptCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, backgroundColor: '#fff' },
  empty: { color: '#6b7280', fontSize: 12 },
});
