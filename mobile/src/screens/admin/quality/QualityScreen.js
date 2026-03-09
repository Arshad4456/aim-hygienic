import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../../../ui/Card';

const cards = [
  { title: 'Raw Material QC', description: 'Inspect incoming raw materials before receiving.', route: 'admin:quality/raw-material' },
  { title: 'Production QC', description: 'Monitor quality checks during production stages.', route: 'admin:quality/production' },
  { title: 'Finished Goods QC', description: 'Validate finished goods before warehousing.', route: 'admin:quality/finished-goods' },
  { title: 'Final Release QC', description: 'Authorize final release for dispatch and sales.', route: 'admin:quality/final-release' },
];

export default function QualityScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Quality & Compliance</Text>
        <Text style={styles.subtitle}>QC checkpoints to ensure material and product compliance.</Text>
        <View style={styles.grid}>
          {cards.map((card) => (
            <Pressable key={card.title} style={styles.linkCard} onPress={() => navigation?.navigate?.(card.route)}>
              <Text style={styles.linkTitle}>{card.title}</Text>
              <Text style={styles.linkDesc}>{card.description}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  grid: { marginTop: 12, gap: 8 },
  linkCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fafafa', padding: 12 },
  linkTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  linkDesc: { marginTop: 4, color: '#6b7280', fontSize: 12 },
});