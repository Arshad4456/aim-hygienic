import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../../../ui/Card';

const cards = [
  {
    title: 'Module Overview',
    description: 'Manage users, roles, and territory assignments across the organization.',
    route: 'admin:hr',
  },
  {
    title: 'Add User',
    description: 'Create users for warehouses, sales, and suppliers.',
    route: 'admin:users/add',
  },
  {
    title: 'User List',
    description: 'Maintain roles, regions, zones, and territories.',
    route: 'admin:users',
  },
];

export default function HrScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>HR & Role Management</Text>
        <Text style={styles.subtitle}>Manage users, roles, and territory assignments across the organization.</Text>

        <View style={styles.grid}>
          {cards.map((card) => (
            <Pressable key={card.title} style={styles.card} onPress={() => navigation?.navigate?.(card.route)}>
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
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6b7280', fontSize: 13 },
  grid: { marginTop: 12, gap: 10 },
  card: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fafafa', padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardDesc: { marginTop: 4, fontSize: 12, color: '#6b7280' },
});