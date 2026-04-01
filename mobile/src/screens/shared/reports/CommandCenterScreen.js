import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import useCompanyScope from '../../admin/hooks/useCompanyScope';

const PERIODS = [
  ['today', 'Today'],
  ['this_week', 'This week'],
  ['this_month', 'This month'],
  ['quarter', 'Quarter'],
  ['ytd', 'YTD'],
];

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function CommandCenterScreen({ role = 'admin' }) {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany } = useCompanyScope();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [center, setCenter] = useState(null);
  const [detail, setDetail] = useState(null);
  const [selectedSection, setSelectedSection] = useState('overview');
  const [period, setPeriod] = useState('this_month');

  const companyName = useMemo(() => selectedCompany?.name || selectedCompany?.companyName || '', [selectedCompany]);

  const loadAll = async (sectionKey = selectedSection || 'overview') => {
    try {
      setError('');
      const params = { period };
      if (companyDocId) params.companyId = companyDocId;
      if (companyName) params.companyName = companyName;
      const [{ data: centerData }, { data: detailData }] = await Promise.all([
        apiClient.get('/reports/command-center', { params }),
        apiClient.get(`/reports/detail/${sectionKey}`, { params }),
      ]);
      setCenter(centerData || null);
      setDetail(detailData || null);
      if (!selectedSection && centerData?.navigator?.[0]?.key) setSelectedSection(centerData.navigator[0].key);
    } catch (e) {
      setError(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll('overview');
  }, [period, companyDocId, companyName]);

  useEffect(() => {
    if (!center || !selectedSection) return;
    const params = { period };
    if (companyDocId) params.companyId = companyDocId;
    if (companyName) params.companyName = companyName;
    apiClient
      .get(`/reports/detail/${selectedSection}`, { params })
      .then(({ data }) => setDetail(data || null))
      .catch((e) => setError(e.message || 'Failed to load report section'));
  }, [selectedSection]);

  if (loading && !center) return <Loader />;

  const navigator = center?.navigator || [];
  const spotlight = center?.spotlight || [];
  const alerts = center?.alerts || [];
  const leaderboards = center?.leaderboards || {};
  const recentActivity = center?.recentActivity || [];
  const sectionPreview = center?.sectionsPreview || [];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(selectedSection); }} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>AIM ERP • REPORTS</Text>
        <Text style={styles.heroTitle}>{center?.hero?.title || 'Professional Reports Command Center'}</Text>
        <Text style={styles.heroSubtitle}>{center?.hero?.subtitle || 'Professional business reporting for mobile decision-making.'}</Text>
        <View style={styles.heroMetaWrap}>
          <MetaPill text={`Scope • ${center?.scopeLabel || 'Current scope'}`} />
          <MetaPill text={`Role • ${center?.roleScope || role}`} />
          <MetaPill text={`Period • ${center?.periodLabel || 'This month'}`} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {PERIODS.map(([value, label]) => {
            const active = value === period;
            return (
              <Pressable key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => setPeriod(value)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {canSelectCompany && companies.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable style={[styles.chip, !companyDocId && styles.chipActive]} onPress={() => setCompanyDocId('')}>
              <Text style={[styles.chipText, !companyDocId && styles.chipTextActive]}>All companies</Text>
            </Pressable>
            {companies.slice(0, 12).map((company) => {
              const value = company._id || company.companyId;
              const label = company.name || company.companyName || company.companyId || value;
              const active = value === companyDocId;
              return (
                <Pressable key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => setCompanyDocId(value)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {error ? (
        <Card style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></Card>
      ) : null}

      <View style={styles.metricsWrap}>
        {spotlight.map((item) => (
          <Card key={item.key || item.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
            <Text style={styles.metricHelper}>{item.helper}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Navigator</Text>
        <Text style={styles.sectionSubtitle}>Open focused reports for sales, inventory, customers, team performance, delivery, expenses, and area analysis.</Text>
        <View style={styles.navigatorWrap}>
          {navigator.map((item) => {
            const active = selectedSection === item.key;
            return (
              <Pressable key={item.key} style={[styles.navCard, active && styles.navCardActive]} onPress={() => setSelectedSection(item.key)}>
                <View style={styles.navBadge}><Text style={styles.navBadgeText}>{item.audience === 'admin' ? 'Admin' : 'Business'}</Text></View>
                <Text style={[styles.navTitle, active && styles.navTitleActive]}>{item.title}</Text>
                <Text style={styles.navCaption}>{item.caption}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{detail?.title || 'Detail view'}</Text>
        <Text style={styles.sectionSubtitle}>{detail?.subtitle || 'Role-aware mobile detail view.'}</Text>
        <View style={styles.detailCardsWrap}>
          {(detail?.cards || []).map((item) => (
            <View key={item.label} style={styles.detailCard}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value}</Text>
              <Text style={styles.detailHelper}>{item.helper}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Insights</Text>
        <Text style={styles.sectionSubtitle}>Short management takeaways for the selected report.</Text>
        <View style={styles.stackWrap}>
          {(detail?.insights || center?.insights || []).map((item, index) => (
            <View key={`${item}-${index}`} style={styles.infoCard}>
              <Text style={styles.infoText}>{item}</Text>
            </View>
          ))}
          {!(detail?.insights || center?.insights || []).length ? <Text style={styles.emptyText}>No insight summary available.</Text> : null}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Critical watchlist</Text>
        <Text style={styles.sectionSubtitle}>Overdue, low-stock, POD, return, and pending-order alerts.</Text>
        <View style={styles.stackWrap}>
          {alerts.length ? alerts.map((item, index) => (
            <View key={`${item.title}-${index}`} style={[styles.alertCard, item.severity === 'critical' ? styles.alertCritical : item.severity === 'warning' ? styles.alertWarning : styles.alertInfo]}>
              <Text style={styles.alertTitle}>{item.title}</Text>
              <Text style={styles.alertDesc}>{item.description}</Text>
              <Text style={styles.alertMeta}>{item.meta}</Text>
            </View>
          )) : <Text style={styles.emptyText}>No active watchlist items.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Detailed rows</Text>
        <Text style={styles.sectionSubtitle}>Simplified row layout for mobile readability.</Text>
        <View style={styles.stackWrap}>
          {(detail?.rows || []).length ? detail.rows.map((row, rowIndex) => (
            <View key={`${selectedSection}-${rowIndex}`} style={styles.rowCard}>
              {(detail?.columns || []).map((column, columnIndex) => (
                <View key={`${rowIndex}-${columnIndex}`} style={styles.rowItem}>
                  <Text style={styles.rowLabel}>{column}</Text>
                  <Text style={styles.rowValue}>{row[columnIndex] ?? '—'}</Text>
                </View>
              ))}
            </View>
          )) : <Text style={styles.emptyText}>No rows available in this scope.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Business highlights</Text>
        <Text style={styles.sectionSubtitle}>Quick mobile summaries across revenue, stock, recovery, returns, delivery, and expense control.</Text>
        <View style={styles.stackWrap}>
          {sectionPreview.map((item) => (
            <View key={item.key} style={styles.infoCard}>
              <Text style={styles.infoTitle}>{item.title}</Text>
              {item.points.map((point) => <Text key={point} style={styles.infoText}>• {point}</Text>)}
            </View>
          ))}
        </View>
      </Card>

      {[['Top territories', leaderboards.territories || []], ['Top customers', leaderboards.customers || []], ...(role === 'distributor' ? [] : [['Top distributors', leaderboards.distributors || []]]), ['Top field team', leaderboards.salesmen || []], ['Recent activity', recentActivity || []]].map(([title, rows]) => (
        <Card key={title}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.stackWrap}>
            {rows.length ? rows.map((row, index) => (
              <View key={`${title}-${row.label || row.id || index}`} style={styles.infoCard}>
                <Text style={styles.infoTitle}>{row.label || row.title}</Text>
                {'amount' in row ? <Text style={styles.infoText}>Revenue • {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(row.amount || 0))}</Text> : null}
                {'orders' in row ? <Text style={styles.infoText}>Orders • {row.orders}</Text> : null}
                {'customers' in row ? <Text style={styles.infoText}>Customers • {row.customers}</Text> : null}
                {row.meta ? <Text style={styles.infoText}>{row.meta}</Text> : null}
                {row.at ? <Text style={styles.infoMeta}>{formatDateTime(row.at)}</Text> : null}
              </View>
            )) : <Text style={styles.emptyText}>No data available.</Text>}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

function MetaPill({ text }) {
  return (
    <View style={styles.metaPill}><Text style={styles.metaPillText}>{text}</Text></View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 28, gap: 12 },
  hero: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0b1120',
    gap: 12,
  },
  heroEyebrow: { color: '#a5b4fc', fontSize: 11, fontWeight: '700', letterSpacing: 2.2 },
  heroTitle: { color: '#fff', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  heroSubtitle: { color: '#cbd5e1', fontSize: 15, lineHeight: 24 },
  heroMetaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8 },
  metaPillText: { color: '#e5e7eb', fontSize: 12 },
  chipRow: { gap: 8, paddingTop: 2 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#111827' },
  errorCard: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  errorText: { color: '#be123c', fontSize: 13 },
  metricsWrap: { gap: 12 },
  metricCard: { borderRadius: 22 },
  metricLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4 },
  metricValue: { color: '#020617', fontSize: 28, fontWeight: '800', marginTop: 10 },
  metricHelper: { color: '#64748b', fontSize: 13, lineHeight: 20, marginTop: 8 },
  sectionTitle: { color: '#020617', fontSize: 22, fontWeight: '800' },
  sectionSubtitle: { color: '#64748b', fontSize: 14, lineHeight: 22, marginTop: 6 },
  navigatorWrap: { gap: 10, marginTop: 14 },
  navCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 22, backgroundColor: '#f8fafc', padding: 14 },
  navCardActive: { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
  navBadge: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: '#d4d4d8', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fff' },
  navBadgeText: { color: '#52525b', fontSize: 11, fontWeight: '700' },
  navTitle: { marginTop: 10, color: '#020617', fontSize: 16, fontWeight: '700' },
  navTitleActive: { color: '#3730a3' },
  navCaption: { color: '#64748b', fontSize: 13, lineHeight: 20, marginTop: 4 },
  detailCardsWrap: { gap: 10, marginTop: 14 },
  detailCard: { borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  detailLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4 },
  detailValue: { color: '#020617', fontSize: 24, fontWeight: '800', marginTop: 10 },
  detailHelper: { color: '#64748b', fontSize: 13, lineHeight: 20, marginTop: 8 },
  stackWrap: { gap: 10, marginTop: 14 },
  infoCard: { borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  infoTitle: { color: '#020617', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  infoText: { color: '#475569', fontSize: 13, lineHeight: 20 },
  infoMeta: { marginTop: 8, color: '#94a3b8', fontSize: 11 },
  alertCard: { borderRadius: 20, borderWidth: 1, padding: 14 },
  alertCritical: { borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
  alertWarning: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  alertInfo: { borderColor: '#bae6fd', backgroundColor: '#f0f9ff' },
  alertTitle: { color: '#020617', fontSize: 14, fontWeight: '800' },
  alertDesc: { color: '#475569', fontSize: 13, lineHeight: 20, marginTop: 6 },
  alertMeta: { color: '#94a3b8', fontSize: 11, marginTop: 8, textTransform: 'uppercase' },
  rowCard: { borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 10 },
  rowItem: { gap: 4 },
  rowLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.1 },
  rowValue: { color: '#111827', fontSize: 14, lineHeight: 20 },
  emptyText: { color: '#64748b', fontSize: 13, marginTop: 4 },
});
