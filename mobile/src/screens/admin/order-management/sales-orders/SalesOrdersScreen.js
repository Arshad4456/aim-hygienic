import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Card from '../../../../ui/Card';
import SaleStockScreen from '../../inventory/sale-stock/SaleStockScreen';

export default function SalesOrdersScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Sales Orders</Text>
        <Text style={styles.subtitle}>Primary and secondary sale order workflow with order request list and sale stock ledger.</Text>
      </Card>
      <SaleStockScreen />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
});
