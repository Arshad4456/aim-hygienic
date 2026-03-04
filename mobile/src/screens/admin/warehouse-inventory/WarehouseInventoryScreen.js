import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../../../ui/Card';

const MODULE_CARDS = [
  { key: 'PURCHASING_STOCK', title: 'Purchasing Stock', subtitle: 'Record receiving stock from procurement.', route: 'admin:inventory/summary' },
  { key: 'SALE_STOCK', title: 'Sale Stock', subtitle: 'Track stock issued for sales operations.', route: 'admin:inventory/summary' },
  { key: 'DAMAGE_STOCK', title: 'Damage Stock', subtitle: 'Capture damage and loss adjustments.', route: 'admin:inventory/low-stock' },
  { key: 'RETURN_STOCK', title: 'Return Stock', subtitle: 'Manage returned inventory entries.', route: 'admin:inventory/transfers' },
  { key: 'W2W_TRANSFER', title: 'Warehouse to Warehouse Transfer', subtitle: 'Manage inter-warehouse movement.', route: 'admin:inventory/transfers' },
  { key: 'STOCK_SUMMARY', title: 'Stock Summary', subtitle: 'View consolidated inventory balances.', route: 'admin:inventory/summary' },
  { key: 'LOW_STOCK', title: 'Low Stock Alert', subtitle: 'Monitor reorder and alert levels.', route: 'admin:inventory/low-stock' },
  { key: 'INVENTORY_LEDGER', title: 'Inventory Ledger', subtitle: 'Review transaction-level inventory logs.', route: 'admin:inventory/ledger' },
  { key: 'WAREHOUSE_MASTER', title: 'Warehouse Master', subtitle: 'Manage warehouse records and setup.', route: 'admin:warehouses' },
];

export default function WarehouseInventoryScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Warehouse & Inventory</Text>
        <Text style={styles.subtitle}>Module Overview</Text>
        <Text style={styles.help}>Use these modules to manage stock movement, transfers, ledger and warehouse master setup just like website dashboard.</Text>
      </Card>

      <View style={styles.grid}>
        {MODULE_CARDS.map((card, index) => (
          <Card key={card.key}>
            <Text style={styles.cardIndex}>{index + 1}</Text>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            <Pressable style={styles.openBtn} onPress={() => navigation?.navigate?.(card.route)}>
              <Text style={styles.openText}>Open</Text>
            </Pressable>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8', gap: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, fontSize: 15, color: '#374151', fontWeight: '600' },
  help: { marginTop: 8, color: '#6b7280', fontSize: 13 },
  grid: { gap: 10 },
  cardIndex: { fontSize: 12, color: '#10b981', fontWeight: '700' },
  cardTitle: { marginTop: 4, fontSize: 18, color: '#111827', fontWeight: '700' },
  cardSubtitle: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  openBtn: { marginTop: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#10b981', backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  openText: { color: '#047857', fontWeight: '700', fontSize: 12 },
});
