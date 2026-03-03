import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../api/client';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';
import Loader from '../../ui/Loader';

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

function toString(value) {
  if (value == null) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function ModuleHeader({ title, route, rowsCount, endpointCount }) {
  return (
    <Card>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.route}>{route}</Text>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Rows</Text><Text style={styles.kpiValue}>{rowsCount}</Text></View>
        <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Endpoints</Text><Text style={styles.kpiValue}>{endpointCount}</Text></View>
      </View>
    </Card>
  );
}

function DataGrid({ data }) {
  const rows = normalizeRows(data);
  if (!rows.length) return <Text style={styles.json}>{JSON.stringify(data, null, 2)}</Text>;

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {})))).slice(0, 5);

  return (
    <View>
      <View style={styles.gridHeader}>
        {headers.map((header) => <Text key={header} style={styles.gridHeaderCell}>{header}</Text>)}
      </View>
      {rows.slice(0, 12).map((row, idx) => (
        <View key={`${idx}-${headers[0] || 'row'}`} style={styles.gridRow}>
          {headers.map((header) => <Text key={`${idx}-${header}`} style={styles.gridCell} numberOfLines={1}>{toString(row?.[header])}</Text>)}
        </View>
      ))}
      {rows.length > 12 ? <Text style={styles.help}>Showing first 12 records on mobile.</Text> : null}
    </View>
  );
}

function FormAction({ endpoint }) {
  const [payload, setPayload] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const run = async () => {
    setError('');
    setResult(null);

    let parsedPayload = {};
    try {
      parsedPayload = payload.trim() ? JSON.parse(payload) : {};
    } catch {
      setError('Payload must be valid JSON.');
      return;
    }

    try {
      setLoading(true);
      const method = (endpoint.method || 'POST').toLowerCase();
      const response = await apiClient.request({ method, url: endpoint.path, data: parsedPayload });
      setResult(response.data);
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Text style={styles.endpoint}>{endpoint.method} {endpoint.path}</Text>
      {endpoint.path.includes('${') ? <Text style={styles.help}>Dynamic URL params required. Update mapping with selected ids/context.</Text> : null}
      <Input
        label="Form payload"
        value={payload}
        onChangeText={setPayload}
        multiline
        numberOfLines={5}
        inputStyle={styles.textArea}
      />
      <Button title="Submit Action" onPress={run} loading={loading} disabled={endpoint.path.includes('${')} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? <Text style={styles.json}>{JSON.stringify(result, null, 2)}</Text> : null}
    </Card>
  );
}

export default function ModulePlaceholderScreen({ config }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [records, setRecords] = useState([]);

  const endpoints = useMemo(() => config?.endpoints || [], [config]);
  const getEndpoints = useMemo(() => endpoints.filter((e) => e.method === 'GET'), [endpoints]);
  const actionEndpoints = useMemo(() => endpoints.filter((e) => e.method !== 'GET'), [endpoints]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const next = [];
      try {
        for (const endpoint of getEndpoints) {
          if (endpoint.path.includes('${')) {
            next.push({ endpoint, skipped: true });
            continue;
          }

          try {
            const response = await apiClient.get(endpoint.path);
            next.push({ endpoint, data: response.data });
          } catch (e) {
            next.push({ endpoint, error: e.message });
          }
        }

        if (mounted) setRecords(next);
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [getEndpoints]);

  if (loading) return <Loader />;

  const totalRows = records.reduce((sum, item) => sum + normalizeRows(item.data).length, 0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ModuleHeader
        title={config?.title || 'Module'}
        route={config?.route || '/'}
        rowsCount={totalRows}
        endpointCount={endpoints.length}
      />

      {error ? <Card><Text style={styles.error}>{error}</Text></Card> : null}

      <Card>
        <Text style={styles.sectionTitle}>Tables / Ledgers</Text>
      </Card>

      {records.length === 0 ? (
        <EmptyState title="No table data" description="No static GET endpoints configured for this module." />
      ) : (
        records.map((record) => (
          <Card key={`${record.endpoint.method}-${record.endpoint.path}`}>
            <Text style={styles.endpoint}>{record.endpoint.method} {record.endpoint.path}</Text>
            {record.skipped ? <Text style={styles.help}>Endpoint requires selected row context (id/url params).</Text> : null}
            {record.error ? <Text style={styles.error}>{record.error}</Text> : null}
            {!record.error && !record.skipped ? <DataGrid data={record.data} /> : null}
          </Card>
        ))
      )}

      <Card>
        <Text style={styles.sectionTitle}>Forms / Actions</Text>
      </Card>

      {actionEndpoints.length === 0 ? (
        <EmptyState title="No action endpoints" description="No non-GET endpoints configured for this module." />
      ) : (
        actionEndpoints.map((endpoint) => <FormAction key={`${endpoint.method}-${endpoint.path}`} endpoint={endpoint} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  route: { marginTop: 8, color: '#6b7280', fontSize: 13 },
  kpiRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  kpiCard: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  kpiLabel: { color: '#6b7280', fontSize: 12 },
  kpiValue: { color: '#111827', fontSize: 20, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  endpoint: { fontWeight: '700', color: '#111827', fontSize: 16, marginBottom: 8 },
  help: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  error: { color: '#b91c1c', marginTop: 6 },
  json: { marginTop: 8, color: '#1f2937', fontSize: 12 },
  textArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 10 },
  gridHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 8, marginBottom: 8 },
  gridHeaderCell: { flex: 1, fontWeight: '700', color: '#111827', fontSize: 12, paddingHorizontal: 6 },
  gridRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 8 },
  gridCell: { flex: 1, color: '#374151', fontSize: 12, paddingHorizontal: 6 },
});
