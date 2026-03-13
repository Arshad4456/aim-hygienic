import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DocumentHeader from './DocumentHeader';
import DocumentFooter from './DocumentFooter';

export const FALLBACK_INVOICE_TEMPLATE = {
  layoutVariant: 'standard',
  styleConfig: { primaryColor: '#10b981', accentColor: '#0f172a', showLogo: true, tableStyle: 'bordered' },
  headerConfig: { title: 'Invoice', subtitle: 'Sales Invoice' },
  footerConfig: { customText: 'This is a system generated document.', showSignatureLine: true, showStampArea: true },
};

export default function InvoiceRenderer({ documentData = {}, templateConfig, company = {}, settings = {} }) {
  const template = templateConfig || FALLBACK_INVOICE_TEMPLATE;
  const items = documentData?.items || [];

  return (
    <View>
      <DocumentHeader title="Invoice" templateConfig={template} documentData={documentData} company={company} settings={settings} />
      <View style={styles.listWrap}>
        {items.length ? items.map((item, idx) => (
          <View key={`${item.productName}-${idx}`} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.productName || '-'}</Text>
            <Text style={styles.itemMeta}>Qty: {Number(item.quantity || 0).toLocaleString()}</Text>
            <Text style={styles.itemMeta}>Rate: {Number(item.unitPrice || 0).toFixed(2)}</Text>
            <Text style={styles.itemMeta}>Amount: {Number(item.amount || 0).toFixed(2)}</Text>
          </View>
        )) : <Text style={styles.empty}>No line items available.</Text>}
      </View>
      <View style={styles.totalCard}><Text style={styles.total}>Total: PKR {Number(documentData?.totals?.totalAmount || 0).toLocaleString()}</Text></View>
      {documentData?.notes ? <Text style={styles.notes}>Notes: {documentData.notes}</Text> : null}
      <DocumentFooter templateConfig={template} />
    </View>
  );
}

const styles = StyleSheet.create({
  listWrap: { marginTop: 12, gap: 8 },
  itemCard: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  itemName: { fontWeight: '600', color: '#111827' },
  itemMeta: { fontSize: 12, color: '#4b5563', marginTop: 2 },
  empty: { fontSize: 12, color: '#6b7280' },
  totalCard: { marginTop: 12, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, backgroundColor: '#f9fafb' },
  total: { textAlign: 'right', fontWeight: '700', color: '#111827' },
  notes: { marginTop: 10, color: '#374151', fontSize: 12 },
});
