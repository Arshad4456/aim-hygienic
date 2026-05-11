import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';
import Loader from '../../../../../../foundation/ui/Loader';

export default function WarehousesScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      setErr('');
      setLoading(true);
      try {
        const { data } = await apiClient.get('/warehouses');
        setRows(data?.warehouses || []);
      } catch (e) {
        setErr(e.message || 'Failed to load warehouses');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Warehouse Master</Text>
        <Text style={styles.subtitle}>Master data for warehouses and capacity.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}
      </Card>
      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Warehouse ID', 'Name', 'City', 'Region', 'Manager', 'Capacity', 'Status'].map((h) => <Text key={h} style={styles.headCell}>{h}</Text>)}
            </View>
            <View style={{ marginTop: 8, gap: 8 }}>
              {rows.length === 0 ? <Text style={styles.help}>No warehouses found.</Text> : rows.map((r) => (
                <View key={r._id} style={styles.dataRow}>
                  <Text style={styles.cell}>{r.warehouseId || '-'}</Text>
                  <Text style={styles.cell}>{r.name || '-'}</Text>
                  <Text style={styles.cell}>{r.city || '-'}</Text>
                  <Text style={styles.cell}>{r.region || '-'}</Text>
                  <Text style={styles.cell}>{r.managerName || '-'}</Text>
                  <Text style={styles.cell}>{r.capacity || '-'}</Text>
                  <Text style={styles.cell}>{r.status || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  tableWrap: { minWidth: 980 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 },
  headCell: { width: 140, fontSize: 12, fontWeight: '700', color: '#111827' },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8 },
  cell: { width: 140, fontSize: 12, color: '#374151' },
  help: { color: '#6b7280' },
});