import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Card from '../../../../ui/Card';

export default function SecondaryOrdersScreen({ active = false, onOpen }) {
  const handleOpen = () => {
    if (typeof onOpen === 'function') onOpen('secondary');
  };

  return (
    <Pressable onPress={handleOpen}>
      <Card style={[styles.card, active ? styles.cardActive : null]}>
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle}>Secondary Orders Card</Text>
          <View style={[styles.badge, active ? styles.badgeActive : null]}>
            <Text style={[styles.badgeText, active ? styles.badgeTextActive : null]}>{active ? 'Active' : 'Module'}</Text>
          </View>
        </View>

        <Text style={styles.cardSubtitle}>Open secondary orders flow.</Text>
        <Text style={styles.cardMeta}>Secondary Order Request • Requests List • Status Update • Ledger</Text>

        <Pressable style={[styles.openBtn, active ? styles.openBtnActive : null]} onPress={handleOpen}>
          <Text style={[styles.openText, active ? styles.openTextActive : null]}>Open</Text>
        </Pressable>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
  },
  cardActive: {
    borderColor: '#6ee7b7',
    backgroundColor: '#ecfdf5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#f3f4f6',
  },
  badgeActive: {
    borderColor: '#6ee7b7',
    backgroundColor: '#d1fae5',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4b5563',
  },
  badgeTextActive: {
    color: '#047857',
  },
  cardSubtitle: {
    marginTop: 6,
    color: '#4b5563',
    fontSize: 13,
  },
  cardMeta: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 12,
  },
  openBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },
  openBtnActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  openText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 12,
  },
  openTextActive: {
    color: '#047857',
  },
});
