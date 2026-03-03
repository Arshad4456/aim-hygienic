import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../api/client';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
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
  if (Array.isArray(data?.ledger)) return data.ledger;
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
      {rows.length > 10 ? <Text style={styles.hint}>Showing first 10 rows for mobile preview.</Text> : null}
    </View>
  );
}

function EndpointForm({ endpoint }) {
  const [payload, setPayload] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);

  const submit = async () => {
    setError('');
    setResponse(null);
    let parsed = {};
    try {
      parsed = payload?.trim() ? JSON.parse(payload) : {};
    } catch (e) {
      setError('Payload must be valid JSON.');
      return;
    }

    try {
      setLoading(true);
      const method = (endpoint.method || 'POST').toLowerCase();
      const res = await apiClient.request({ method, url: endpoint.path, data: parsed });
      setResponse(res.data);
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Text style={styles.endpoint}>{endpoint.method} {endpoint.path}</Text>
      {endpoint.path.includes('${') ? <Text style={styles.hint}>This endpoint has URL parameters. Replace placeholders in backend mapping first.</Text> : null}
      <Input
        label="Form JSON payload"
        multiline
        numberOfLines={5}
        value={payload}
        onChangeText={setPayload}
        inputStyle={styles.textArea}
      />
      <Button title="Submit" onPress={submit} loading={loading} disabled={endpoint.path.includes('${')} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {response ? (
        <View style={styles.responseWrap}>
          <Text style={styles.responseTitle}>Response</Text>
          <Text style={styles.json}>{JSON.stringify(response, null, 2)}</Text>
        </View>
      ) : null}
    </Card>
  );
}

export default function ModulePlaceholderScreen({ config }) {
  const [loading, setLoading] = useState(true);
  const [payloads, setPayloads] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tables');

  const endpoints = useMemo(() => config?.endpoints || [], [config]);
  const getEndpoints = useMemo(() => endpoints.filter((ep) => ep.method === 'GET'), [endpoints]);
  const formEndpoints = useMemo(() => endpoints.filter((ep) => ep.method !== 'GET'), [endpoints]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const results = [];
        for (const endpoint of getEndpoints) {
          if (endpoint.path.includes('${')) {
            results.push({ endpoint, skipped: true });
            continue;
          }
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
  }, [getEndpoints]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{config?.title || 'Module'}</Text>
        <Text style={styles.meta}>Web route: {config?.route}</Text>
        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, activeTab === 'tables' ? styles.tabActive : null]} onPress={() => setActiveTab('tables')}>
            <Text style={[styles.tabText, activeTab === 'tables' ? styles.tabTextActive : null]}>Tables / Ledgers</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'forms' ? styles.tabActive : null]} onPress={() => setActiveTab('forms')}>
            <Text style={[styles.tabText, activeTab === 'forms' ? styles.tabTextActive : null]}>Forms / Actions</Text>
          </Pressable>
        </View>
      </Card>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      {activeTab === 'tables' ? (
        (payloads || []).length === 0 ? (
          <EmptyState title="No table data" description="No GET endpoints configured for this module." />
        ) : (
          payloads.map((item) => (
            <Card key={`${item.endpoint.method}-${item.endpoint.path}`}>
              <Text style={styles.endpoint}>{item.endpoint.method} {item.endpoint.path}</Text>
              {item.skipped ? <Text style={styles.hint}>Endpoint has URL placeholders and needs selected record/context.</Text> : null}
              {item.error ? <Text style={styles.error}>{item.error}</Text> : null}
              {!item.error && !item.skipped ? <DataTable data={item.data} /> : null}
            </Card>
          ))
        )
      ) : (
        formEndpoints.length === 0 ? (
          <EmptyState title="No forms/actions" description="No non-GET endpoints configured for this module." />
        ) : (
          formEndpoints.map((endpoint) => <EndpointForm key={`${endpoint.method}-${endpoint.path}`} endpoint={endpoint} />)
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#18181b' },
  meta: { marginTop: 6, marginBottom: 10, color: '#52525b' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  tabText: { color: '#3f3f46', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#047857' },
  endpoint: { fontWeight: '700', marginBottom: 8, color: '#0f172a' },
  hint: { color: '#52525b', fontSize: 12, marginBottom: 8 },
  error: { color: '#b91c1c', marginTop: 8 },
  textArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 10 },
  responseWrap: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e4e4e7', paddingTop: 10 },
  responseTitle: { fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  json: { color: '#334155', fontSize: 12 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f4f4f5', borderRadius: 8, paddingVertical: 8, marginBottom: 6 },
  tableHeaderCell: { flex: 1, paddingHorizontal: 6, fontSize: 11, fontWeight: '700', color: '#18181b' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e4e4e7', paddingVertical: 8 },
  tableCell: { flex: 1, paddingHorizontal: 6, fontSize: 11, color: '#3f3f46' },
});
