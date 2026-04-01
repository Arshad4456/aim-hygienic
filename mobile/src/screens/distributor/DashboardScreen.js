import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../auth/useAuth';
import Card from '../../ui/Card';

const dashboardLinks = [
  { title: 'Dashboard', route: 'distributor:dashboard' },
  { title: 'Expense', route: 'distributor:expense' },
  { title: 'Receipts', route: 'distributor:receipts' },
  { title: 'Payments', route: 'distributor:payments' },
  { title: 'Primary Payments (Received)', route: 'distributor:payments/primary' },
  { title: 'Secondary Payments (Paid Back)', route: 'distributor:payments/secondary' },
  { title: 'Primary Order Request', route: 'distributor:primary-order-request' },
  { title: 'Secondary Orders', route: 'distributor:orders' },
  { title: 'Return Stock', route: 'distributor:return-stock' },
  { title: 'Messages', route: 'distributor:messages' },
  { title: 'Live Tracking', route: 'distributor:live-tracking' },
  { title: 'Reports', route: 'distributor:reports' },
  { title: 'Account Settings', route: 'distributor:settings' },
  { title: 'Change Password', route: 'distributor:settings/change-password' },
];

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return dashboardLinks;
    return dashboardLinks.filter((item) => item.title.toLowerCase().includes(value));
  }, [query]);

  const userName = user?.fullName || user?.name || 'Distributor';
  const userRole = user?.role || 'Distributor';
  const userInitials = useMemo(() => {
    const parts = String(userName).split(' ').filter(Boolean);
    const first = parts[0]?.[0] || 'D';
    const second = parts[1]?.[0] || 'B';
    return `${first}${second}`.toUpperCase();
  }, [userName]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Distributor Dashboard</Text>
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
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickWrap}>
          <Pressable style={styles.quickBtn} onPress={() => navigation?.navigate?.('distributor:settings')}>
            <Text style={styles.quickText}>Account Settings</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation?.navigate?.('distributor:settings/change-password')}>
            <Text style={styles.quickText}>Change Password</Text>
          </Pressable>
          <Pressable
            style={[styles.quickBtn, styles.logoutBtn]}
            onPress={async () => {
              await logout();
            }}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  userMeta: { marginTop: 8, color: '#52525b', fontSize: 12 },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#047857', fontWeight: '700' },
  search: { marginTop: 12, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 12, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionHint: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  quickWrap: { marginTop: 10, gap: 8 },
  quickBtn: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 10 },
  quickText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  logoutBtn: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  logoutText: { fontSize: 12, color: '#b91c1c', fontWeight: '700' },
  modulesWrap: { marginTop: 10, gap: 8 },
  moduleItem: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 10 },
  moduleText: { color: '#111827', fontSize: 13 },
  empty: { color: '#6b7280', fontSize: 12, paddingVertical: 8 },
});