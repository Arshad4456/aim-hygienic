import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function FinanceScreen() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState({ totals: {}, expensesByCategory: [], accounts: [] });
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      setErr('');
      try {
        const data = await apiClient.get('/reports/finance');
        if (!mounted) return;
        setReport({
          totals: data?.data?.totals || {},
          expensesByCategory: data?.data?.expensesByCategory || [],
          accounts: data?.data?.accounts || [],
        });
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load finance report');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const metrics = useMemo(() => {
    const totalBalance = report.accounts.reduce((sum, row) => sum + Number(row.currentBalance || 0), 0);
    return [
      { label: 'Total Expenses', value: formatCurrency(report.totals.totalExpenses) },
      { label: 'Approved Expenses', value: formatCurrency(report.totals.approvedExpenses) },
      { label: 'Accounts Tracked', value: formatNumber(report.accounts.length) },
      { label: 'Total Balances', value: formatCurrency(totalBalance) },
    ];
  }, [report]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Finance & Expenses</Text>
        <Text style={styles.subtitle}>Track budget utilization, approvals, and cash position.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}

        <View style={styles.metricsWrap}>{metrics.map((item) => <Metric key={item.label} {...item} />)}</View>

        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.table}>
            <Row head cols={['Category', 'Expense Count', 'Total Spent']} />
            {!report.expensesByCategory.length ? (
              <Text style={styles.empty}>No expenses recorded</Text>
            ) : report.expensesByCategory.map((row) => (
              <Row key={row.category} cols={[row.category || '—', formatNumber(row.count), formatCurrency(row.total)]} />
            ))}
          </View>
        </ScrollView>

        <Text style={styles.h2}>Account Balances</Text>
        <View style={styles.accountsWrap}>
          {!report.accounts.length ? (
            <View style={styles.emptyCard}><Text style={styles.emptyCardText}>No accounts configured.</Text></View>
          ) : report.accounts.map((account) => (
            <View key={account.accountName} style={styles.accountCard}>
              <Text style={styles.accountTitle}>{account.accountName || '—'}</Text>
              <Text style={styles.accountType}>{String(account.accountType || '—')}</Text>
              <Text style={styles.accountBalance}>{account.currency || 'BDT'} {formatNumber(account.currentBalance)}</Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString();
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return `₨ ${Number(value).toLocaleString()}`;
}

function Metric({ label, value }) {
  return <View style={styles.metricCard}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function Row({ cols, head }) {
  return <View style={[styles.row, head ? styles.head : null]}>{cols.map((c, i) => <Text key={`${i}-${c}`} style={styles.cell}>{String(c)}</Text>)}</View>;
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  err: { marginTop: 8, color: '#b91c1c' },
  metricsWrap: { marginTop: 12, gap: 8 },
  metricCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontWeight: '700', color: '#111827' },
  table: { minWidth: 700, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 220, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  empty: { color: '#6b7280', padding: 10 },
  h2: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#111827' },
  accountsWrap: { marginTop: 8, gap: 8 },
  accountCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  accountTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  accountType: { marginTop: 2, color: '#6b7280', fontSize: 12, textTransform: 'capitalize' },
  accountBalance: { marginTop: 8, fontSize: 16, fontWeight: '700', color: '#111827' },
  emptyCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fafafa', padding: 10 },
  emptyCardText: { color: '#6b7280', fontSize: 12 },
});
