import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Card from '../../../../../../../foundation/ui/Card';
import ReturnStockScreen from '../../../../../../common/inventory/screens/admin/return-stock/ReturnStockScreen';

export default function ReturnsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Returns & Claims</Text>
        <Text style={styles.subtitle}>Return stock request workflow and return stock ledger (same backend flow).</Text>
      </Card>
      <ReturnStockScreen />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
});