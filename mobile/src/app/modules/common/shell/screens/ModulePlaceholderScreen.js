import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../infrastructure/api/client';
import Card from '../../../../foundation/ui/Card';
import EmptyState from '../../../../foundation/ui/EmptyState';
import Loader from '../../../../foundation/ui/Loader';

function getCollection(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.accounts)) return data.accounts;
  if (Array.isArray(data?.ledger)) return data.ledger;
  return [];
}

function toCell(value) {
  if (value == null) return '-';
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return '…';
  return String(value);
}

function isPrimitive(value) {
  return ['number', 'string', 'boolean'].includes(typeof value);
}

function extractMetrics(payload) {
  if (!payload || typeof payload !== 'object') return [];

  const direct = Object.entries(payload)
    .filter(([, value]) => isPrimitive(value))
    .map(([key, value]) => ({ key, value: String(value) }));

  const nested = Object.entries(payload)
    .filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value))
    .flatMap(([parentKey, value]) =>
      Object.entries(value)
        .filter(([, nestedValue]) => isPrimitive(nestedValue))
        .map(([key, nestedValue]) => ({ key: `${parentKey}.${key}`, value: String(nestedValue) }))
    );

  return [...direct, ...nested].slice(0, 12);
}

function collectArrays(payload, parent = '') {
  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload)) {
    return payload.length ? [{ label: parent || 'items', data: payload }] : [];
  }

  return Object.entries(payload).flatMap(([key, value]) => {
    const path = parent ? `${parent}.${key}` : key;
    if (Array.isArray(value)) {
      return value.length ? [{ label: path, data: value }] : [];
    }
    if (value && typeof value === 'object') {
      return collectArrays(value, path);
    }
    return [];
  });
}

function getPathTemplates(path = '') {
  const matches = [...String(path).matchAll(/\$\{([^}]+)\}/g)].map((match) => match[1]);
  return matches.map((expr) => ({
    expr,
    key: expr.split('.').pop() || expr,
  }));
}

function resolvePath(path, params) {
  return String(path).replace(/\$\{([^}]+)\}/g, (_, expr) => encodeURIComponent(params[expr] || ''));
}

function MetricGrid({ payload }) {
  const metrics = extractMetrics(payload);
  if (!metrics.length) return null;

  return (
    <View style={styles.metricGrid}>
      {metrics.map((item) => (
        <View key={item.key} style={styles.metricCard}>
          <Text style={styles.metricLabel}>{item.key}</Text>
          <Text numberOfLines={1} style={styles.metricValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function DataGrid({ data }) {
  const rows = getCollection(data).map((row, index) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) return row;
    return { value: row, index: index + 1 };
  });

  if (!rows.length) return <Text style={styles.help}>No list rows available for this section.</Text>;

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {})))).slice(0, 5);

  return (
    <View>
      <View style={styles.gridHeader}>
        {headers.map((header) => (
          <Text key={header} style={styles.gridHeaderCell}>{header}</Text>
        ))}
      </View>
      {rows.slice(0, 10).map((row, index) => (
        <View key={`${index}-${headers[0] || 'row'}`} style={styles.gridRow}>
          {headers.map((header) => (
            <Text key={`${index}-${header}`} numberOfLines={1} style={styles.gridCell}>{toCell(row?.[header])}</Text>
          ))}
        </View>
      ))}
      {rows.length > 10 ? <Text style={styles.help}>Showing first 10 rows for mobile view.</Text> : null}
    </View>
  );
}

function EndpointAction({ endpoint, index, onRun, result, loading }) {
  const templates = useMemo(() => getPathTemplates(endpoint.path), [endpoint.path]);
  const [params, setParams] = useState(() => Object.fromEntries(templates.map((t) => [t.expr, ''])));
  const [body, setBody] = useState('{}');

  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionTitle}>{endpoint.method} {endpoint.path}</Text>

      {templates.map((template) => (
        <TextInput
          key={`${index}-${template.expr}`}
          placeholder={template.key}
          value={params[template.expr] || ''}
          onChangeText={(value) => setParams((prev) => ({ ...prev, [template.expr]: value }))}
          style={styles.input}
          placeholderTextColor="#71717a"
        />
      ))}

      {['POST', 'PUT', 'PATCH'].includes(endpoint.method) ? (
        <TextInput
          multiline
          value={body}
          onChangeText={setBody}
          style={[styles.input, styles.jsonInput]}
          autoCapitalize="none"
          placeholder='JSON body, e.g. {"name":"value"}'
          placeholderTextColor="#71717a"
        />
      ) : null}

      <Pressable
        disabled={loading}
        style={[styles.runButton, loading ? styles.runButtonDisabled : null]}
        onPress={() => onRun({ endpoint, params, body, index })}
      >
        <Text style={styles.runButtonText}>{loading ? 'Running...' : 'Run Action'}</Text>
      </Pressable>

      {result?.error ? <Text style={styles.error}>{result.error}</Text> : null}
      {result?.data ? (
        <View style={styles.actionResult}>
          <MetricGrid payload={result.data} />
          <DataGrid data={result.data} />
        </View>
      ) : null}
    </View>
  );
}

export default function ModulePlaceholderScreen({ config }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sections, setSections] = useState([]);
  const [runningKey, setRunningKey] = useState('');
  const [actionResults, setActionResults] = useState({});

  const endpoints = useMemo(() => config?.endpoints || [], [config]);
  const getEndpoints = useMemo(() => endpoints.filter((e) => e.method === 'GET' && !e.path.includes('${')), [endpoints]);
  const actionEndpoints = useMemo(() => endpoints.filter((e) => e.method !== 'GET' || e.path.includes('${')), [endpoints]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const result = [];

        for (const endpoint of getEndpoints) {
          try {
            const response = await apiClient.get(endpoint.path);
            const payload = response.data;
            const arraySections = collectArrays(payload);

            result.push({
              endpoint: endpoint.path,
              data: payload,
              arrays: arraySections,
            });
          } catch (e) {
            result.push({ endpoint: endpoint.path, error: e.message || 'Unable to load section' });
          }
        }

        if (mounted) setSections(result);
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

  const runAction = async ({ endpoint, params, body, index }) => {
    const key = `${endpoint.method}:${index}`;
    setRunningKey(key);

    try {
      const resolved = resolvePath(endpoint.path, params);
      const payload = ['POST', 'PUT', 'PATCH'].includes(endpoint.method)
        ? (body.trim() ? JSON.parse(body) : {})
        : undefined;

      const response = await apiClient.request({
        method: endpoint.method,
        url: resolved,
        data: payload,
      });

      setActionResults((prev) => ({ ...prev, [key]: { data: response.data } }));

      if (endpoint.method !== 'GET') {
        setLoading(true);
        setError('');
        try {
          const refreshed = await Promise.all(
            getEndpoints.map(async (item) => {
              try {
                const res = await apiClient.get(item.path);
                return { endpoint: item.path, data: res.data, arrays: collectArrays(res.data) };
              } catch (e) {
                return { endpoint: item.path, error: e.message || 'Unable to load section' };
              }
            })
          );
          setSections(refreshed);
        } finally {
          setLoading(false);
        }
      }
    } catch (e) {
      setActionResults((prev) => ({ ...prev, [key]: { error: e.message || 'Request failed' } }));
    } finally {
      setRunningKey('');
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{config?.title || 'Module'}</Text>
        <Text style={styles.subtitle}>Mobile dashboard using the same backend/API data source as web.</Text>
      </Card>

      {error ? <Card><Text style={styles.error}>{error}</Text></Card> : null}

      {sections.length === 0 ? (
        <EmptyState title="No data yet" description="This module has no static list endpoint configured." />
      ) : (
        sections.map((section, index) => (
          <Card key={index}>
            <Text style={styles.sectionTitle}>Section {index + 1}</Text>
            <Text style={styles.endpoint}>{section.endpoint}</Text>
            {section.error ? <Text style={styles.error}>{section.error}</Text> : null}
            {!section.error ? <MetricGrid payload={section.data} /> : null}

            {!section.error && section.arrays?.length
              ? section.arrays.slice(0, 3).map((part) => (
                  <View key={part.label} style={styles.arrayBlock}>
                    <Text style={styles.arrayTitle}>{part.label}</Text>
                    <DataGrid data={part.data} />
                  </View>
                ))
              : null}

            {!section.error && !section.arrays?.length ? <DataGrid data={section.data} /> : null}
          </Card>
        ))
      )}

      {actionEndpoints.length ? (
        <Card>
          <Text style={styles.sectionTitle}>Actions / CRUD</Text>
          <Text style={styles.subtitle}>Run create/update/delete or parameterized fetch requests for this module.</Text>
          <View style={styles.actionsWrap}>
            {actionEndpoints.map((endpoint, index) => {
              const key = `${endpoint.method}:${index}`;
              return (
                <EndpointAction
                  key={key}
                  endpoint={endpoint}
                  index={index}
                  loading={runningKey === key}
                  result={actionResults[key]}
                  onRun={runAction}
                />
              );
            })}
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 8, color: '#6b7280', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2 },
  endpoint: { color: '#6b7280', fontSize: 12, marginBottom: 8 },
  error: { color: '#b91c1c', marginTop: 6 },
  help: { color: '#6b7280', fontSize: 12, marginTop: 6 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metricCard: { width: '48%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontSize: 16, fontWeight: '700', color: '#111827' },
  arrayBlock: { marginTop: 6 },
  arrayTitle: { fontSize: 12, color: '#374151', fontWeight: '700', marginBottom: 4 },
  gridHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 8, marginBottom: 6 },
  gridHeaderCell: { flex: 1, fontWeight: '700', color: '#111827', fontSize: 12, paddingHorizontal: 6 },
  gridRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 8 },
  gridCell: { flex: 1, color: '#374151', fontSize: 12, paddingHorizontal: 6 },
  actionsWrap: { marginTop: 8, gap: 10 },
  actionCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  actionTitle: { color: '#111827', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    color: '#18181b',
    fontSize: 13,
  },
  jsonInput: { minHeight: 90, textAlignVertical: 'top' },
  runButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  runButtonDisabled: { opacity: 0.6 },
  runButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  actionResult: { marginTop: 8 },
});