import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function SalesScreen() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      setErr('');
      try {
        const [primaryRes, secondaryRes, returnRes] = await Promise.all([
          apiClient.get('/reports/detail/primary-sales'),
          apiClient.get('/reports/detail/secondary-sales'),
          apiClient.get('/reports/detail/return-stock'),
        ]);
        if (!mounted) return;
        setSections([
          primaryRes?.data || null,
          secondaryRes?.data || null,
          returnRes?.data || null,
        ].filter(Boolean));
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load sales report');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const highlights = useMemo(() => {
    const allCards = sections.flatMap((section) => section.cards || []);
    const totalCards = allCards.length;
    const trackedSections = sections.length;
    const returnClaims = sections.find((section) => section.section === 'return-stock')?.cards?.[0]?.value || '—';
    return [
      { label: 'Reports Loaded', value: formatNumber(trackedSections) },
      { label: 'KPIs Available', value: formatNumber(totalCards) },
      { label: 'Sale Types', value: 'Primary, Secondary, Return' },
      { label: 'Return Claims', value: returnClaims },
    ];
  }, [sections]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Sales Performance</Text>
        <Text style={styles.subtitle}>Primary sale, secondary sale, and return sale data in one report module.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}

        <View style={styles.metricsWrap}>{highlights.map((item) => <Metric key={item.label} {...item} />)}</View>
      </Card>

      {sections.map((section) => (
        <Card key={section.section || section.title}>
          <Text style={styles.sectionTitle}>{section.title || 'Sales Report'}</Text>
          <Text style={styles.sectionSubtitle}>{section.subtitle || 'No summary available.'}</Text>
          <View style={styles.metricsWrap}>
            {(section.cards || []).map((card) => (
              <Metric key={`${section.section}-${card.label}`} label={card.label} value={card.value} helper={card.helper} />
            ))}
          </View>
          <ScrollView horizontal style={{ marginTop: 8 }}>
            <View style={styles.table}>
              <Row head cols={section.columns || ['Label', 'Value']} />
              {!(section.rows || []).length ? (
                <Text style={styles.empty}>No rows available</Text>
              ) : (section.rows || []).slice(0, 15).map((row, index) => (
                <Row key={`${section.section}-${index}`} cols={row} />
              ))}
            </View>
          </ScrollView>
        </Card>
      ))}
    </ScrollView>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString();
}

function Metric({ label, value, helper }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
    </View>
  );
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
  metricHelper: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { marginTop: 4, color: '#6b7280' },
  table: { minWidth: 760, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 180, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  empty: { color: '#6b7280', padding: 10 },
});
