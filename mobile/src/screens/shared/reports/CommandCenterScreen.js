import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export default function CommandCenterScreen({ variant = 'management' }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/reports/overview');
      setPayload(res?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load reports dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dashboard = payload?.dashboard || {};
  const headline = dashboard.headline || {};
  const sections = dashboard.sections || {};
  const tables = dashboard.tables || {};
  const kpis = dashboard.kpis || [];

  const rosterRows = variant === 'distributor' ? tables.teamRows || [] : tables.distributorRows || [];

  const heroCards = useMemo(() => ([
    { label: 'Revenue', value: formatCurrency(headline.revenue), hint: `${formatNumber(headline.orders)} orders` },
    { label: 'Outstanding', value: formatCurrency(headline.outstanding), hint: `${formatNumber(headline.overdueRecoveryCount)} overdue` },
    { label: variant === 'distributor' ? 'Team active' : 'Customers', value: formatNumber(variant === 'distributor' ? headline.activeUsers : headline.activeCustomers), hint: `${formatNumber(headline.podMissing)} POD missing` },
  ]), [headline, variant]);

  if (loading) return <Loader />;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
    >
      <View style={styles.heroWrap}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <Text style={styles.heroEyebrow}>AIM ERP • Reports</Text>
        <Text style={styles.heroTitle}>{dashboard.hero?.title || 'Reports Command Center'}</Text>
        <Text style={styles.heroSubtitle}>{dashboard.hero?.subtitle || 'Professional decision support for operations, finance, inventory, and service quality.'}</Text>

        <View style={styles.heroPillRow}>
          <Text style={styles.heroPill}>{payload?.context?.role || (variant === 'distributor' ? 'Distributor' : 'Admin')}</Text>
          <Text style={styles.heroPill}>{payload?.context?.scope || variant}</Text>
          <Text style={styles.heroPill}>{payload?.generatedAt ? new Date(payload.generatedAt).toLocaleString() : 'Live'}</Text>
        </View>

        <View style={styles.heroCardWrap}>
          {heroCards.map((card) => (
            <View key={card.label} style={styles.heroCard}>
              <Text style={styles.heroCardLabel}>{card.label}</Text>
              <Text style={styles.heroCardValue}>{card.value}</Text>
              <Text style={styles.heroCardHint}>{card.hint}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryAction} onPress={() => load(true)}>
            <Text style={styles.secondaryActionText}>Refresh now</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Card style={styles.panelCard}>
        <Text style={styles.sectionTitle}>Executive KPI strip</Text>
        <Text style={styles.sectionSubtitle}>The strongest signals your management team will ask about first.</Text>
        <View style={styles.metricsWrap}>
          {kpis.map((item, index) => (
            <View key={`${item.label}-${index}`} style={[styles.metricCard, metricPalette(index)]}>
              <Text style={styles.metricLabel}>{item.label}</Text>
              <Text style={styles.metricValue}>{item.displayValue}</Text>
              <Text style={styles.metricHelper}>{item.helper}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.panelCard}>
        <Text style={styles.sectionTitle}>Sales and service flow</Text>
        <Text style={styles.sectionSubtitle}>Monthly revenue movement with order status pressure.</Text>
        <View style={styles.trendWrap}>
          {(sections.salesTrend || []).map((item) => (
            <View key={item.label} style={styles.trendCol}>
              <Text style={styles.trendValue}>{formatNumber(item.orders)}</Text>
              <View style={styles.trendTrack}>
                <View style={[styles.trendFill, { height: Math.max(16, Math.round((Number(item.revenue || 0) / Math.max(...(sections.salesTrend || []).map((row) => Number(row.revenue || 0)), 1)) * 92)) }]} />
              </View>
              <Text style={styles.trendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 14, gap: 10 }}>
          {(sections.statusBreakdown || []).map((row) => (
            <View key={row.label}>
              <View style={styles.rowBetween}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowStrong}>{formatNumber(row.value)}</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.max(6, Math.round((Number(row.value || 0) / Math.max(Number(headline.orders || 0), 1)) * 100))}%` }]} />
              </View>
              <Text style={styles.rowHint}>{formatCurrency(row.amount)}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.panelCard}>
        <Text style={styles.sectionTitle}>{variant === 'distributor' ? 'Territory and customer table' : 'Area and customer table'}</Text>
        <Text style={styles.sectionSubtitle}>Useful for review meetings, regional performance checks, and sales follow-ups.</Text>
        <DataTable
          headers={[variant === 'distributor' ? 'Territory' : 'Territory', 'Orders', 'Revenue', 'Delivery %']}
          rows={(tables.areaRows || []).slice(0, 6).map((row) => [row.territoryName, formatNumber(row.orders), formatCurrency(row.revenue), `${row.deliveryRate}%`])}
          emptyLabel="No area rows found."
        />
        <View style={{ height: 12 }} />
        <DataTable
          headers={['Customer', 'Orders', 'Revenue', 'Outstanding']}
          rows={(tables.customerRows || []).slice(0, 6).map((row) => [row.customerName, formatNumber(row.orders), formatCurrency(row.revenue), formatCurrency(row.outstanding)])}
          emptyLabel="No customer activity found."
        />
      </Card>

      <Card style={styles.panelCard}>
        <Text style={styles.sectionTitle}>{variant === 'distributor' ? 'Team command board' : 'Distributor and team command board'}</Text>
        <Text style={styles.sectionSubtitle}>{variant === 'distributor' ? 'Keep an eye on your highest-impact team members.' : 'Compare distributor contribution and field execution from one place.'}</Text>
        <DataTable
          headers={variant === 'distributor' ? ['Name', 'Role', 'Orders', 'Revenue', 'POD %'] : ['Distributor', 'Territory', 'Orders', 'Revenue', 'Delivered']}
          rows={variant === 'distributor'
            ? (tables.teamRows || []).slice(0, 7).map((row) => [row.name, row.role, formatNumber(row.orders), formatCurrency(row.revenue), `${row.podRate}%`])
            : (tables.distributorRows || []).slice(0, 7).map((row) => [row.distributorName, row.territoryName, formatNumber(row.orders), formatCurrency(row.revenue), formatNumber(row.delivered)])}
          emptyLabel={variant === 'distributor' ? 'No team rows found.' : 'No distributor rows found.'}
        />
        {variant !== 'distributor' ? (
          <View style={{ marginTop: 12 }}>
            <DataTable
              headers={['Name', 'Role', 'Orders', 'Revenue', 'POD %']}
              rows={(tables.teamRows || []).slice(0, 6).map((row) => [row.name, row.role, formatNumber(row.orders), formatCurrency(row.revenue), `${row.podRate}%`])}
              emptyLabel="No team rows found."
            />
          </View>
        ) : null}
      </Card>

      <Card style={styles.panelCard}>
        <Text style={styles.sectionTitle}>Risk watchlist and alerts</Text>
        <Text style={styles.sectionSubtitle}>This area should quickly tell leadership what needs action today.</Text>
        {(tables.alertRows || []).length ? (
          (tables.alertRows || []).slice(0, 8).map((row, index) => (
            <View key={`${row.title}-${index}`} style={[styles.alertItem, alertPalette(row.severity)]}>
              <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{String(row.severity || 'info').toUpperCase()}</Text></View>
              <Text style={styles.alertTitle}>{row.title}</Text>
              <Text style={styles.alertReason}>{row.reason}</Text>
              {row.metric ? <Text style={styles.alertMetric}>{row.metric}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No critical alerts right now.</Text>
        )}
      </Card>

      {variant !== 'distributor' ? (
        <Card style={styles.panelCard}>
          <Text style={styles.sectionTitle}>Low stock and replenishment</Text>
          <Text style={styles.sectionSubtitle}>A business-favorite section for procurement and warehouse teams.</Text>
          <DataTable
            headers={['Product', 'Category', 'On hand', 'Minimum']}
            rows={(tables.lowStockRows || []).slice(0, 6).map((row) => [row.name, row.category || 'General', formatNumber(row.onHand), formatNumber(row.minStockLevel)])}
            emptyLabel="Low stock watchlist is clear."
          />
        </Card>
      ) : null}
    </ScrollView>
  );
}

function DataTable({ headers, rows, emptyLabel }) {
  return (
    <View style={styles.tableWrap}>
      <View style={styles.tableHead}>
        {headers.map((header) => (
          <Text key={header} style={styles.tableHeadCell}>{header}</Text>
        ))}
      </View>
      {rows.length ? rows.map((row, index) => (
        <View key={`row-${index}`} style={styles.tableRow}>
          {row.map((cell, cellIndex) => (
            <Text key={`${index}-${cellIndex}`} style={styles.tableCell}>{String(cell)}</Text>
          ))}
        </View>
      )) : <Text style={styles.empty}>{emptyLabel}</Text>}
    </View>
  );
}

function metricPalette(index) {
  const palettes = [
    { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
    { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' },
    { backgroundColor: '#ecfeff', borderColor: '#a5f3fc' },
    { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' },
    { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
    { backgroundColor: '#fff7ed', borderColor: '#fdba74' },
  ];
  return palettes[index % palettes.length];
}

function alertPalette(severity) {
  if (severity === 'critical') return { backgroundColor: '#fff1f2', borderColor: '#fecdd3' };
  if (severity === 'warning') return { backgroundColor: '#fff7ed', borderColor: '#fed7aa' };
  return { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' };
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 30, gap: 12 },
  heroWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    padding: 18,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowOne: { position: 'absolute', top: -40, left: -20, width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(99,102,241,0.33)' },
  heroGlowTwo: { position: 'absolute', right: -30, top: 20, width: 170, height: 170, borderRadius: 999, backgroundColor: 'rgba(34,211,238,0.22)' },
  heroEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2 },
  heroTitle: { marginTop: 10, fontSize: 26, fontWeight: '800', color: '#ffffff' },
  heroSubtitle: { marginTop: 8, color: 'rgba(255,255,255,0.72)', lineHeight: 20 },
  heroPillRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, color: '#ffffff', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroCardWrap: { marginTop: 16, gap: 10 },
  heroCard: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.10)', padding: 12 },
  heroCardLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5 },
  heroCardValue: { marginTop: 8, fontSize: 24, fontWeight: '800', color: '#fff' },
  heroCardHint: { marginTop: 8, color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  actionRow: { marginTop: 16, flexDirection: 'row', gap: 10 },
  secondaryAction: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.10)' },
  secondaryActionText: { color: '#fff', fontWeight: '700' },
  err: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', color: '#b91c1c', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  panelCard: { borderRadius: 24, padding: 16, borderColor: '#dbe4ff', shadowColor: '#1e293b', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { marginTop: 4, color: '#64748b', lineHeight: 18 },
  metricsWrap: { marginTop: 14, gap: 10 },
  metricCard: { borderWidth: 1, borderRadius: 18, padding: 12 },
  metricLabel: { color: '#475569', fontSize: 12, fontWeight: '700' },
  metricValue: { marginTop: 8, color: '#0f172a', fontSize: 21, fontWeight: '800' },
  metricHelper: { marginTop: 8, color: '#475569', fontSize: 12, lineHeight: 18 },
  trendWrap: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  trendCol: { flex: 1, alignItems: 'center' },
  trendValue: { fontSize: 10, color: '#475569' },
  trendTrack: { marginTop: 8, height: 102, width: '100%', borderRadius: 18, backgroundColor: '#eef2ff', justifyContent: 'flex-end', padding: 6 },
  trendFill: { width: '100%', borderRadius: 14, backgroundColor: '#8b5cf6' },
  trendLabel: { marginTop: 8, fontSize: 10, color: '#475569' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: '#0f172a', fontWeight: '700' },
  rowStrong: { color: '#0f172a', fontWeight: '800' },
  rowHint: { marginTop: 6, color: '#64748b', fontSize: 12 },
  progressBg: { marginTop: 8, height: 8, borderRadius: 999, backgroundColor: '#e2e8f0' },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: '#0ea5e9' },
  tableWrap: { marginTop: 14, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', backgroundColor: '#eff6ff' },
  tableHeadCell: { flex: 1, paddingHorizontal: 10, paddingVertical: 10, fontSize: 11, fontWeight: '700', color: '#334155' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eef2ff' },
  tableCell: { flex: 1, paddingHorizontal: 10, paddingVertical: 10, fontSize: 12, color: '#0f172a' },
  alertItem: { marginTop: 12, borderWidth: 1, borderRadius: 20, padding: 12 },
  alertBadge: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.08)', paddingHorizontal: 10, paddingVertical: 4 },
  alertBadgeText: { fontSize: 10, fontWeight: '800', color: '#0f172a' },
  alertTitle: { marginTop: 10, fontWeight: '800', color: '#0f172a' },
  alertReason: { marginTop: 6, color: '#475569', lineHeight: 18 },
  alertMetric: { marginTop: 8, fontSize: 11, color: '#64748b' },
  empty: { padding: 12, color: '#64748b', fontSize: 13 },
});