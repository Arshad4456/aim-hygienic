import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function EmptyState({ title = 'Coming soon', description = 'This module skeleton is ready for backend integration.' }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 40, alignItems: 'center', gap: 6 },
  title: { fontSize: 18, fontWeight: '700', color: '#18181b' },
  description: { fontSize: 13, color: '#52525b', textAlign: 'center' },
});