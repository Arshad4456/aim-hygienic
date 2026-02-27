import React, { useEffect, useState } from 'react';
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

  return (
    <ScreenContainer>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current User</Text>
        <Text style={styles.cardText}>Name: {user?.fullName || user?.username || '-'}</Text>
        <Text style={styles.cardText}>Role: {user?.role || '-'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backend Dashboard Payload</Text>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text style={styles.payload}>{JSON.stringify(dashboardData, null, 2)}</Text>
        )}
      </View>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 14,
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
  payload: {
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  error: {
    color: theme.colors.danger,
  },
  logoutButton: {
    marginTop: 4,
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
});