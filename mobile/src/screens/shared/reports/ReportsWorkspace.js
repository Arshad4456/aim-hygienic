import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

const PERIODS = [
  { key: 'all', label: 'All' },
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
];

export function ReportsHubScreen({ roleLabel = 'Reports' }) {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    apiClient
      .get(`/reports/master?period=${period}`)
      .then((response) => {
        if (!mounted) return;
        const payload = response?.data || {};
        setData(payload);
        const firstKey = payload?.modules?.[0]?.key || '';
        setSelectedKey((prev) => {
          const stillExists = (payload?.modules || []).some((module) => module.key === prev);
          return stillExists ? prev : firstKey;
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load reports');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [period]);

  const modules = Array.isArray(data?.modules) ? data.modules : [];
  const summary = data?.summary || {};
  const selectedModule = useMemo(
    () => modules.find((item) => item.key === selectedKey) || modules[0] || null,
    [modules, selectedKey]
  );

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Advanced reports workspace</Text>
        <Text style={styles.heroTitle}>Business visibility for {roleLabel}</Text>
        <Text style={styles.heroBody}>
          Review every dashboard module, compare current performance with the previous period, and inspect business alerts.
        </Text>

        <View style={styles.heroMetaWrap}>
          <Pill text={data?.meta?.scopeLabel || 'Current scope'} inverse />
          <Pill text={data?.meta?.currentLabel || 'Current period'} inverse />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
          {PERIODS.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.periodChip, period === item.key ? styles.periodChipActive : null]}
              onPress={() => setPeriod(item.key)}
            >
              <Text style={[styles.periodChipText, period === item.key ? styles.periodChipTextActive : null]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.summaryMetrics}>
          {(summary.headlineKpis || []).map((item) => (
            <View key={item.label} style={styles.summaryMetricCard}>
              <Text style={styles.summaryMetricLabel}>{item.label}</Text>
              <Text style={styles.summaryMetricValue}>{item.value}</Text>
              <Text style={styles.summaryMetricNote}>{item.note}</Text>
            </View>
          ))}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Alerts and insights</Text>
        <Text style={styles.sectionHint}>Priority notes before drilling into module KPI cards.</Text>
        <View style={styles.infoGrid}>
          <InfoList title='Alerts' items={summary.alerts} emptyText='No important alerts in this period.' />
          <InfoList title='What looks good' items={summary.insights} emptyText='Insights will appear when data is available.' />
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeadRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>KPI cards by module</Text>
            <Text style={styles.sectionHint}>Swipe these cards horizontally and tap any one to load its detailed report below.</Text>
          </View>
          <Pill text={`${modules.length} modules`} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moduleCarousel}>
          {(summary.cards || []).map((card) => {
            const active = selectedKey === card.key;
            return (
              <Pressable
                key={card.key}
                onPress={() => setSelectedKey(card.key)}
                style={[styles.moduleCard, active ? styles.moduleCardActive : null]}
              >
                <View style={styles.moduleCardTopRow}>
                  <Text style={[styles.moduleCardTitle, active ? styles.moduleCardTitleActive : null]}>{card.title}</Text>
                  <Pill text={`${card.alertCount || 0} alerts`} small inverse={active} />
                </View>
                <Text style={[styles.moduleCardDesc, active ? styles.moduleCardDescActive : null]}>{card.description}</Text>
                <View style={[styles.moduleCardMetricBox, active ? styles.moduleCardMetricBoxActive : null]}>
                  <Text style={[styles.moduleCardMetricLabel, active ? styles.moduleCardMetricLabelActive : null]}>{card.primaryMetric?.label || 'Metric'}</Text>
                  <Text style={[styles.moduleCardMetricValue, active ? styles.moduleCardMetricValueActive : null]}>{card.primaryMetric?.value || '—'}</Text>
                  <Text style={[styles.moduleCardMetricNote, active ? styles.moduleCardMetricNoteActive : null]}>{card.primaryMetric?.note || card.badge}</Text>
                </View>
                <View style={styles.moduleCardFooter}>
                  <Pill text={card.badge} small inverse={active} />
                  <Text style={[styles.deltaText, active ? styles.deltaTextActive : deltaToneStyle(card.comparison?.tone)]}>{card.comparison?.deltaText || '0.0%'}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Compare periods</Text>
        <Text style={styles.sectionHint}>Current period versus previous period for order, expense, and loan movement.</Text>
        <View style={styles.compareWrap}>
          <CompareBlock title='Orders' block={summary.orderComparison} />
          <CompareBlock title='Expenses' block={summary.expenseComparison} currency />
          <CompareBlock title='Given Loans' block={summary.givenLoanComparison} currency />
          <CompareBlock title='Received Loans' block={summary.receivedLoanComparison} currency />
        </View>
      </Card>

      {selectedModule ? <ModuleDetail module={selectedModule} /> : null}
    </ScrollView>
  );
}

export function ReportModuleScreen({ moduleKey }) {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!moduleKey) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    setError('');

    apiClient
      .get(`/reports/focus/${moduleKey}?period=${period}`)
      .then((response) => {
        if (!mounted) return;
        setData(response?.data || null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load module report');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [moduleKey, period]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{data?.module?.title || 'Module report'}</Text>
        <Text style={styles.sectionHint}>{data?.module?.description || 'Detailed module analytics.'}</Text>
        <View style={styles.heroMetaWrap}>
          <Pill text={data?.meta?.scopeLabel || 'Current scope'} />
          <Pill text={data?.meta?.currentLabel || 'Current period'} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRowLight}>
          {PERIODS.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.periodChipLight, period === item.key ? styles.periodChipLightActive : null]}
              onPress={() => setPeriod(item.key)}
            >
              <Text style={[styles.periodChipLightText, period === item.key ? styles.periodChipLightTextActive : null]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </Card>

      {data?.module ? <ModuleDetail module={data.module} /> : null}
    </ScrollView>
  );
}

function ModuleDetail({ module }) {
  const segments = Array.isArray(module?.segments) ? module.segments.filter(Boolean) : [];
  const [activeSegmentKey, setActiveSegmentKey] = useState(segments[0]?.key || '');

  useEffect(() => {
    setActiveSegmentKey(segments[0]?.key || '');
  }, [module?.key, segments?.[0]?.key]);

  const activeSegment = useMemo(
    () => segments.find((segment) => segment.key === activeSegmentKey) || segments[0] || null,
    [segments, activeSegmentKey]
  );

  const detailSource = activeSegment || module;
  const alerts = withFallbackItems(detailSource?.alerts, `No critical alerts in ${detailSource?.title || module?.title || 'this module'} for the selected period.`);
  const insights = withFallbackItems(detailSource?.insights, `Performance is stable in ${detailSource?.title || module?.title || 'this module'}. Review the detailed tables for action opportunities.`);

  return (
    <Card style={styles.sectionCard}>
      <View style={styles.moduleHeaderRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.moduleBadgeRow}>
            <Pill text={module.badge || 'Operational intelligence'} small />
            <Text style={[styles.deltaText, deltaToneStyle(module.comparison?.tone)]}>{module.comparison?.deltaText || '0.0%'}</Text>
          </View>
          <Text style={styles.moduleTitle}>{module.title}</Text>
          <Text style={styles.moduleHint}>{module.description}</Text>
        </View>
      </View>

      {segments.length ? (
        <View style={styles.segmentSection}>
          <Text style={styles.segmentLabel}>Order report options</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
            {segments.map((segment) => {
              const active = activeSegment?.key === segment.key;
              return (
                <Pressable
                  key={segment.key}
                  onPress={() => setActiveSegmentKey(segment.key)}
                  style={[styles.segmentChip, active ? styles.segmentChipActive : null]}
                >
                  <Text style={[styles.segmentChipText, active ? styles.segmentChipTextActive : null]}>{segment.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {activeSegment?.description ? <Text style={styles.segmentHint}>{activeSegment.description}</Text> : null}
        </View>
      ) : null}

      <View style={styles.infoGrid}>
        <InfoList title='Alerts' items={alerts} emptyText='No module alerts right now.' light />
        <InfoList title='Insights' items={insights} emptyText='Insights will appear when data is available.' light />
      </View>

      <View style={styles.metricGrid}>
        {(detailSource?.kpis || []).map((kpi) => (
          <View key={kpi.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{kpi.label}</Text>
            <Text style={styles.metricValue}>{kpi.value}</Text>
            <Text style={styles.metricNote}>{kpi.note}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tablesWrap}>
        {(detailSource?.tables || []).map((table) => (
          <TableCard key={`${detailSource?.key || module.key}-${table.title}`} table={table} />
        ))}
      </View>
    </Card>
  );
}

function TableCard({ table }) {
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];

  return (
    <View style={styles.tableCard}>
      <View style={styles.sectionHeadRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tableTitle}>{table.title}</Text>
          <Text style={styles.tableHint}>{table.description}</Text>
        </View>
        <Pill text={`${table.count || rows.length} entries`} small />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <View style={[styles.tableWrap, { minWidth: Math.max(columns.length * 170, 760) }]}>
          <View style={styles.tableHeaderRow}>
            {columns.map((column) => (
              <Text key={column.key} style={[styles.tableCell, styles.tableHeaderCell]}>{column.label}</Text>
            ))}
          </View>
          <ScrollView style={styles.tableBodyScroll} nestedScrollEnabled>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <View key={`${table.title}-${rowIndex}`} style={styles.tableRow}>
                  {columns.map((column) => (
                    <Text key={column.key} style={styles.tableCell}>{String(row?.[column.key] ?? '—')}</Text>
                  ))}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No data available for this table.</Text>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

function CompareBlock({ title, block, currency = false }) {
  return (
    <View style={styles.compareCard}>
      <View style={styles.sectionHeadRow}>
        <Text style={styles.compareTitle}>{title}</Text>
        <Text style={[styles.deltaText, deltaToneStyle(block?.tone)]}>{block?.deltaText || '0.0%'}</Text>
      </View>
      <View style={styles.compareMetrics}>
        <View style={styles.compareMetric}>
          <Text style={styles.compareMetricLabel}>{block?.currentLabel || 'Current'}</Text>
          <Text style={styles.compareMetricValue}>{currency ? formatMoney(block?.currentValue) : formatNumber(block?.currentValue)}</Text>
        </View>
        <View style={styles.compareMetric}>
          <Text style={styles.compareMetricLabel}>{block?.previousLabel || 'Previous'}</Text>
          <Text style={styles.compareMetricValue}>{currency ? formatMoney(block?.previousValue) : formatNumber(block?.previousValue)}</Text>
        </View>
      </View>
    </View>
  );
}

function InfoList({ title, items, emptyText, light = false }) {
  const rows = Array.isArray(items) ? items.filter(Boolean).slice(0, 6) : [];
  return (
    <View style={[styles.infoCard, light ? styles.infoCardLight : null]}>
      <Text style={[styles.infoTitle, light ? styles.infoTitleLight : null]}>{title}</Text>
      {rows.length ? rows.map((item, index) => (
        <View key={`${title}-${index}`} style={styles.infoRow}>
          <View style={[styles.infoDot, light ? styles.infoDotLight : null]} />
          <Text style={[styles.infoText, light ? styles.infoTextLight : null]}>{item}</Text>
        </View>
      )) : <Text style={[styles.infoText, light ? styles.infoTextLight : null]}>{emptyText}</Text>}
    </View>
  );
}

function Pill({ text, inverse = false, small = false }) {
  return (
    <View style={[styles.pill, inverse ? styles.pillInverse : null, small ? styles.pillSmall : null]}>
      <Text style={[styles.pillText, inverse ? styles.pillTextInverse : null, small ? styles.pillTextSmall : null]}>{text}</Text>
    </View>
  );
}

function withFallbackItems(items, fallbackText) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  return rows.length ? rows : [fallbackText];
}

function deltaToneStyle(tone) {
  if (tone === 'positive') return styles.deltaPositive;
  if (tone === 'negative') return styles.deltaNegative;
  return styles.deltaNeutral;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatMoney(value) {
  return `PKR ${formatNumber(value)}`;
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 28, gap: 12 },
  hero: {
    borderRadius: 26,
    padding: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  heroEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: '#a5f3fc' },
  heroTitle: { marginTop: 10, fontSize: 28, lineHeight: 34, fontWeight: '800', color: '#ffffff' },
  heroBody: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#cbd5e1' },
  heroMetaWrap: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodRow: { marginTop: 14, gap: 8 },
  periodRowLight: { marginTop: 12, gap: 8 },
  periodChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.12)' },
  periodChipActive: { backgroundColor: '#ffffff' },
  periodChipText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  periodChipTextActive: { color: '#0f172a' },
  periodChipLight: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#f1f5f9' },
  periodChipLightActive: { backgroundColor: '#0f172a' },
  periodChipLightText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  periodChipLightTextActive: { color: '#ffffff' },
  summaryMetrics: { marginTop: 14, gap: 10 },
  summaryMetricCard: { borderRadius: 20, padding: 14, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  summaryMetricLabel: { fontSize: 12, color: '#cbd5e1' },
  summaryMetricValue: { marginTop: 6, fontSize: 20, fontWeight: '800', color: '#ffffff' },
  summaryMetricNote: { marginTop: 4, fontSize: 11, color: '#a5f3fc' },
  sectionCard: { borderRadius: 24 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sectionHint: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#64748b' },
  moduleCarousel: { marginTop: 12, gap: 12, paddingRight: 4 },
  moduleCard: { width: 296, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  moduleCardActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  moduleCardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  moduleCardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#0f172a' },
  moduleCardTitleActive: { color: '#ffffff' },
  moduleCardDesc: { marginTop: 6, fontSize: 12, lineHeight: 18, color: '#64748b' },
  moduleCardDescActive: { color: '#cbd5e1' },
  moduleCardMetricBox: { marginTop: 12, borderRadius: 18, padding: 12, backgroundColor: '#ffffff' },
  moduleCardMetricBoxActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  moduleCardMetricLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: '#64748b', fontWeight: '700' },
  moduleCardMetricLabelActive: { color: '#a5f3fc' },
  moduleCardMetricValue: { marginTop: 6, fontSize: 22, fontWeight: '800', color: '#0f172a' },
  moduleCardMetricValueActive: { color: '#ffffff' },
  moduleCardMetricNote: { marginTop: 4, fontSize: 11, color: '#64748b' },
  moduleCardMetricNoteActive: { color: '#cbd5e1' },
  moduleCardFooter: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  compareWrap: { marginTop: 12, gap: 10 },
  compareCard: { borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  compareTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  compareMetrics: { marginTop: 12, gap: 8 },
  compareMetric: { borderRadius: 16, padding: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#edf2f7' },
  compareMetricLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#94a3b8', fontWeight: '700' },
  compareMetricValue: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f172a' },
  infoGrid: { marginTop: 12, gap: 10 },
  infoCard: { borderRadius: 20, padding: 14, backgroundColor: '#0f172a' },
  infoCardLight: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  infoTitleLight: { color: '#0f172a' },
  infoRow: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#ffffff', marginTop: 5 },
  infoDotLight: { backgroundColor: '#0f172a' },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#e2e8f0' },
  infoTextLight: { color: '#475569' },
  moduleHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  moduleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moduleTitle: { marginTop: 10, fontSize: 22, lineHeight: 28, fontWeight: '800', color: '#0f172a' },
  moduleHint: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#64748b' },
  segmentSection: { marginTop: 14 },
  segmentLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', color: '#94a3b8' },
  segmentRow: { marginTop: 10, gap: 8, paddingRight: 4 },
  segmentChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#f1f5f9' },
  segmentChipActive: { backgroundColor: '#0f172a' },
  segmentChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  segmentChipTextActive: { color: '#ffffff' },
  segmentHint: { marginTop: 10, fontSize: 12, lineHeight: 18, color: '#64748b' },
  metricGrid: { marginTop: 14, gap: 10 },
  metricCard: { borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  metricLabel: { fontSize: 12, color: '#64748b' },
  metricValue: { marginTop: 6, fontSize: 22, fontWeight: '800', color: '#0f172a' },
  metricNote: { marginTop: 4, fontSize: 11, color: '#64748b' },
  tablesWrap: { marginTop: 14, gap: 12 },
  tableCard: { borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  tableTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  tableHint: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#64748b' },
  tableWrap: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tableBodyScroll: { maxHeight: 296 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  tableCell: { width: 170, paddingHorizontal: 10, paddingVertical: 10, fontSize: 12, lineHeight: 17, color: '#0f172a' },
  tableHeaderCell: { fontWeight: '800', color: '#334155' },
  emptyText: { padding: 14, fontSize: 12, color: '#64748b' },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f5f9', alignSelf: 'flex-start' },
  pillInverse: { backgroundColor: 'rgba(255,255,255,0.12)' },
  pillSmall: { paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  pillTextInverse: { color: '#ffffff' },
  pillTextSmall: { fontSize: 10 },
  deltaText: { fontSize: 12, fontWeight: '800' },
  deltaTextActive: { color: '#ffffff' },
  deltaPositive: { color: '#047857' },
  deltaNegative: { color: '#be123c' },
  deltaNeutral: { color: '#475569' },
  errorText: { color: '#b91c1c', fontSize: 12, lineHeight: 18 },
});