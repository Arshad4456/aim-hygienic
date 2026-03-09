import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

export default function MessagesScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!mounted) return;
      setLoading(true);
      setErr('');
      try {
        const data = await apiClient.get('/messages');
        if (!mounted) return;
        setRows(data?.data?.messages || []);
      } catch (error) {
        if (!mounted) return;
        setErr(error.message || 'Failed to load messages');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Distributor Messages</Text>
        <Text style={styles.subtitle}>Role-specific alerts and notifications.</Text>

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <ScrollView horizontal style={{ marginTop: 10 }}>
          <View style={styles.table}>
            <Row head cols={['Title', 'Message', 'Sender', 'Role', 'Date']} />
            {!rows.length ? (
              <Text style={styles.empty}>No messages yet</Text>
            ) : (
              rows.map((row) => (
                <Row
                  key={row._id}
                  cols={[
                    row.title || '-',
                    row.body || '-',
                    row.senderName || '-',
                    row.senderRole || row.recipientRole || '-',
                    row.createdAt ? new Date(row.createdAt).toLocaleString() : '-',
                  ]}
                />
              ))
            )}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function Row({ cols, head }) {
  return (
    <View style={[styles.row, head ? styles.head : null]}>
      {cols.map((c, i) => (
        <Text key={`${i}-${c}`} style={styles.cell}>{String(c)}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  err: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
  table: { minWidth: 900, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 180, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  empty: { color: '#6b7280', padding: 10, fontSize: 12 },
});