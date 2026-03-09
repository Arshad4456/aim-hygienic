import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

export default function MessagesScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const data = await apiClient.get('/messages');
      setRows(data?.data?.messages || []);
    } catch (e) {
      setErr(e.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const safeLoad = async () => {
      if (!mounted) return;
      await load();
    };

    safeLoad();
    const timer = setInterval(safeLoad, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const markAsRead = async (id) => {
    try {
      await apiClient.patch(`/messages/${id}/read`);
      setRows((prev) => prev.map((row) => (row._id === id ? { ...row, isRead: true } : row)));
    } catch (e) {
      setErr(e.message || 'Failed to mark message as read');
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>System alerts and user notifications.</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={load}><Text style={styles.refreshText}>Refresh</Text></Pressable>
        </View>

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <ScrollView horizontal style={{ marginTop: 10 }}>
          <View style={styles.table}>
            <Row head cols={['Title', 'Message', 'Sender', 'Priority', 'Date', 'Status', 'Action']} />
            {!rows.length ? <Text style={styles.empty}>No messages yet</Text> : rows.map((row) => (
              <Row
                key={row._id}
                cols={[
                  row.title || '-',
                  row.body || '-',
                  row.senderName || '-',
                  (row.priority || 'normal').toUpperCase(),
                  row.createdAt ? new Date(row.createdAt).toLocaleString() : '-',
                  row.isRead ? 'Read' : 'Unread',
                  row.isRead ? '—' : 'Mark read',
                ]}
                unread={!row.isRead}
                onAction={!row.isRead ? () => markAsRead(row._id) : undefined}
              />
            ))}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function Row({ cols, head, unread, onAction }) {
  return (
    <View style={[styles.row, head ? styles.head : null, unread ? styles.unread : null]}>
      {cols.map((c, i) => {
        const isAction = i === cols.length - 1 && onAction;
        if (!isAction) {
          return <Text key={i} style={styles.cell}>{String(c)}</Text>;
        }
        return (
          <Pressable key={i} onPress={onAction} style={styles.actionBtn}>
            <Text style={styles.actionText}>{String(c)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  refreshText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  actionBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, alignSelf: 'center', margin: 4 },
  actionText: { fontSize: 11, color: '#111827' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  err: { marginTop: 8, color: '#b91c1c' },
  table: { minWidth: 1100, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  unread: { backgroundColor: '#fffbeb' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 160, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  empty: { color: '#6b7280', padding: 10 },
});