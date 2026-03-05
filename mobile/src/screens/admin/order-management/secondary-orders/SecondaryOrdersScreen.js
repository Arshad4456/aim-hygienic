import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Card from '../../../../ui/Card';

export default function SecondaryOrdersScreen({ active = false, onOpen }) {
  return (
    <Pressable onPress={() => (typeof onOpen === 'function' ? onOpen('secondary') : null)}>
      <Card style={[styles.card, active ? styles.cardActive : styles.cardInactive]}>
        <Text style={styles.cardTitle}>Secondary Orders Card</Text>
        <Text style={styles.cardSubtitle}>Open secondary orders flow.</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  cardActive: {
    borderColor: '#86efac',
    backgroundColor: '#ecfdf5',
  },
  cardInactive: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18181b',
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#52525b',
  },
});
