import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../api/client';
import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';

export default function ModulePlaceholderScreen({ route }) {
  const { moduleName } = route.params || { moduleName: 'Module' };
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/dashboard/summary');
        setSummary(res.data);
      } catch {
        setSummary(null);
      }
    })();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{moduleName}</Text>
        <Text style={styles.meta}>Connected to live backend API.</Text>
      </Card>
      {summary ? (
        <Card>
          <Text style={styles.subtitle}>Dashboard Summary</Text>
          <Text style={styles.json}>{JSON.stringify(summary, null, 2)}</Text>
        </Card>
      ) : (
        <EmptyState title="Module Ready" description="No summary payload found for this role/module yet." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 19, fontWeight: '700', color: '#18181b' },
  subtitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, color: '#18181b' },
  meta: { fontSize: 13, color: '#52525b', marginTop: 4 },
  json: { color: '#334155', fontFamily: 'monospace', fontSize: 12 },
});
