import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../../../../ui/Card';
import SaleStockScreen from '../../inventory/sale-stock/SaleStockScreen';

export default function SalesOrdersScreen({ route }) {
  const initialMode = useMemo(() => (route?.params?.mode === 'secondary' ? 'secondary' : 'primary'), [route?.params?.mode]);
  const [mode, setMode] = useState(initialMode);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Sales Orders</Text>
        <Text style={styles.subtitle}>Primary and secondary order workflows with request list and sale stock ledger.</Text>
        <View style={styles.row}>
          <Pressable style={[styles.chip, mode === 'primary' ? styles.chipActive : null]} onPress={() => setMode('primary')}><Text style={mode === 'primary' ? styles.chipTextActive : null}>Primary Orders</Text></Pressable>
          <Pressable style={[styles.chip, mode === 'secondary' ? styles.chipActive : null]} onPress={() => setMode('secondary')}><Text style={mode === 'secondary' ? styles.chipTextActive : null}>Secondary Orders</Text></Pressable>
        </View>
      </Card>
      <SaleStockScreen mode={mode} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  row: { marginTop: 10, flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  chipTextActive: { color: '#fff' },
});
