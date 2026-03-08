import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

const cards = [
  {
    title: 'Sales Performance',
    description: 'Revenue, order volumes, and top customers across regions.',
    route: 'admin:reports/sales',
  },
  {
    title: 'Inventory Health',
    description: 'Stock coverage, slow movers, and expiry exposure by warehouse.',
    route: 'admin:reports/inventory',
  },
  {
    title: 'Finance & Expenses',
    description: 'Cash flow, expense approvals, and account balances overview.',
    route: 'admin:reports/finance',
  },
  {
    title: 'HR & Productivity',
    description: 'Headcount, attendance, and role distribution snapshots.',
    route: 'admin:reports/hr',
  },
  {
    title: 'Logistics & Delivery',
    description: 'On-time performance, fleet utilization, and route efficiency.',
    route: 'admin:reports/logistics',
  },
  {
    title: 'Compliance & Quality',
    description: 'QC pass rates, audits, and non-conformance tracking.',
    route: 'admin:reports/compliance',
  },
];

const defaultFilters = {
  period: 'this_month',
  region: 'all',
  warehouse: 'all',
  status: 'all',
};

export default function ReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(defaultFilters);
  const [metrics, setMetrics] = useState(null);
  const [overviewErr, setOverviewErr] = useState('');
  const [builderRows, setBuilderRows] = useState([]);
  const [builderErr, setBuilderErr] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let mounted = true;
    const loadOverview = async () => {
      if (!mounted) return;
      setOverviewErr('');
      try {
        const data = await apiClient.get('/reports/overview');
        if (!mounted) return;
        setMetrics(data?.data?.metrics || null);
      } catch (e) {
        if (!mounted) return;
        setOverviewErr(e.message || 'Failed to load reports overview');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadOverview();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadBuilder = async () => {
      if (!mounted) return;
      setBuilderErr('');
      try {
        const query = new URLSearchParams(filters).toString();
        const data = await apiClient.get(`/reports/builder?${query}`);
        if (!mounted) return;
        setBuilderRows(Array.isArray(data?.data?.rows) ? data.data.rows : []);
      } catch (e) {
        if (!mounted) return;
        setBuilderErr(e.message || 'Failed to load report builder data');
      }
    };

    loadBuilder();
    const refresh = setInterval(loadBuilder, 30000);

    return () => {
      mounted = false;
      clearInterval(refresh);
    };
  }, [filters]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const quickMetrics = [
    {
      label: 'Sales Orders',
      value: formatNumber(metrics?.totalSalesOrders),
      delta: `${formatNumber(metrics?.salesRegions)} regions`,
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(metrics?.totalExpenses),
      delta: `${formatNumber(metrics?.pendingExpenses)} pending`,
    },
    {
      label: 'Active Users',
      value: formatNumber(metrics?.activeUsers),
      delta: `${formatNumber(metrics?.userRoles)} roles`,
    },
    {
      label: 'Warehouses',
      value: formatNumber(metrics?.totalWarehouses),
      delta: `${formatNumber(metrics?.totalProducts)} products`,
    },
  ];

  const filteredRows = useMemo(() => {
    if (filters.status === 'all') return builderRows;
    return builderRows.filter((row) => String(row.status || '').toLowerCase() === filters.status);
  }, [builderRows, filters.status]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Reports Center</Text>
        <Text style={styles.subtitle}>Build operational intelligence with curated dashboards across departments.</Text>
        <Text style={styles.now}>{now.toLocaleString()}</Text>

        <View style={styles.actionRow}>
          <Pressable style={[styles.actionBtn, styles.ghostBtn]}><Text style={styles.ghostText}>Schedule Report</Text></Pressable>
          <Pressable style={[styles.actionBtn, styles.primaryBtn]}><Text style={styles.primaryText}>Create Report</Text></Pressable>
        </View>

        {overviewErr ? <Text style={styles.err}>{overviewErr}</Text> : null}
        {builderErr ? <Text style={styles.warn}>{builderErr}</Text> : null}

        <View style={styles.metricsWrap}>
          {quickMetrics.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricDelta}>{metric.delta}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Master Reports</Text>
        <Text style={styles.hint}>Quick access to the core departmental dashboards.</Text>
        <View style={styles.grid}>
          {cards.map((card) => (
            <Pressable key={card.title} style={styles.moduleCard} onPress={() => navigation?.navigate?.(card.route)}>
              <Text style={styles.moduleTitle}>{card.title}</Text>
              <Text style={styles.moduleDesc}>{card.description}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.h2}>Report Builder</Text>
        <Text style={styles.hint}>Filter, export, and distribute recurring reports.</Text>

        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.filterRow}>
            <Selector
              label="Period"
              value={filters.period}
              onChange={(value) => setFilters((s) => ({ ...s, period: value }))}
              options={[
                { label: 'Today', value: 'today' },
                { label: 'This Week', value: 'this_week' },
                { label: 'This Month', value: 'this_month' },
                { label: 'This Quarter', value: 'this_quarter' },
              ]}
            />
            <Selector
              label="Region"
              value={filters.region}
              onChange={(value) => setFilters((s) => ({ ...s, region: value }))}
              options={[
                { label: 'All Regions', value: 'all' },
                { label: 'North', value: 'north' },
                { label: 'South', value: 'south' },
                { label: 'Central', value: 'central' },
              ]}
            />
            <Selector
              label="Warehouse"
              value={filters.warehouse}
              onChange={(value) => setFilters((s) => ({ ...s, warehouse: value }))}
              options={[
                { label: 'All Warehouses', value: 'all' },
                { label: 'Dhaka', value: 'dhaka' },
                { label: 'Chattogram', value: 'chattogram' },
                { label: 'Khulna', value: 'khulna' },
              ]}
            />
            <Selector
              label="Status"
              value={filters.status}
              onChange={(value) => setFilters((s) => ({ ...s, status: value }))}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Ready', value: 'ready' },
                { label: 'Needs review', value: 'needs review' },
                { label: 'Draft', value: 'draft' },
              ]}
            />
          </View>
        </ScrollView>

        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.tableWide}>
            <Row head cols={['Report Name', 'Owner', 'Cadence', 'Last Run', 'Status', 'Actions']} />
            {filteredRows.length === 0 ? (
              <Text style={styles.empty}>No report rows found</Text>
            ) : (
              filteredRows.map((row) => (
                <Row
                  key={row.id || `${row.title}-${row.owner}`}
                  cols={[
                    row.title || '—',
                    row.owner || '—',
                    row.cadence || '—',
                    formatDateTime(row.lastRunAt),
                    row.status || '—',
                    'Run · Export · Share',
                  ]}
                  status={row.status}
                />
              ))
            )}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function Selector({ label, value, onChange, options }) {
  return (
    <View style={styles.selectorWrap}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <View style={styles.selectorRow}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.chip, value === opt.value ? styles.chipActive : null]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.chipText, value === opt.value ? styles.chipTextActive : null]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Row({ cols, head, status }) {
  return (
    <View style={[styles.row, head ? styles.head : null]}>
      {cols.map((value, index) => {
        if (!head && index === 4) {
          return (
            <View key={`${index}-${value}`} style={styles.cell}>
              <StatusPill status={status} />
            </View>
          );
        }
        return <Text key={`${index}-${value}`} style={styles.cell}>{String(value)}</Text>;
      })}
    </View>
  );
}

function StatusPill({ status }) {
  const normalized = String(status || '').toLowerCase();
  let style = styles.pillDraft;
  if (normalized === 'ready') style = styles.pillReady;
  if (normalized === 'needs review') style = styles.pillReview;

  return (
    <View style={[styles.pill, style]}>
      <Text style={styles.pillText}>{status || 'Draft'}</Text>
    </View>
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

function formatDateTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  now: { marginTop: 6, color: '#6b7280', fontSize: 12 },
  actionRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  actionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  ghostBtn: { borderWidth: 1, borderColor: '#d4d4d8', backgroundColor: '#fff' },
  primaryBtn: { backgroundColor: '#059669' },
  ghostText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  primaryText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  err: { marginTop: 8, color: '#b91c1c' },
  warn: { marginTop: 6, color: '#b45309' },
  metricsWrap: { marginTop: 12, gap: 8 },
  metricCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  metricLabel: { color: '#6b7280', fontSize: 12 },
  metricValue: { marginTop: 4, fontWeight: '700', color: '#111827' },
  metricDelta: { marginTop: 4, fontSize: 11, color: '#059669' },
  h2: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#111827' },
  hint: { marginTop: 4, color: '#6b7280', fontSize: 12 },
  grid: { marginTop: 8, gap: 8 },
  moduleCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  moduleTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  moduleDesc: { marginTop: 4, color: '#6b7280', fontSize: 12 },
  filterRow: { minWidth: 980, gap: 8, marginTop: 4 },
  selectorWrap: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 8, backgroundColor: '#fafafa' },
  selectorLabel: { fontSize: 12, color: '#374151', marginBottom: 6, fontWeight: '600' },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 11, color: '#374151' },
  chipTextActive: { color: '#fff' },
  tableWide: { minWidth: 980, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 160, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  empty: { color: '#6b7280', padding: 10 },
  pill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillReady: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  pillReview: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  pillDraft: { backgroundColor: '#f4f4f5', borderColor: '#e4e4e7' },
  pillText: { fontSize: 11, color: '#374151', textTransform: 'capitalize' },
});
