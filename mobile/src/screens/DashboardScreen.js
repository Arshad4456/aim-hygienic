import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { get } from '../config/api';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../utils/theme';

export default function DashboardScreen() {
  const { user, refreshUser, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      try {
        await refreshUser();
        const response = await get('/dashboard');
        setDashboardData(response);
      } catch (err) {
        setError(err.message || 'Unable to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [refreshUser]);

  const metrics = useMemo(() => {
    if (!dashboardData || typeof dashboardData !== 'object') {
      return [];
    }

    return Object.entries(dashboardData)
      .slice(0, 3)
      .map(([key, value]) => ({
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        value: typeof value === 'number' ? value : Array.isArray(value) ? value.length : '--',
      }));
  }, [dashboardData]);

  return (
    <ScreenContainer>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Hello, {user?.fullName || user?.username || 'Team Member'} 👋</Text>
        <Text style={styles.heroSubtitle}>Here is a quick look at your operations overview.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.cardText}>Role: {user?.role || '-'}</Text>
        <Text style={styles.cardText}>Mobile: {user?.mobile || '-'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Performance Snapshot</Text>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : metrics.length ? (
          <View style={styles.metricsGrid}>
            {metrics.map((item) => (
              <View style={styles.metricTile} key={item.label}>
                <Text style={styles.metricValue}>{item.value}</Text>
                <Text style={styles.metricLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.cardText}>No dashboard data available.</Text>
        )}
      </View>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.card,
    padding: 18,
    gap: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  heroSubtitle: {
    color: '#dbeafe',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardText: {
    color: theme.colors.muted,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    gap: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  error: {
    color: theme.colors.danger,
  },
  logoutButton: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
  },
});
