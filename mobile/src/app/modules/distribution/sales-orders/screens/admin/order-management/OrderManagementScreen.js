
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../../../../../../foundation/ui/Card';
import SaleStockScreen from '../../../../../common/inventory/screens/admin/sale-stock/SaleStockScreen';
import ReturnStockScreen from '../../../../../common/inventory/screens/admin/return-stock/ReturnStockScreen';
import SecondaryOrdersScreen from './secondary-orders/SecondaryOrdersScreen';

const ORDER_CARDS = [
  { key: 'primary', title: 'Primary Orders Card', subtitle: 'Open primary orders workflow and ledger.', panelTitle: 'Primary Orders', panelDesc: 'Create and manage primary sale orders like website flow.' },
  { key: 'secondary', title: 'Secondary Orders Card', subtitle: 'Open secondary orders workflow and ledger.', panelTitle: 'Secondary Orders', panelDesc: 'Manage secondary order requests and status updates.' },
  { key: 'returnStock', title: 'Return Stock Card', subtitle: 'Open return stock request workflow and ledger.', panelTitle: 'Return Stock', panelDesc: 'Create return stock requests and manage return ledger.' },
];

export default function OrderManagementScreen() {
  const [active, setActive] = useState('primary');
  const current = ORDER_CARDS.find((c) => c.key === active) || ORDER_CARDS[0];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Order Management Module Overview</Text>
        <Text style={styles.subtitle}>Choose one workflow card to manage request form and ledger.</Text>
      </Card>

      <View style={styles.grid}>
        {ORDER_CARDS.map((card) => (
          <Pressable key={card.key} onPress={() => setActive(card.key)}>
            <Card style={[styles.card, active === card.key ? styles.cardActive : null]}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              <Pressable style={styles.openBtn} onPress={() => setActive(card.key)}>
                <Text style={styles.openText}>Open</Text>
              </Pressable>
            </Card>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={styles.panelTitle}>{current.panelTitle}</Text>
        <Text style={styles.panelText}>{current.panelDesc}</Text>
      </Card>

      {active === 'returnStock' ? <ReturnStockScreen /> : active === 'secondary' ? <SecondaryOrdersScreen /> : <SaleStockScreen />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8', gap: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  grid: { gap: 10 },
  card: { borderWidth: 1, borderColor: '#e5e7eb' },
  cardActive: { borderColor: '#6ee7b7', backgroundColor: '#ecfdf5' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardSubtitle: { marginTop: 5, color: '#6b7280', fontSize: 13 },
  openBtn: { marginTop: 12, borderWidth: 1, borderColor: '#10b981', alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#ecfdf5' },
  openText: { color: '#047857', fontWeight: '700', fontSize: 12 },
  panelTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  panelText: { marginTop: 6, color: '#6b7280' },
});
