import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import apiClient from '../../api/client';
import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';
import Loader from '../../ui/Loader';

export default function ModulePlaceholderScreen({ config }) {
  const [loading, setLoading] = useState(true);
  const [payloads, setPayloads] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const calls = config?.endpoints || [];
        const results = [];
        for (const endpoint of calls) {
          if (endpoint.method !== 'GET') continue;
          try {
            const response = await apiClient.get(endpoint.path);
            results.push({ endpoint, data: response.data });
          } catch (callError) {
            results.push({ endpoint, error: callError.message });
          }
        }
        if (mounted) setPayloads(results);
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load module');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [config]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{config?.title || 'Module'}</Text>
        <Text style={styles.meta}>Web route: {config?.route}</Text>
      </Card>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      {(payloads || []).length === 0 ? (
        <EmptyState title="Module wired" description="No GET endpoint found in this web module yet." />
      ) : (
        payloads.map((item) => (
          <Card key={`${item.endpoint.method}-${item.endpoint.path}`}>
            <Text style={styles.endpoint}>{item.endpoint.method} {item.endpoint.path}</Text>
            <Text style={styles.json}>{JSON.stringify(item.error ? { error: item.error } : item.data, null, 2)}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#18181b' },
  meta: { marginTop: 6, color: '#52525b' },
  error: { color: '#b91c1c' },
  endpoint: { fontWeight: '700', marginBottom: 8, color: '#0f172a' },
  json: { color: '#334155', fontSize: 12 },
});
