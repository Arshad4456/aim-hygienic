import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

const sections = [
  { key: 'all', label: 'All' },
  { key: 'personal', label: 'Personal' },
  { key: 'daily', label: 'Daily' },
  { key: 'distributor', label: 'Distributor' },
];

export default function ExpenseScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ section: 'all', status: 'all', paymentMethod: 'all' });

  useEffect(() => {
    apiClient.get('/expenses')
      .then((d) => setRows(d?.data?.expenses || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return rows.filter((r) => {
      const d = new Date(r.expenseDate || r.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [rows]);

  const filtered = useMemo(() => currentMonth.filter((r) => {
    if (filters.section !== 'all' && r.section !== filters.section) return false;
    if (filters.status !== 'all' && r.status !== filters.status) return false;
    if (filters.paymentMethod !== 'all' && r.paymentMethod !== filters.paymentMethod) return false;
    return true;
  }), [currentMonth, filters]);

  const total = filtered.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const cashTotal = filtered.filter((r) => r.paymentMethod === 'cash').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const onlineTotal = filtered.filter((r) => r.paymentMethod === 'online').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const pendingCount = filtered.filter((r) => r.status === 'pending').length;

  const categorySummary = Object.entries(filtered.reduce((acc, row) => {
    const key = row.category || 'Uncategorized';
    acc[key] = (acc[key] || 0) + Number(row.amount || 0);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  const topCategory = categorySummary[0]?.[0] || '-';
  const biggestExpense = filtered.slice().sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Expense Management · Module Overview</Text>
        <Text style={styles.subtitle}>Executive dashboard for personal, daily, and distributor expenses with approvals and account impact.</Text>

        <View style={styles.navRow}>
          <Pressable style={styles.navBtn} onPress={() => navigation?.navigate?.('admin:expense/personal')}><Text>AIM – Personal Expense</Text></Pressable>
          <Pressable style={styles.navBtn} onPress={() => navigation?.navigate?.('admin:expense/daily')}><Text>Daily Expense</Text></Pressable>
          <Pressable style={styles.navBtn} onPress={() => navigation?.navigate?.('admin:expense/distributor')}><Text>Distributor Expense</Text></Pressable>
        </View>

        <Selector title="Section" value={filters.section} items={sections.map((s) => [s.key, s.label])} onChange={(v) => setFilters((s) => ({ ...s, section: v }))} />
        <Selector title="Status" value={filters.status} items={[['all', 'All'], ['approved', 'Approved'], ['pending', 'Pending'], ['rejected', 'Rejected']]} onChange={(v) => setFilters((s) => ({ ...s, status: v }))} />
        <Selector title="Payment Method" value={filters.paymentMethod} items={[['all', 'All'], ['cash', 'Cash'], ['online', 'Online'], ['cheque', 'Cheque']]} onChange={(v) => setFilters((s) => ({ ...s, paymentMethod: v }))} />
      </Card>

      <Card>
        <Metric title="Total Expenses (MTD)" value={money(total)} />
        <Metric title="Cash Expenses (MTD)" value={money(cashTotal)} />
        <Metric title="Online Expenses (MTD)" value={money(onlineTotal)} />
        <Metric title="Pending Approvals" value={String(pendingCount)} />
        <Metric title="Top Category" value={topCategory} />
        <Metric title="Biggest Single Expense" value={biggestExpense ? `${money(biggestExpense.amount)} (${biggestExpense.category || 'N/A'})` : '-'} />
      </Card>

      <Card>
        <Text style={styles.h2}>Top Categories (Current Month)</Text>
        {categorySummary.slice(0, 10).map(([name, amount]) => (
          <View key={name} style={styles.barRow}>
            <Text style={styles.barLabel}>{name}</Text>
            <Text style={styles.barValue}>{money(amount)}</Text>
          </View>
        ))}
        {!categorySummary.length ? <Text style={styles.hint}>No categories available.</Text> : null}
      </Card>
    </ScrollView>
  );
}

function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function Metric({ title, value }) { return <View style={styles.metric}><Text style={styles.metricTitle}>{title}</Text><Text style={styles.metricValue}>{value}</Text></View>; }
function Selector({ title, value, items, onChange }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.label}>{title}</Text>
      <ScrollView horizontal contentContainerStyle={styles.rowWrap}>
        {items.map(([v, l]) => <Pressable key={v} style={[styles.chip, value === v ? styles.chipActive : null]} onPress={() => onChange(v)}><Text style={value === v ? styles.chipTx : null}>{l}</Text></Pressable>)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  navRow: { marginTop: 10, gap: 8 },
  navBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  label: { fontSize: 12, color: '#6b7280' },
  rowWrap: { gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  chipTx: { color: '#fff' },
  metric: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, marginBottom: 8 },
  metricTitle: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontWeight: '700', color: '#111827' },
  h2: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingVertical: 7 },
  barLabel: { color: '#374151' },
  barValue: { fontWeight: '700', color: '#111827' },
  hint: { color: '#6b7280' },
});
