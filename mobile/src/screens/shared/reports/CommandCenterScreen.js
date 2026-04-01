import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function CommandCenterScreen({ role = 'admin' }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [center, setCenter] = useState(null);
  const [selectedSection, setSelectedSection] = useState('overview');
  const [detail, setDetail] = useState(null);

  const isDistributor = role === 'distributor';

  async function loadCenter() {
    setError('');
    const { data } = await apiClient.get('/reports/command-center');
    setCenter(data || null);
    if (!selectedSection && data?.navigator?.[0]?.key) setSelectedSection(data.navigator[0].key);
  }

  async function loadDetail(sectionKey) {
    if (!sectionKey) return;
    const { data } = await apiClient.get(`/reports/detail/${sectionKey}`);
    setDetail(data || null);
  }

  async function loadAll(sectionKey = selectedSection || 'overview') {
    try {
      await loadCenter();
      await loadDetail(sectionKey);
    } catch (e) {
      setError(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll('overview');
  }, []);

  useEffect(() => {
    if (!selectedSection) return;
    loadDetail(selectedSection).catch((e) => setError(e.message || 'Failed to load section'));
  }, [selectedSection]);

  const rosterCounts = center?.roster?.counts || {};
  const navigator = center?.navigator || [];
  const spotlight = center?.spotlight || [];

  const pills = useMemo(() => {
    return [
      { label: 'Active users', value: rosterCounts.activeUsers || 0 },
      { label: 'Customers', value: rosterCounts.customers || 0 },
      { label: 'Salesmen', value: rosterCounts.salesmen || 0 },
      { label: 'Order bookers', value: rosterCounts.orderBookers || 0 },
      ...(isDistributor ? [] : [{ label: 'Suppliers', value: rosterCounts.suppliers || 0 }]),
    ];
  }, [rosterCounts, isDistributor]);

  if (loading) return <Loader />;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(selectedSection); }} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>AIM ERP • REPORTS</Text>
        <Text style={styles.heroTitle}>{center?.hero?.title || 'Reports Command Center'}</Text>
        <Text style={styles.heroSubtitle}>{center?.hero?.subtitle || 'Role-aware reporting with stronger visibility.'}</Text>
        <View style={styles.heroMetaWrap}>
          <MetaPill text={`Scope • ${center?.scopeLabel || 'AIM Hygienic'}`} />
          <MetaPill text={`Role • ${center?.roleScope || role}`} />
          <MetaPill text={`Updated • ${formatDateTime(center?.generatedAt)}`} />
        </View>
      </View>

      {error ? (
        <Card style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></Card>
      ) : null}

      <View style={styles.metricsWrap}>
        {spotlight.slice(0, 6).map((item) => (
          <Card key={item.key || item.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
            <Text style={styles.metricHelper}>{item.helper}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Navigator</Text>
        <Text style={styles.sectionSubtitle}>Tap a reporting module to see focused detail.</Text>
        <View style={styles.navigatorWrap}>
          {navigator.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.navCard, selectedSection === item.key && styles.navCardActive]}
              onPress={() => setSelectedSection(item.key)}
            >
              <View style={styles.navIndex}><Text style={styles.navIndexText}>{String(navigator.findIndex((nav) => nav.key === item.key) + 1).padStart(2, '0')}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.navTitle, selectedSection === item.key && styles.navTitleActive]}>{item.title}</Text>
                <Text style={styles.navCaption}>{item.caption}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{detail?.title || 'Detail view'}</Text>
        <Text style={styles.sectionSubtitle}>{detail?.subtitle || 'Detailed module view.'}</Text>
        <View style={styles.pillWrap}>
          {pills.map((item) => (
            <View key={item.label} style={styles.countPill}>
              <Text style={styles.countLabel}>{item.label}</Text>
              <Text style={styles.countValue}>{item.value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.detailCardsWrap}>
          {(detail?.cards || []).slice(0, 6).map((item) => (
            <View key={item.label} style={styles.detailCard}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value}</Text>
              <Text style={styles.detailHelper}>{item.helper}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Detailed rows</Text>
        <Text style={styles.sectionSubtitle}>Scrolled and simplified for mobile readability.</Text>
        <View style={styles.rowsWrap}>
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
  },
  heroEyebrow: { color: '#a5b4fc', fontSize: 11, fontWeight: '700', letterSpacing: 2.2 },
  heroTitle: { color: '#fff', fontSize: 28, lineHeight: 34, fontWeight: '800', marginTop: 10 },
  heroSubtitle: { color: '#cbd5e1', fontSize: 15, lineHeight: 24, marginTop: 10 },
  heroMetaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  metaPill: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8 },
  metaPillText: { color: '#e5e7eb', fontSize: 12 },
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
  navCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 22, backgroundColor: '#f8fafc', padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  navCardActive: { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
  navIndex: { width: 46, height: 46, borderRadius: 999, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  navIndexText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  navTitle: { color: '#020617', fontSize: 16, fontWeight: '700' },
  navTitleActive: { color: '#3730a3' },
  navCaption: { color: '#64748b', fontSize: 13, lineHeight: 20, marginTop: 4 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  countPill: { borderRadius: 18, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10, minWidth: 116 },
  countLabel: { color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.1 },
  countValue: { color: '#020617', fontSize: 18, fontWeight: '800', marginTop: 6 },
  detailCardsWrap: { gap: 10, marginTop: 14 },
  detailCard: { borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  detailLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4 },
  detailValue: { color: '#020617', fontSize: 24, fontWeight: '800', marginTop: 10 },
  detailHelper: { color: '#64748b', fontSize: 13, lineHeight: 20, marginTop: 8 },
  rowsWrap: { gap: 10, marginTop: 14 },
  rowCard: { borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 10 },
  rowItem: { gap: 4 },
  rowLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  rowValue: { color: '#0f172a', fontSize: 14, lineHeight: 22 },
  emptyText: { color: '#64748b', fontSize: 13, paddingVertical: 8 },
});