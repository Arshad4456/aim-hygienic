import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DocumentHeader from './DocumentHeader';
import DocumentFooter from './DocumentFooter';

export const FALLBACK_RECEIPT_TEMPLATE = {
  layoutVariant: 'standard',
  styleConfig: { primaryColor: '#14b8a6', accentColor: '#0f172a', showLogo: true, tableStyle: 'minimal' },
  headerConfig: { title: 'Receipt', subtitle: 'Payment Receipt' },
  footerConfig: { customText: 'This is a system generated receipt.', showSignatureLine: true, showStampArea: true },
};

export default function ReceiptRenderer({ documentData = {}, templateConfig, company = {}, settings = {} }) {
  const template = templateConfig || FALLBACK_RECEIPT_TEMPLATE;
  const rows = [
    ['Receipt No', documentData.documentNo],
    ['Payer', documentData.customerName],
    ['Payment Method', documentData.paymentMethod],
    ['Paid To', documentData.paidTo],
    ['Linked Invoice', documentData.linkedInvoiceNo],
    ['Reference', documentData.referenceNo],
    ['Amount', `PKR ${Number(documentData?.totals?.totalAmount || 0).toLocaleString()}`],
  ];

  return (
    <View>
      <DocumentHeader title="Receipt" templateConfig={template} documentData={documentData} company={company} settings={settings} />
      <View style={styles.card}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.row}>
            <Text style={styles.k}>{k}</Text>
            <Text style={styles.v}>{v || '-'}</Text>
          </View>
        ))}
      </View>
      {documentData?.notes ? <Text style={styles.notes}>Notes: {documentData.notes}</Text> : null}
      <DocumentFooter templateConfig={template} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, padding: 10, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  k: { fontSize: 12, color: '#6b7280' },
  v: { fontSize: 12, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'right' },
  notes: { marginTop: 10, color: '#374151', fontSize: 12 },
});
