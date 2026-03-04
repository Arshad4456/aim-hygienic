import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

export default function UsersScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const res = await apiClient.get('/users');
      setRows(res.data?.users || []);
    } catch (e) {
      setErr(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const roles = useMemo(() => Array.from(new Set(rows.map((u) => u.role).filter(Boolean))), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((u) => {
      const q = query.trim().toLowerCase();
      const matchQ = !q || [u.fullName, u.userId, u.mobileNumber, u.email].some((v) => String(v || '').toLowerCase().includes(q));
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchQ && matchRole;
    });
  }, [rows, query, roleFilter]);

  const onDelete = (id) => {
    Alert.alert('Delete User', 'Are you sure you want to delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/users/${id}`);
            await load();
          } catch (e) {
            setErr(e.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>User List</Text>
            <Text style={styles.subtitle}>Maintain roles, regions, zones, and territories.</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => navigation?.navigate?.('admin:users/add')}>
            <Text style={styles.addBtnText}>Add User</Text>
          </Pressable>
        </View>

        <View style={styles.filters}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, user id, mobile, email"
            placeholderTextColor="#71717a"
            style={styles.input}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <Pressable style={[styles.roleChip, !roleFilter ? styles.roleChipActive : null]} onPress={() => setRoleFilter('')}>
              <Text style={[styles.roleChipText, !roleFilter ? styles.roleChipTextActive : null]}>All Roles</Text>
            </Pressable>
            {roles.map((role) => (
              <Pressable key={role} style={[styles.roleChip, roleFilter === role ? styles.roleChipActive : null]} onPress={() => setRoleFilter(role)}>
                <Text style={[styles.roleChipText, roleFilter === role ? styles.roleChipTextActive : null]}>{role}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {err ? <Text style={styles.error}>{err}</Text> : null}
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headCell, styles.colId]}>User ID</Text>
              <Text style={[styles.headCell, styles.colName]}>Name</Text>
              <Text style={[styles.headCell, styles.colRole]}>Role</Text>
              <Text style={[styles.headCell, styles.colMobile]}>Mobile</Text>
              <Text style={[styles.headCell, styles.colEmail]}>Email</Text>
              <Text style={[styles.headCell, styles.colAction]}>Actions</Text>
            </View>

            <View style={styles.stack}>
              {filtered.length === 0 ? (
                <Text style={styles.help}>No users found.</Text>
              ) : (
                filtered.map((u) => (
                  <View key={u._id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.colId]}>{u.userId || '-'}</Text>
                    <Text style={[styles.cell, styles.colName]}>{u.fullName || '-'}</Text>
                    <Text style={[styles.cell, styles.colRole]}>{u.role || '-'}</Text>
                    <Text style={[styles.cell, styles.colMobile]}>{u.mobileNumber || '-'}</Text>
                    <Text style={[styles.cell, styles.colEmail]}>{u.email || '-'}</Text>
                    <Pressable style={styles.deleteBtn} onPress={() => onDelete(u._id)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                ))
              )}
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
  subtitle: { marginTop: 6, color: '#6b7280', fontSize: 13 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { backgroundColor: '#059669', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  filters: { marginTop: 10, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 13,
  },
  roleChip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  roleChipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  roleChipText: { color: '#52525b', fontSize: 12 },
  roleChipTextActive: { color: '#047857', fontWeight: '700' },
  error: { marginTop: 8, color: '#b91c1c' },
  tableWrap: { minWidth: 920 },
  tableHeader: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headCell: { fontSize: 12, color: '#111827', fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  stack: { gap: 8, marginTop: 8 },
  cell: { fontSize: 12, color: '#374151' },
  colId: { width: 120 },
  colName: { width: 170 },
  colRole: { width: 140 },
  colMobile: { width: 130 },
  colEmail: { width: 230 },
  colAction: { width: 100, textAlign: 'center' },
  deleteBtn: { width: 90, borderRadius: 8, backgroundColor: '#fee2e2', paddingVertical: 7, alignItems: 'center' },
  deleteBtnText: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
  help: { color: '#6b7280', fontSize: 13 },
});
