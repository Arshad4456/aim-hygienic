import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import DashboardHome from './DashboardHome';
import Card from '../../ui/Card';

export default function RoleShellBase({ label, navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{label} Dashboard</Text>
        <Text style={styles.subtitle}>Role shell loaded with shared ERP dashboard modules.</Text>
      </Card>
      <DashboardHome navigation={navigation} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#18181b' },
  subtitle: { fontSize: 13, color: '#52525b', marginTop: 6 },
});