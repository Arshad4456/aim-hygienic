import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchIndustryList, fetchIndustryOverview, fetchIndustryPrintData } from '../../api/industryModules';
import { useAuth } from '../../auth/useAuth';
import { APP_CONFIG } from '../../config/app';

function money(value) {
  const amount = Number(value || 0);
  return `PKR ${amount.toLocaleString()}`;
}

function getTotalFromOverview(overview = {}) {
  return overview?.total || overview?.totalSales || overview?.revenue || overview?.salesTotal || overview?.stockValue || overview?.openTickets || overview?.shipments || 0;
}

function getCountFromOverview(overview = {}) {
  return overview?.count || overview?.orders || overview?.salesCount || overview?.tickets || overview?.productionOrders || overview?.totalCompanies || overview?.activeCompanies || 0;
}

function getStatus(item = {}) {
  return item.status || item.requestStatus || item.paymentStatus || item.stage || item.type || 'active';
}

function getTitle(item = {}) {
  return item.name || item.title || item.invoiceNo || item.receiptNo || item.orderNo || item.quotationNo || item.sessionNo || item.productionNo || item.ticketNo || item.shipmentNo || item.lcNo || item.companyName || item.customerName || item.supplierName || item._id || 'Record';
}

function getSubtitle(item = {}) {
  return item.customerName || item.supplierName || item.distributorName || item.productName || item.assignedToName || item.warehouseName || item.createdByName || item.email || item.mobile || item.phone || '-';
}

function MiniKpi({ label, value }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.kpiValue}>{String(value ?? '-')}</Text>
    </View>
  );
}

export default function IndustryWorkspaceScreen({ moduleKey = 'companyAdmin', title = 'ERP Workspace', subtitle = 'Mobile synced workspace', primaryLabel = 'Primary Records', secondaryLabel = 'Secondary Records' }) {
  const { user } = useAuth();
  const [overview, setOverview] = useState({});
  const [primary, setPrimary] = useState([]);
  const [secondary, setSecondary] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const companyName = user?.company?.name || user?.companyName || user?.tenantName || APP_CONFIG.name;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewData, primaryRows, secondaryRows] = await Promise.all([
        fetchIndustryOverview(moduleKey),
        fetchIndustryList(moduleKey, 'primary'),
        fetchIndustryList(moduleKey, 'secondary'),
      ]);
      setOverview(overviewData || {});
      setPrimary(primaryRows.slice(0, 10));
      setSecondary(secondaryRows.slice(0, 10));
    } catch (err) {
      setError(err?.message || 'Unable to load mobile workspace.');
    } finally {
      setLoading(false);
    }
  }, [moduleKey]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => [
    { label: 'Records', value: getCountFromOverview(overview) || primary.length },
    { label: 'Amount / Value', value: money(getTotalFromOverview(overview)) },
    { label: 'Primary', value: primary.length },
    { label: 'Secondary', value: secondary.length },
  ], [overview, primary.length, secondary.length]);

  async function viewPrint(row) {
    const id = row?._id || row?.id;
    if (!id) return;
    try {
      const data = await fetchIndustryPrintData(moduleKey, id);
      setPrintData(data || row);
    } catch (err) {
      setPrintData({ error: err?.message || 'Print data not available.', fallback: row });
    }
  }

  const renderRows = (rows, label) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {!rows.length ? <Text style={styles.emptyText}>No records found.</Text> : rows.map((row, index) => (
        <View key={row?._id || row?.id || `${label}-${index}`} style={styles.rowCard}>
          <View style={styles.rowTextWrap}>
            <Text numberOfLines={1} style={styles.rowTitle}>{getTitle(row)}</Text>
            <Text numberOfLines={1} style={styles.rowSubtitle}>{getSubtitle(row)}</Text>
            <Text style={styles.statusText}>{String(getStatus(row)).toUpperCase()}</Text>
          </View>
          <Pressable style={styles.printBtn} onPress={() => viewPrint(row)}>
            <Text style={styles.printBtnText}>Print</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.hero}>
        <Text style={styles.company}>{companyName}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.kpiGrid}>
        {kpis.map((item) => <MiniKpi key={item.label} label={item.label} value={item.value} />)}
      </View>

      {renderRows(primary, primaryLabel)}
      {renderRows(secondary, secondaryLabel)}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mobile sync status</Text>
        <Text style={styles.note}>This screen reads the same secured API as the web portal. Data is tenant/company scoped by backend JWT and role permissions.</Text>
        <Text style={styles.note}>Use web portal for advanced creation/editing; mobile is optimized for approvals, viewing, POD/document capture, receipts, and field operations.</Text>
      </View>

      {printData ? (
        <View style={styles.printPanel}>
          <View style={styles.printPanelHeader}>
            <Text style={styles.sectionTitle}>Print Preview Data</Text>
            <Pressable onPress={() => setPrintData(null)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
          <Text style={styles.jsonText}>{JSON.stringify(printData, null, 2).slice(0, 2500)}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, gap: 14, paddingBottom: 40 },
  hero: { borderRadius: 18, backgroundColor: '#064e3b', padding: 16 },
  company: { color: '#a7f3d0', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#d1fae5', fontSize: 13, marginTop: 6, lineHeight: 19 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '47%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#fff', padding: 12 },
  kpiLabel: { color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  kpiValue: { color: '#111827', fontSize: 16, fontWeight: '800', marginTop: 6 },
  section: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, backgroundColor: '#fff', padding: 12, gap: 10 },
  sectionTitle: { color: '#111827', fontSize: 16, fontWeight: '800' },
  rowCard: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10, gap: 10 },
  rowTextWrap: { flex: 1 },
  rowTitle: { color: '#111827', fontSize: 14, fontWeight: '800' },
  rowSubtitle: { color: '#6b7280', fontSize: 12, marginTop: 3 },
  statusText: { color: '#047857', fontSize: 11, fontWeight: '800', marginTop: 4 },
  printBtn: { borderRadius: 10, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', paddingHorizontal: 10, paddingVertical: 7 },
  printBtnText: { color: '#047857', fontWeight: '800', fontSize: 12 },
  emptyText: { color: '#6b7280', fontSize: 12 },
  note: { color: '#4b5563', fontSize: 12, lineHeight: 18 },
  errorText: { color: '#b91c1c', fontSize: 12, fontWeight: '700' },
  printPanel: { borderWidth: 1, borderColor: '#d1fae5', borderRadius: 16, backgroundColor: '#ecfdf5', padding: 12 },
  printPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeText: { color: '#047857', fontSize: 12, fontWeight: '800' },
  jsonText: { marginTop: 10, color: '#064e3b', fontSize: 11, lineHeight: 16 },
});
