import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
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
        <Text style={styles.title}>AIM ERP Mobile</Text>
        <Text style={styles.subtitle}>{user?.fullName || user?.name || 'User'} • {role}</Text>
        {!isKnownRole ? <Text style={styles.warning}>Unknown role mapped to admin menu.</Text> : null}
      </Card>
      {modules.map((mod) => (
        <Pressable key={mod.key} style={styles.item} onPress={() => navigation.jumpTo(mod.key)}>
          <Text style={styles.itemTitle}>{toTitle(mod.modulePath || 'dashboard')}</Text>
          <Text style={styles.route}>{mod.modulePath || '/'}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#18181b' },
  subtitle: { marginTop: 6, color: '#52525b' },
  warning: { marginTop: 6, color: '#b45309', fontSize: 12 },
  item: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4e4e7', padding: 14 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#18181b' },
  route: { fontSize: 12, color: '#71717a', marginTop: 4 },
});