import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/useAuth';
import { getRoleModules } from '../../navigation/RoleMenuConfig';
import { toTitle } from '../../utils/routeTitle';
import Card from '../../ui/Card';

export default function DashboardHome({ navigation }) {
  const { role, roleKey, user, isKnownRole } = useAuth();
  const modules = getRoleModules(roleKey);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <Text style={styles.pageSubtitle}>{user?.fullName || user?.name || 'User'} • {role}</Text>
        {!isKnownRole ? <Text style={styles.warning}>Unknown role mapped to admin module set.</Text> : null}
      </Card>

      <View style={styles.kpiRow}>
        <Card style={styles.kpiCard}><Text style={styles.kpiLabel}>Total Modules</Text><Text style={styles.kpiValue}>{modules.length}</Text></Card>
        <Card style={styles.kpiCard}><Text style={styles.kpiLabel}>Role</Text><Text style={styles.kpiValueSmall}>{role}</Text></Card>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>All Modules</Text>
        <Text style={styles.sectionHelp}>Open each screen with the same backend/API integration as web.</Text>
      </Card>

      {modules.map((mod) => (
        <Pressable key={mod.key} style={styles.item} onPress={() => navigation.navigate(mod.key)}>
          <Text style={styles.itemTitle}>{toTitle(mod.modulePath || 'dashboard')}</Text>
          <Text style={styles.route}>{mod.modulePath || '/'}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#111827' },
  pageSubtitle: { marginTop: 6, color: '#52525b' },
  warning: { marginTop: 6, color: '#b45309', fontSize: 12 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiCard: { flex: 1 },
  kpiLabel: { color: '#6b7280', fontSize: 12 },
  kpiValue: { marginTop: 4, fontSize: 22, fontWeight: '700', color: '#111827' },
  kpiValueSmall: { marginTop: 4, fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionHelp: { marginTop: 6, color: '#6b7280', fontSize: 12 },
  item: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  itemTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  route: { fontSize: 13, color: '#6b7280', marginTop: 4 },
});
