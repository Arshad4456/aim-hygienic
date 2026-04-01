import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';
import useCompanyScope from '../../admin/hooks/useCompanyScope';

function formatValue(value, format) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return format === 'currency' ? `₨ ${num.toLocaleString()}` : num.toLocaleString();
}

const TONE = {
  emerald: { bg: '#ecfdf5', text: '#047857' },
  sky: { bg: '#eff6ff', text: '#0369a1' },
  amber: { bg: '#fffbeb', text: '#b45309' },
  rose: { bg: '#fff1f2', text: '#be123c' },
  violet: { bg: '#f5f3ff', text: '#6d28d9' },
  zinc: { bg: '#f4f4f5', text: '#3f3f46' },
};

export default function ReportsCenterScreen({ navigation, variant = 'admin' }) {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany } = useCompanyScope();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (variant !== 'admin') return;
    if (canSelectCompany && !companyDocId && companies.length) {
      setCompanyDocId(companies[0]._id || companies[0].companyId || '');
    }
  }, [variant, canSelectCompany, companyDocId, companies, setCompanyDocId]);

  const companyId = variant === 'admin' ? (selectedCompany?._id || selectedCompany?.companyId || '') : '';
  const companyName = variant === 'admin' ? (selectedCompany?.name || selectedCompany?.companyName || '') : '';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (companyId) params.set('companyId', companyId);
      if (companyName) params.set('companyName', companyName);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const res = await apiClient.get(`/reports/dashboard${suffix}`);
      setDashboard(res?.data || null);
    } catch (e) {
      setError(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [companyId, companyName, variant]);

  const cards = dashboard?.cards || [];
  const kpis = dashboard?.kpis || [];
  const activity = dashboard?.recentActivity || [];
  const spotlight = dashboard?.spotlight || {};

  const compactRows = useMemo(() => {
    const source = variant === 'distributor' ? (spotlight.regionalSales || []) : (spotlight.expenseCategories || []);
    return source.slice(0, 6);
  }, [spotlight, variant]);

  if (loading && !dashboard) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{dashboard?.hero?.eyebrow || 'Business intelligence workspace'}</Text>
            <Text style={styles.title}>{dashboard?.hero?.title || 'Reports Command Center'}</Text>
            <Text style={styles.subtitle}>{dashboard?.hero?.description || 'Professional reporting for the selected scope.'}</Text>
          </View>
          <Pressable onPress={load} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.scopeCard}>
          <Text style={styles.scopeLabel}>Scope</Text>
          <Text style={styles.scopeValue}>{dashboard?.scope?.label || 'Current business scope'}</Text>
        </View>

        {variant === 'admin' && canSelectCompany ? (
          <View style={styles.companyWrap}>
            <Text style={styles.companyLabel}>Company</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companyList}>
              {companies.map((company) => {
                const value = company._id || company.companyId;
                const active = value === companyDocId;
                return (
                  <Pressable key={value} style={[styles.companyChip, active ? styles.companyChipActive : null]} onPress={() => setCompanyDocId(value)}>
                    <Text style={[styles.companyChipText, active ? styles.companyChipTextActive : null]}>{company.name || company.companyName || company.companyId || value}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {error ? <Text style={styles.err}>{error}</Text> : null}
      </Card>

      <View style={styles.metricsWrap}>
        {kpis.map((item) => {
          const tone = TONE[item.tone] || TONE.zinc;
          return (
            <View key={item.key} style={styles.metricCard}>
              <View style={[styles.metricDot, { backgroundColor: tone.text }]} />
              <Text style={styles.metricLabel}>{item.label}</Text>
              <Text style={styles.metricValue}>{formatValue(item.value, item.format)}</Text>
              <Text style={styles.metricHint}>{item.helper}</Text>
            </View>
          );
        })}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Report Navigator</Text>
        <Text style={styles.sectionHint}>Open detailed business views designed for operational decision making.</Text>
        <View style={styles.navigatorWrap}>
          {cards.map((card) => (
            <Pressable
              key={card.key}
              style={styles.navigatorCard}
              onPress={() => {
                if (variant === 'admin') {
                  const route = {
                    sales: 'admin:reports/sales',
                    inventory: 'admin:reports/inventory',
                    finance: 'admin:reports/finance',
                    hr: 'admin:reports/hr',
                    logistics: 'admin:reports/logistics',
                    compliance: 'admin:reports/compliance',
                  }[card.key];
                  if (route) navigation?.navigate?.(route);
                }
              }}
            >
              <Text style={styles.navigatorBadge}>{card.badge}</Text>
              <Text style={styles.navigatorTitle}>{card.title}</Text>
              <Text style={styles.navigatorDesc}>{card.description}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{variant === 'distributor' ? 'Territory highlights' : 'Executive highlights'}</Text>
        <Text style={styles.sectionHint}>{variant === 'distributor' ? 'A compact operational snapshot for distributor decisions.' : 'Use these quick views before drilling into department reports.'}</Text>
        <View style={styles.tableWrap}>
          {compactRows.length ? compactRows.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCellStrong}>{row.label || row.category}</Text>
              <Text style={styles.tableCell}>{formatValue(row.value || row.orders, row.value ? 'currency' : undefined)}</Text>
            </View>
          )) : <Text style={styles.empty}>No highlights available.</Text>}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Text style={styles.sectionHint}>Latest order, collection, and expense signals visible in this scope.</Text>
        <View style={styles.activityWrap}>
          {activity.length ? activity.map((item) => (
            <View key={item.id} style={styles.activityCard}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityMeta}>{item.meta}</Text>
              <Text style={styles.activityDate}>{new Date(item.at).toLocaleString()}</Text>
            </View>
          )) : <Text style={styles.empty}>No recent activity found.</Text>}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 28, gap: 12 },
  heroTop: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  eyebrow: { fontSize: 11, fontWeight: '700', color: '#047857', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { marginTop: 6, fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, color: '#6b7280', lineHeight: 20 },
  refreshBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', backgroundColor: '#fafafa' },
  refreshText: { fontWeight: '700', color: '#111827' },
  scopeCard: { marginTop: 14, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 16, backgroundColor: '#fafafa', padding: 12 },
  scopeLabel: { fontSize: 11, textTransform: 'uppercase', color: '#71717a', fontWeight: '700' },
  scopeValue: { marginTop: 4, fontSize: 14, color: '#111827', fontWeight: '700' },
  companyWrap: { marginTop: 14 },
  companyLabel: { fontSize: 11, textTransform: 'uppercase', color: '#71717a', fontWeight: '700' },
  companyList: { gap: 8, paddingTop: 8 },
  companyChip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fafafa' },
  companyChipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  companyChipText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  companyChipTextActive: { color: '#047857' },
  err: { marginTop: 12, color: '#b91c1c' },
  metricsWrap: { gap: 10 },
  metricCard: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 18, backgroundColor: '#fff', padding: 14 },
  metricDot: { width: 10, height: 10, borderRadius: 999, marginBottom: 8 },
  metricLabel: { fontSize: 12, color: '#6b7280', fontWeight: '700' },
  metricValue: { marginTop: 6, fontSize: 26, fontWeight: '800', color: '#111827' },
  metricHint: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sectionHint: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  navigatorWrap: { marginTop: 12, gap: 10 },
  navigatorCard: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 18, backgroundColor: '#fff', padding: 14 },
  navigatorBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, color: '#52525b', fontSize: 11, fontWeight: '700' },
  navigatorTitle: { marginTop: 10, fontSize: 15, fontWeight: '800', color: '#111827' },
  navigatorDesc: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  tableWrap: { marginTop: 12, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 18, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableCellStrong: { color: '#111827', fontWeight: '700', flex: 1, paddingRight: 12 },
  tableCell: { color: '#52525b', fontWeight: '600' },
  activityWrap: { marginTop: 12, gap: 10 },
  activityCard: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 16, backgroundColor: '#fafafa', padding: 12 },
  activityTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  activityMeta: { marginTop: 4, color: '#6b7280', fontSize: 12 },
  activityDate: { marginTop: 6, color: '#9ca3af', fontSize: 11 },
  empty: { marginTop: 10, color: '#6b7280', fontSize: 12 },
});