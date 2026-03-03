import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../api/client';
import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';
import Loader from '../../ui/Loader';

function renderValue(value) {
  if (value == null) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.accounts)) return data.accounts;
  return [];
}

function DataTable({ data }) {
  const rows = normalizeRows(data);
  if (!rows.length) {
    return <Text style={styles.json}>{JSON.stringify(data, null, 2)}</Text>;
  }

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {})))).slice(0, 6);

  return (
    <View>
      <View style={styles.tableHeaderRow}>
        {headers.map((header) => (
          <Text key={header} style={styles.tableHeaderCell}>{header}</Text>
        ))}
      </View>
      {rows.slice(0, 10).map((row, index) => (
        <View key={`${index}-${headers[0] || 'row'}`} style={styles.tableRow}>
          {headers.map((header) => (
            <Text key={`${index}-${header}`} numberOfLines={1} style={styles.tableCell}>{renderValue(row?.[header])}</Text>
          ))}
        </View>
      ))}
      {rows.length > 10 ? <Text style={styles.hint}>Showing first 10 records.</Text> : null}
    </View>
  );
}

export default function ModulePlaceholderScreen({ config }) {
  const [loading, setLoading] = useState(true);
  const [payloads, setPayloads] = useState([]);
  const [error, setError] = useState('');

  const endpoints = useMemo(() => config?.endpoints || [], [config]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const results = [];
        for (const endpoint of endpoints) {
          if (endpoint.method === 'GET' && !endpoint.path.includes('${')) {
            try {
              const response = await apiClient.get(endpoint.path);
              results.push({ endpoint, data: response.data });
            } catch (callError) {
              results.push({ endpoint, error: callError.message });
            }
          } else {
            results.push({ endpoint, skipped: true });
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
  }, [endpoints]);

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
        <EmptyState title="Module wired" description="No endpoints configured for this module yet." />
      ) : (
        payloads.map((item) => (
          <Card key={`${item.endpoint.method}-${item.endpoint.path}`}>
            <Text style={styles.endpoint}>{item.endpoint.method} {item.endpoint.path}</Text>
            {item.skipped ? <Text style={styles.hint}>Endpoint requires input/form and is ready for module workflow.</Text> : null}
            {item.error ? <Text style={styles.error}>{item.error}</Text> : null}
            {!item.error && !item.skipped ? <DataTable data={item.data} /> : null}
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
  hint: { color: '#52525b', fontSize: 12, marginBottom: 8 },
  endpoint: { fontWeight: '700', marginBottom: 8, color: '#0f172a' },
  json: { color: '#334155', fontSize: 12 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f4f4f5', borderRadius: 8, paddingVertical: 8, marginBottom: 6 },
  tableHeaderCell: { flex: 1, paddingHorizontal: 6, fontSize: 11, fontWeight: '700', color: '#18181b' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e4e4e7', paddingVertical: 8 },
  tableCell: { flex: 1, paddingHorizontal: 6, fontSize: 11, color: '#3f3f46' },
});
