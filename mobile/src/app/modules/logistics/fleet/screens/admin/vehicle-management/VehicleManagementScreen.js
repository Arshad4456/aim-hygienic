import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';
import Loader from '../../../../../../foundation/ui/Loader';

const PAGE_SIZE = 20;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getTodayInput() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStartInput() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function paginateRows(rows = [], page = 1) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return { page: safePage, totalPages, rows: rows.slice(start, start + PAGE_SIZE) };
}

function formatAmount(v) {
  return toNumber(v).toLocaleString();
}

function toneForKpi(value) {
  if (value > 0) return styles.kpiEmerald;
  if (value < 0) return styles.kpiRose;
  return styles.kpiNeutral;
}

export default function VehicleManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState(getMonthStartInput());
  const [toDate, setToDate] = useState(getTodayInput());
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const [fuelPage, setFuelPage] = useState(1);
  const [efficiencyPage, setEfficiencyPage] = useState(1);
  const [personalPage, setPersonalPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);

  const loadOverview = useCallback(async (silent = false, fromOverride, toOverride) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      setErr('');
      const from = fromOverride ?? fromDate;
      const to = toOverride ?? toDate;
      const query = new URLSearchParams();
      if (from) query.set('from', from);
      if (to) query.set('to', to);
      const res = await apiClient.get(`/vehicle-management/overview${query.toString() ? `?${query.toString()}` : ''}`);
      setData(res?.data || null);
    } catch (error) {
      setErr(error?.message || 'Failed to load vehicle overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const k = data?.kpis || {};
  const b = data?.breakdowns || {};
  const insights = data?.insights || {};
  const alerts = data?.alerts || [];

  useEffect(() => {
    setFuelPage(1);
    setEfficiencyPage(1);
    setPersonalPage(1);
    setAlertsPage(1);
  }, [insights.topFuelVehicles?.length, insights.lowEfficiencyVehicles?.length, insights.topPersonalUsageVehicles?.length, alerts.length]);

  const personalRatio = useMemo(() => {
    const total = toNumber(k.totalKm);
    if (!total) return 0;
    return (toNumber(k.personalKm) / total) * 100;
  }, [k.totalKm, k.personalKm]);

  const utilization = useMemo(() => {
    const total = toNumber(k.totalVehicles);
    if (!total) return 0;
    return (toNumber(k.activeVehicles) / total) * 100;
  }, [k.totalVehicles, k.activeVehicles]);

  const avgFuelCostPerLiter = useMemo(() => {
    const liters = toNumber(k.totalFuel);
    if (!liters) return 0;
    return toNumber(k.fuelCost) / liters;
  }, [k.totalFuel, k.fuelCost]);

  const maintenanceEntries = useMemo(
    () => (b.maintenanceByType || []).reduce((sum, row) => sum + toNumber(row.count), 0),
    [b.maintenanceByType]
  );

  const avgMaintenanceCost = useMemo(() => {
    if (!maintenanceEntries) return 0;
    return toNumber(k.maintenanceCost) / maintenanceEntries;
  }, [k.maintenanceCost, maintenanceEntries]);

  const fuelRows = (insights.topFuelVehicles || []).map((v) => [v.registrationNo || '-', v.assignedUserName || '-', toNumber(v.refuelLiters).toFixed(1), formatAmount(v.refuelCost)]);
  const efficiencyRows = (insights.lowEfficiencyVehicles || []).map((v) => [v.registrationNo || '-', toNumber(v.distance).toFixed(0), toNumber(v.refuelLiters).toFixed(1), toNumber(v.efficiency).toFixed(2)]);
  const personalRows = (insights.topPersonalUsageVehicles || []).map((v) => [v.registrationNo || '-', toNumber(v.personalKm).toFixed(0), toNumber(v.distance).toFixed(0), `${toNumber(v.personalRatio).toFixed(1)}%`]);

  const fuelPageData = paginateRows(fuelRows, fuelPage);
  const efficiencyPageData = paginateRows(efficiencyRows, efficiencyPage);
  const personalPageData = paginateRows(personalRows, personalPage);
  const alertsPageData = paginateRows(alerts, alertsPage);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Vehicle Management</Text>
        <Text style={styles.subtitle}>Complete vehicle performance, fuel, maintenance and anomaly overview.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <View style={styles.filters}>
          <View style={styles.inputWrap}><Text style={styles.label}>From</Text><TextInput style={styles.input} value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" /></View>
          <View style={styles.inputWrap}><Text style={styles.label}>To</Text><TextInput style={styles.input} value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" /></View>
          <Pressable style={styles.refreshBtn} onPress={() => loadOverview(false)}><Text style={styles.refreshText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text></Pressable>
        </View>
      </Card>

      <View style={styles.kpiGrid}>
        <KpiCard title="Total Vehicles" value={toNumber(k.totalVehicles)} subtitle="All registered vehicles" />
        <KpiCard title="Active Vehicles" value={toNumber(k.activeVehicles)} subtitle={`${utilization.toFixed(1)}% utilization`} tone={toneForKpi(utilization - 60)} />
        <KpiCard title="Total KM" value={toNumber(k.totalKm).toFixed(0)} subtitle="Distance in selected range" />
        <KpiCard title="Personal KM" value={toNumber(k.personalKm).toFixed(0)} subtitle={`${personalRatio.toFixed(1)}% of total`} tone={toneForKpi(personalRatio - 20)} />
        <KpiCard title="Fuel (L)" value={toNumber(k.totalFuel).toFixed(1)} subtitle={`Avg cost/L: ${avgFuelCostPerLiter.toFixed(2)}`} />
        <KpiCard title="Fuel Cost" value={formatAmount(k.fuelCost)} subtitle="Total fuel spend" />
        <KpiCard title="Maintenance Cost" value={formatAmount(k.maintenanceCost)} subtitle={`Avg/entry: ${avgMaintenanceCost.toFixed(2)}`} />
        <KpiCard title="Maintenance Entries" value={maintenanceEntries} subtitle="By maintenance type" />
      </View>

      <TablePanel title="Top 10 Fuel Consuming Vehicles" columns={['Vehicle', 'Assigned To', 'Fuel (L)', 'Fuel Cost']} rows={fuelPageData.rows} page={fuelPageData.page} totalPages={fuelPageData.totalPages} onFirst={() => setFuelPage(1)} onPrev={() => setFuelPage((p) => Math.max(1, p - 1))} onNext={() => setFuelPage((p) => Math.min(fuelPageData.totalPages, p + 1))} onEnd={() => setFuelPage(fuelPageData.totalPages)} />
      <TablePanel title="Top 10 Lowest Efficiency Vehicles" columns={['Vehicle', 'KM', 'Fuel (L)', 'KM/L']} rows={efficiencyPageData.rows} page={efficiencyPageData.page} totalPages={efficiencyPageData.totalPages} onFirst={() => setEfficiencyPage(1)} onPrev={() => setEfficiencyPage((p) => Math.max(1, p - 1))} onNext={() => setEfficiencyPage((p) => Math.min(efficiencyPageData.totalPages, p + 1))} onEnd={() => setEfficiencyPage(efficiencyPageData.totalPages)} />
      <TablePanel title="Top 10 Personal Usage Vehicles" columns={['Vehicle', 'Personal KM', 'Total KM', 'Personal Ratio']} rows={personalPageData.rows} page={personalPageData.page} totalPages={personalPageData.totalPages} onFirst={() => setPersonalPage(1)} onPrev={() => setPersonalPage((p) => Math.max(1, p - 1))} onNext={() => setPersonalPage((p) => Math.min(personalPageData.totalPages, p + 1))} onEnd={() => setPersonalPage(personalPageData.totalPages)} />

      <Card>
        <Text style={styles.sectionTitle}>Policy Insights</Text>
        <Text style={styles.metaRow}>Personal KM ratio: {personalRatio.toFixed(1)}%</Text>
        <Text style={styles.metaRow}>Maintenance entries: {maintenanceEntries}</Text>
        <Text style={styles.metaRow}>Fuel trend points: {(b.fuelTrendByDay || []).length}</Text>
        <Text style={styles.metaRow}>Maintenance trend points: {(b.maintenanceTrendByDay || []).length}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Fraud / Anomaly Alerts</Text>
        <Text style={styles.subtitle}>Sudden jumps, missing proofs, high personal usage, and low fuel efficiency flags.</Text>
        {(alertsPageData.rows || []).map((a, i) => (
          <View key={`${a.type || 'alert'}-${i}-${alertsPageData.page}`} style={styles.alertCard}>
            <Text style={styles.alertType}>{String(a.type || '-').replace(/_/g, ' ')}</Text>
            <Text style={styles.alertMsg}>{a.message || '-'}</Text>
            {a.vehicleLabel ? <Text style={styles.alertDetail}>Vehicle: {a.vehicleLabel}</Text> : null}
          </View>
        ))}
        {!alerts.length ? <Text style={styles.ok}>No alerts in selected range.</Text> : null}
        <Pager page={alertsPageData.page} totalPages={alertsPageData.totalPages} onFirst={() => setAlertsPage(1)} onPrev={() => setAlertsPage((p) => Math.max(1, p - 1))} onNext={() => setAlertsPage((p) => Math.min(alertsPageData.totalPages, p + 1))} onEnd={() => setAlertsPage(alertsPageData.totalPages)} />
      </Card>
    </ScrollView>
  );
}

function KpiCard({ title, value, subtitle, tone }) {
  return (
    <Card style={[styles.kpiCard, tone || styles.kpiNeutral]}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSub}>{subtitle}</Text>
    </Card>
  );
}

function TablePanel({ title, columns, rows, page, totalPages, onFirst, onPrev, onNext, onEnd }) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.tableWrap}>
          <View style={styles.headerRow}>{columns.map((c) => <Text key={c} style={[styles.tCell, styles.tHead]}>{c}</Text>)}</View>
          {!rows.length ? <Text style={styles.empty}>No data</Text> : rows.map((row, idx) => <View key={`${title}-${idx}`} style={styles.row}>{row.map((cell, cidx) => <Text key={`${idx}-${cidx}`} style={styles.tCell}>{String(cell)}</Text>)}</View>)}
        </View>
      </ScrollView>
      <Pager page={page} totalPages={totalPages} onFirst={onFirst} onPrev={onPrev} onNext={onNext} onEnd={onEnd} />
    </Card>
  );
}

function Pager({ page, totalPages, onFirst, onPrev, onNext, onEnd }) {
  return (
    <View style={styles.pager}>
      <Text style={styles.pagerText}>Page {page} of {totalPages}</Text>
      <View style={styles.pagerBtns}>
        <PagerBtn label="Start" onPress={onFirst} disabled={page <= 1} />
        <PagerBtn label="Previous" onPress={onPrev} disabled={page <= 1} />
        <PagerBtn label="Next" onPress={onNext} disabled={page >= totalPages} />
        <PagerBtn label="End" onPress={onEnd} disabled={page >= totalPages} />
      </View>
    </View>
  );
}

function PagerBtn({ label, onPress, disabled }) {
  return <Pressable style={[styles.pagerBtn, disabled ? styles.disabled : null]} disabled={disabled} onPress={onPress}><Text style={styles.pagerBtnText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8', gap: 10, paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 5, color: '#6b7280', fontSize: 12 },
  error: { marginTop: 8, color: '#b91c1c', fontSize: 12 },
  filters: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  inputWrap: { minWidth: 120, flex: 1 },
  label: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, fontSize: 12 },
  refreshBtn: { borderWidth: 1, borderColor: '#2563eb', backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  refreshText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  kpiGrid: { gap: 8 },
  kpiCard: { borderWidth: 1 },
  kpiNeutral: { borderColor: '#e5e7eb' },
  kpiEmerald: { borderColor: '#86efac', backgroundColor: '#ecfdf5' },
  kpiRose: { borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
  kpiTitle: { fontSize: 11, color: '#6b7280' },
  kpiValue: { marginTop: 4, fontSize: 20, fontWeight: '700', color: '#111827' },
  kpiSub: { marginTop: 2, fontSize: 11, color: '#374151' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  tableWrap: { minWidth: 560, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  headerRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  tCell: { width: 140, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  tHead: { fontWeight: '700' },
  empty: { padding: 10, color: '#6b7280', fontSize: 12 },
  pager: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pagerText: { fontSize: 11, color: '#6b7280' },
  pagerBtns: { flexDirection: 'row', gap: 6 },
  pagerBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff' },
  pagerBtnText: { fontSize: 11, fontWeight: '600', color: '#111827' },
  disabled: { opacity: 0.5 },
  metaRow: { marginTop: 6, fontSize: 12, color: '#374151' },
  alertCard: { marginTop: 8, borderWidth: 1, borderColor: '#fecdd3', borderRadius: 10, backgroundColor: '#fff1f2', padding: 10 },
  alertType: { fontSize: 10, textTransform: 'uppercase', color: '#9f1239', fontWeight: '700' },
  alertMsg: { marginTop: 4, fontSize: 12, color: '#881337' },
  alertDetail: { marginTop: 4, fontSize: 11, color: '#9f1239' },
  ok: { marginTop: 10, color: '#166534', fontSize: 12 },
});