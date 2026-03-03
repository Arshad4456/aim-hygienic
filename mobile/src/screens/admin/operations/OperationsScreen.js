import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
}

export default function OperationsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operations, setOperations] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiClient.get('/dashboard/operations');
        if (mounted) setOperations(res.data || null);
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load operations');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const pipeline = useMemo(() => operations?.pipeline || [], [operations]);
  const alerts = useMemo(() => operations?.alerts || [], [operations]);
  const focusItems = useMemo(() => operations?.focusItems || [], [operations]);
  const regions = useMemo(() => operations?.regionalCompletion || [], [operations]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Operations Command Center</Text>
        <Text style={styles.subtitle}>Live operational health and dispatch execution.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Pipeline</Text>
        <View style={styles.pipelineWrap}>
          {pipeline.length
            ? pipeline.map((item) => (
                <View key={item.label} style={styles.pipelineCard}>
                  <Text style={styles.pipelineLabel}>{item.label}</Text>
                  <Text style={styles.pipelineValue}>{formatNumber(item.value)}</Text>
                </View>
              ))
            : <Text style={styles.help}>No pipeline data available.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Critical Alerts</Text>
        <View style={styles.stack}>
          {alerts.length
            ? alerts.map((alert, index) => (
                <View key={`${alert.title}-${index}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{alert.title || 'Alert'}</Text>
                  <Text style={styles.itemSub}>{alert.detail || 'No detail'}</Text>
                </View>
              ))
            : <Text style={styles.help}>No critical alerts right now.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Regional Completion</Text>
        <View style={styles.stack}>
          {regions.length
            ? regions.map((row, index) => (
                <View key={`${row.region}-${index}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{row.region} Region</Text>
                  <Text style={styles.itemSub}>{formatPercent(row.value)} • {formatNumber(row.orders)} orders</Text>
                </View>
              ))
            : <Text style={styles.help}>No regional completion data available.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Today’s Focus</Text>
        <View style={styles.stack}>
          {focusItems.length
            ? focusItems.map((item, index) => (
                <View key={`${item.title}-${index}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSub}>{item.owner} • {item.time}</Text>
                </View>
              ))
            : <Text style={styles.help}>No focus items available.</Text>}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  error: { marginTop: 8, color: '#b91c1c' },
  help: { color: '#6b7280', fontSize: 13 },
  pipelineWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pipelineCard: { width: '48%', borderRadius: 10, borderWidth: 1, borderColor: '#e4e4e7', backgroundColor: '#fafafa', padding: 10 },
  pipelineLabel: { fontSize: 12, color: '#52525b' },
  pipelineValue: { marginTop: 4, fontSize: 17, fontWeight: '700', color: '#111827' },
  stack: { gap: 8 },
  itemCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  itemSub: { marginTop: 4, color: '#52525b', fontSize: 12 },
});
