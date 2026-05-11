import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../../infrastructure/api/client';
import Card from '../../../../../foundation/ui/Card';
import Loader from '../../../../../foundation/ui/Loader';

const cards = [
  { title: 'Invoices', description: 'Create and manage sales invoices and billing.', route: 'admin:finance/invoices' },
  { title: 'Receipts', description: 'Record customer receipts and settlement status.', route: 'admin:finance/receipts' },
  { title: 'Aging Report', description: 'Monitor outstanding receivables by aging bucket.', route: 'admin:finance/aging' },
];

export default function FinanceScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [report, setReport] = useState({ totals: {}, accounts: [] });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      try {
        const data = await apiClient.get('/reports/finance');
        if (!mounted) return;
        setReport({ totals: data?.data?.totals || {}, accounts: data?.data?.accounts || [] });
        setErr('');
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load finance report');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const metrics = useMemo(() => {
    const totalBalance = (report.accounts || []).reduce((sum, row) => sum + Number(row.currentBalance || 0), 0);
    return [
      { label: 'Total Expenses', value: formatCurrency(report?.totals?.totalExpenses) },
      { label: 'Approved Expenses', value: formatCurrency(report?.totals?.approvedExpenses) },
      { label: 'Accounts Tracked', value: formatNumber(report?.accounts?.length) },
      { label: 'Total Balances', value: formatCurrency(totalBalance) },
    ];
  }, [report]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Finance & Accounts</Text>
        <Text style={styles.subtitle}>Track invoices, receipts, and profitability by product and warehouse.</Text>
        <Text style={styles.refresh}>Auto-refreshing every 30 seconds</Text>

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <View style={styles.metricsWrap}>
          {metrics.map((item) => (
            <View key={item.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{item.label}</Text>
              <Text style={styles.metricValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Master Modules</Text>
        <Text style={styles.hint}>Invoices, receipts, and aging reports live under Finance & Accounts.</Text>
        <View style={styles.grid}>
          {cards.map((item) => (
            <Pressable key={item.title} style={styles.moduleCard} onPress={() => navigation?.navigate?.(item.route)}>
              <Text style={styles.moduleTitle}>{item.title}</Text>
              <Text style={styles.moduleDesc}>{item.description}</Text>
            </Pressable>
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

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  refresh: { marginTop: 4, color: '#059669', fontSize: 12, fontWeight: '600' },
  err: { marginTop: 8, color: '#b91c1c' },
  metricsWrap: { marginTop: 12, gap: 8 },
  metricCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  metricLabel: { color: '#6b7280', fontSize: 12 },
  metricValue: { marginTop: 4, fontWeight: '700', color: '#111827' },
  h2: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#111827' },
  hint: { color: '#6b7280', marginTop: 4, fontSize: 12 },
  grid: { marginTop: 10, gap: 8 },
  moduleCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  moduleTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  moduleDesc: { color: '#6b7280', marginTop: 4, fontSize: 12 },
});