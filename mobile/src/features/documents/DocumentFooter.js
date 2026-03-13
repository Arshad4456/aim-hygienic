import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DocumentFooter({ templateConfig = {} }) {
  const footer = templateConfig?.footerConfig || {};

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{footer.customText || 'This is a system generated document.'}</Text>
      {footer.showTerms ? <Text style={styles.terms}>Terms: {footer.termsText || '-'}</Text> : null}
      <View style={styles.row}>
        {footer.showSignatureLine ? <View style={styles.signature}><Text style={styles.label}>Authorized Signature</Text></View> : null}
        {footer.showStampArea ? <View style={styles.stamp}><Text style={styles.label}>Stamp Area</Text></View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e4e4e7', paddingTop: 12 },
  text: { fontSize: 12, color: '#374151' },
  terms: { marginTop: 6, fontSize: 11, color: '#4b5563' },
  row: { marginTop: 12, flexDirection: 'row', gap: 12 },
  signature: { flex: 1, borderTopWidth: 1, borderTopColor: '#9ca3af', paddingTop: 4 },
  stamp: { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: '#9ca3af', padding: 10, alignItems: 'center' },
  label: { fontSize: 10, color: '#6b7280' },
});