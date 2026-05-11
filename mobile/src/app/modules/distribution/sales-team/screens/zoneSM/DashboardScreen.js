import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../../../../foundation/auth/useAuth';
import Card from '../../../../../foundation/ui/Card';

const dashboardLinks = [{ title: 'Dashboard', route: 'zoneSM:dashboard' }];

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return dashboardLinks;
    return dashboardLinks.filter((item) => item.title.toLowerCase().includes(value));
  }, [query]);

  const userName = user?.fullName || user?.name || 'Zone Sale Manager';
  const userRole = user?.role || 'Zone Sale Manager';
  const userInitials = useMemo(() => {
    const parts = String(userName).split(' ').filter(Boolean);
    const first = parts[0]?.[0] || 'C';
    const second = parts[1]?.[0] || 'D';
    return `${first}${second}`.toUpperCase();
  }, [userName]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.companyName}>AIM HYGIENICS (PVT) LIMITED</Text>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{userRole} Dashboard</Text>
            <Text style={styles.subtitle}>Use quick search to navigate all available items for your dashboard.</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </View>
        </View>

        <Text style={styles.userMeta}>{userName} • {userRole}</Text>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search this dashboard..."
          placeholderTextColor="#6b7280"
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Modules</Text>
        <Text style={styles.sectionHint}>Navigate all pages assigned to this dashboard.</Text>
        <View style={styles.modulesWrap}>
          {filtered.map((item) => (
            <Pressable key={item.route} style={styles.moduleItem} onPress={() => navigation?.navigate?.(item.route)}>
              <Text style={styles.moduleText}>{item.title}</Text>
            </Pressable>
          ))}
          {!filtered.length ? <Text style={styles.empty}>No match found.</Text> : null}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26, gap: 12 },
  companyName: { fontSize: 10, color: '#6b7280', fontWeight: '600', letterSpacing: 0.4, marginBottom: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  userMeta: { marginTop: 8, color: '#52525b', fontSize: 12 },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#0369a1', fontWeight: '700' },
  search: { marginTop: 12, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 12, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionHint: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  modulesWrap: { marginTop: 10, gap: 8 },
  moduleItem: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 10 },
  moduleText: { color: '#111827', fontSize: 13 },
  empty: { color: '#6b7280', fontSize: 12, paddingVertical: 8 },
});