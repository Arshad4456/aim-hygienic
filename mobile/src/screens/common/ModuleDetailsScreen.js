import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { AppCard } from '../../components/ui';

const moduleGuidance = {
  Orders: ['Primary Orders', 'Secondary Orders', 'Approve/Reject', 'Dispatch', 'Delivered status'],
  'Vehicle Management': ['Vehicle list', 'Fuel trip entry', 'Maintenance proof upload via presigned URL'],
  'Payment Management': ['Primary/Secondary payment', 'Approve/reject', 'Ledger'],
  'Create Secondary Order': ['Manual customer details', 'Field auto-fill from user profile'],
  Deliveries: ['Assigned orders', 'POD upload', 'Rejection feedback']
};

export default function ModuleDetailsScreen({ route }) {
  const { moduleName, role } = route.params;
  const checklist = moduleGuidance[moduleName] || ['Summary cards', 'Quick actions', 'Pending tasks', 'Analytics'];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{moduleName}</Text>
      <AppCard title="Role" subtitle={String(role).toUpperCase()} />
      {checklist.map((item) => (
        <AppCard key={item} title={item} subtitle="Driven by backend authorization and APIs." />
      ))}
      <AppCard title="R2 Upload Flow" subtitle="Presigned URL request → PUT upload → backend confirmation with publicUrl." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 16 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 12 }
});
