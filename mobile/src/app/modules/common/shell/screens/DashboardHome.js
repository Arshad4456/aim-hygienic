import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../../../foundation/auth/useAuth';
import { getRoleModules } from '../../../../navigation/RoleMenuConfig';
import { toTitle } from '../../../../foundation/utils/routeTitle';
import Card from '../../../../foundation/ui/Card';

function groupModules(modules) {
  const grouped = {};
  modules.forEach((mod) => {
    const key = (mod.modulePath || 'other').split('/')[0] || 'other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(mod);
  });
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
}

export default function DashboardHome({ navigation }) {
  const { role, roleKey, user, isKnownRole } = useAuth();
  const modules = getRoleModules(roleKey);
  const groups = useMemo(() => groupModules(modules), [modules]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <Text style={styles.pageSubtitle}>{user?.fullName || user?.name || 'User'} • {role}</Text>
        {!isKnownRole ? <Text style={styles.warning}>Unknown role mapped to admin module set.</Text> : null}
      </Card>

      <View style={styles.kpiRow}>
        <Card style={styles.kpiCard}><Text style={styles.kpiLabel}>Modules</Text><Text style={styles.kpiValue}>{modules.length}</Text></Card>
        <Card style={styles.kpiCard}><Text style={styles.kpiLabel}>Groups</Text><Text style={styles.kpiValue}>{groups.length}</Text></Card>
      </View>

      {groups.map(([groupName, items]) => (
        <Card key={groupName}>
          <Text style={styles.sectionTitle}>{groupName.toUpperCase()}</Text>
          <Text style={styles.sectionHelp}>{items.length} modules</Text>
          <View style={styles.moduleList}>
            {items.map((mod) => (
              <Pressable key={mod.key} style={styles.item} onPress={() => navigation.navigate(mod.key)}>
                <Text style={styles.itemTitle}>{toTitle(mod.modulePath || 'dashboard')}</Text>
                <Text style={styles.route}>{mod.modulePath || '/'}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionHelp: { marginTop: 4, color: '#6b7280', fontSize: 12, marginBottom: 10 },
  moduleList: { gap: 8 },
  item: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  route: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});