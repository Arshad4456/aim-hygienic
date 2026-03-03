import React, { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import DashboardShell from '../../shared/dashboard/DashboardShell';
import Loading from '../../shared/components/Loading';
import EmptyState from '../../shared/components/EmptyState';
import { callEndpoint } from '../../api/endpoints';
import Card from '../../shared/ui/Card';

function extractRows(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const val = Object.values(data).find((v) => Array.isArray(v));
  return val || [];
}

export default function GenericModuleScreen({ route }) {
  const meta = route?.params?.meta || {};
  const [loading, setLoading] = useState(Boolean(meta.primaryEndpoint));
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      if (!meta.primaryEndpoint) return;
      setLoading(true);
      setError('');
      try {
        const data = await callEndpoint(meta.primaryEndpoint, { method: meta.primaryMethod || 'GET' });
        setRows(extractRows(data));
      } catch (e) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [meta.primaryEndpoint, meta.primaryMethod]);

  return (
    <DashboardShell title={meta.title || 'Module'}>
      <Text style={{ color: '#64748b', marginBottom: 10 }}>{meta.slug}</Text>
      {meta.endpoints?.length ? <Text style={{ marginBottom: 10 }}>Endpoints: {meta.endpoints.join(', ')}</Text> : null}
      {loading ? <Loading /> : error ? <Text style={{ color: 'red' }}>{error}</Text> : rows.length === 0 ? <EmptyState text="No records." /> : (
        <FlatList data={rows} keyExtractor={(item, idx) => String(item?._id || idx)} renderItem={({ item }) => <Card style={{ marginBottom: 8 }}><Text numberOfLines={2}>{JSON.stringify(item)}</Text></Card>} />
      )}
    </DashboardShell>
  );
}
