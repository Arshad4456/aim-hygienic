import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../../../foundation/auth/useAuth';
import Card from '../../../../foundation/ui/Card';
import Button from '../../../../foundation/ui/Button';

export default function SettingsScreen() {
  const { user, role, logout } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.line}>Name: {user?.fullName || '-'}</Text>
        <Text style={styles.line}>Role: {role || '-'}</Text>
        <Text style={styles.line}>Mobile: {user?.mobile || '-'}</Text>
      </Card>
      <Button title="Logout" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  line: { fontSize: 14, marginBottom: 6, color: '#3f3f46' },
});