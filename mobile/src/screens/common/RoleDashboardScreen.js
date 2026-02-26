import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, AppCard, EmptyState } from '../../components/ui';
import { getDashboardSummary, getNotifications } from '../../services/dashboardService';

export default function RoleDashboardScreen({ route, navigation }) {
  const { role, modules = [] } = route.params;
  const [summary, setSummary] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [summaryData, notices] = await Promise.all([getDashboardSummary(role), getNotifications()]);
      setSummary(summaryData);
      setNotifications(Array.isArray(notices) ? notices : notices?.items || []);
    } catch (error) {
      setSummary(null);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [role]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDashboard} />}
    >
      <Text style={styles.heading}>{String(role).toUpperCase()} Dashboard</Text>
      <View style={styles.summaryRow}>
        <AppCard title="Pending Tasks" value={summary?.pendingTasks ?? 0} />
        <AppCard title="Open Orders" value={summary?.openOrders ?? 0} />
      </View>
      <AppCard title="Quick Actions" subtitle="Access all modules from drawer navigation quickly." />
      <Text style={styles.sectionTitle}>Notifications</Text>
      {notifications.length ? notifications.slice(0, 5).map((item, index) => (
        <AppCard key={item._id || index} title={item.title || 'Notification'} subtitle={item.body || 'New activity available'} />
      )) : <EmptyState title="No notifications" subtitle="You are all caught up." />}

      <Text style={styles.sectionTitle}>Module Access</Text>
      {modules.map((moduleName) => (
        <AppCard key={moduleName} title={moduleName}>
          <AppButton
            variant="secondary"
            label="Open"
            onPress={() => navigation.navigate('ModuleDetails', { moduleName, role })}
          />
        </AppCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  sectionTitle: { fontWeight: '600', marginVertical: 10 },
  summaryRow: { flexDirection: 'row', gap: 10 }
});