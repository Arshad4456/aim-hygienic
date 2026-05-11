import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../../../../../foundation/ui/Card';

const cards = [
  {
    title: 'Add User',
    description: 'Create salesman, order booker, and customer users for your territory.',
    routeKey: 'distributor:users/add',
  },
  {
    title: 'User List',
    description: 'Manage salesman, order booker, and customer users in your territory.',
    routeKey: 'distributor:users',
  },
];

export default function HrScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>HR & Role Management</Text>
        <Text style={styles.subtitle}>Distributor can add and manage Salesman, Order Booker and customer users only in assigned territory.</Text>

        <View style={styles.grid}>
          {cards.map((card) => (
            <Pressable key={card.title} style={styles.card} onPress={() => navigation?.navigate?.(card.routeKey)}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDesc}>{card.description}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  grid: { marginTop: 12, gap: 10 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fafafa', padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardDesc: { marginTop: 4, fontSize: 12, color: '#6b7280' },
});