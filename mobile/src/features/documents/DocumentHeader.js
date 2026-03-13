import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function DocumentHeader({ templateConfig = {}, documentData = {}, company = {}, settings = {}, title = 'Document' }) {
  const styleConfig = templateConfig?.styleConfig || {};
  const headerConfig = templateConfig?.headerConfig || {};

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={[styles.title, { color: styleConfig.accentColor || '#0f172a' }]}>{headerConfig.title || title}</Text>
          {headerConfig.subtitle ? <Text style={styles.subtitle}>{headerConfig.subtitle}</Text> : null}
          {headerConfig.customText ? <Text style={styles.note}>{headerConfig.customText}</Text> : null}
        </View>

        {styleConfig.showLogo !== false && company?.logoUrl ? <Image source={{ uri: company.logoUrl }} style={styles.logo} /> : null}
      </View>

      <Text style={styles.company}>{settings?.appName || company?.name || 'AIM Hygienic ERP'}</Text>
      {styleConfig.showCompanyAddress !== false && company?.address ? <Text style={styles.meta}>{company.address}</Text> : null}
      {styleConfig.showPhone !== false && company?.phone ? <Text style={styles.meta}>{company.phone}</Text> : null}
      {styleConfig.showEmail !== false && company?.email ? <Text style={styles.meta}>{company.email}</Text> : null}

      <View style={styles.metaGrid}>
        <Text style={styles.meta}>Doc #: {documentData?.documentNo || '-'}</Text>
        <Text style={styles.meta}>Date: {documentData?.documentDate ? new Date(documentData.documentDate).toLocaleDateString() : '-'}</Text>
        <Text style={styles.meta}>Customer: {documentData?.customerName || '-'}</Text>
        <Text style={styles.meta}>Status: {documentData?.status || '-'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, borderBottomColor: '#e4e4e7', paddingBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  left: { flex: 1, paddingRight: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  note: { fontSize: 11, color: '#52525b', marginTop: 2 },
  logo: { width: 50, height: 50, borderRadius: 8 },
  company: { marginTop: 8, fontWeight: '600', color: '#111827' },
  meta: { marginTop: 2, fontSize: 12, color: '#4b5563' },
  metaGrid: { marginTop: 8 },
});
