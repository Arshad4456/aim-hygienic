import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function RuntimeModuleScreen({ moduleItem }) {
  if (!moduleItem) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Module not found for this role.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{moduleItem.moduleName}</Text>
      <Text style={styles.meta}>Code: {moduleItem.moduleCode}</Text>
      <Text style={styles.meta}>Type: {moduleItem.moduleType || 'default'}</Text>
      <Text style={styles.meta}>Subtypes: {(moduleItem.selectedSubtypes || []).join(', ') || '-'}</Text>
      <Text style={styles.meta}>Sections: {(moduleItem.selectedSections || []).join(', ') || '-'}</Text>
      <Text style={styles.meta}>Allowed actions: {(moduleItem.allowedActions || []).join(', ') || '-'}</Text>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Section permissions</Text>
        {(moduleItem.sectionPermissions || []).length === 0 ? (
          <Text style={styles.meta}>No section-level permissions configured.</Text>
        ) : (
          moduleItem.sectionPermissions.map((section) => (
            <Text key={section.sectionCode} style={styles.meta}>
              {section.sectionCode}: {(section.allowedActions || []).join(', ') || '-'}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 14, color: '#374151' },
  sectionBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 6 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6b7280', fontSize: 14 },
});
