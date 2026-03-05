import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../../../ui/Card';

const MODULE_CARDS = [
  { key: 'PURCHASING_STOCK', title: '1 Purchasing Stock', subtitle: 'Purchasing Stock', route: 'admin:inventory/purchase-stock' },
  { key: 'SALE_STOCK', title: '2 Sale Stock', subtitle: 'Sale Stock', route: 'admin:inventory/sale-stock' },
  { key: 'DAMAGE_STOCK', title: '3 Damage Stock', subtitle: 'Damage Stock', route: 'admin:inventory/damage-stock' },
  { key: 'RETURN_STOCK', title: '4 Return Stock', subtitle: 'Return Stock', route: 'admin:inventory/return-stock' },
  { key: 'W2W_TRANSFER', title: '5 Warehouse to Warehouse Transfer', subtitle: 'Warehouse to Warehouse Transfer', route: 'admin:inventory/transfers' },
  { key: 'STOCK_SUMMARY', title: '6 Stock Summary', subtitle: 'Stock Summary', route: 'admin:inventory/summary' },
  { key: 'LOW_STOCK', title: '7 Low Stock Alert', subtitle: 'Low Stock Alert', route: 'admin:inventory/low-stock' },
  { key: 'INVENTORY_LEDGER', title: '8 Inventory Ledger', subtitle: 'Inventory Ledger', route: 'admin:inventory/ledger' },
  { key: 'WAREHOUSE_MASTER', title: '9 Warehouse Master', subtitle: 'Warehouse Master', route: 'admin:warehouses' },
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
        {MODULE_CARDS.map((card) => (
          <Card key={card.key}>
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
  cardTitle: { marginTop: 4, fontSize: 18, color: '#111827', fontWeight: '700' },
  cardSubtitle: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  openBtn: { marginTop: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#10b981', backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  openText: { color: '#047857', fontWeight: '700', fontSize: 12 },
});