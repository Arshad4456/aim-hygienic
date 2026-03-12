import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DynamicDashboardHome({ dashboard, onOpenModule }) {
  const appName = dashboard?.settings?.appName || dashboard?.company?.name || 'ERP';
  const roleName = dashboard?.role?.roleName || 'Role';
  const sharedFeatures = (dashboard?.shell?.sharedFeatures || []).filter((feature) => feature?.isEnabled);
  const modules = dashboard?.modules || [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>{appName}</Text>
        <Text style={styles.welcomeSubtitle}>Role: {roleName}</Text>
      </View>

      <View style={styles.sharedWrap}>
        {sharedFeatures.map((feature) => (
          <View key={feature.code} style={styles.sharedCard}>
            <Text style={styles.sharedText}>{feature.title}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Assigned Modules</Text>
      {modules.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No modules assigned for this role yet.</Text>
        </View>
      ) : (
        modules.map((moduleItem) => (
          <Pressable key={moduleItem.moduleCode} style={styles.moduleCard} onPress={() => onOpenModule(moduleItem.moduleCode)}>
            <Text style={styles.moduleTitle}>{moduleItem.moduleName}</Text>
            <Text style={styles.moduleMeta}>Type: {moduleItem.moduleType || 'default'}</Text>
            <Text style={styles.moduleMeta}>Path: {moduleItem.sidebarPath}</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  welcomeCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  welcomeSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  sharedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sharedCard: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 10 },
  sharedText: { fontSize: 12, color: '#1f2937', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 6 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d1d5db', padding: 12 },
  emptyText: { color: '#6b7280', fontSize: 13 },
  moduleCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, gap: 4 },
  moduleTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  moduleMeta: { fontSize: 12, color: '#6b7280' },
});