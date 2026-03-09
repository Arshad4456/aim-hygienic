import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

const MODULE_CARDS = [
  { key: 'PURCHASING_STOCK', title: '1 Purchase Stock', subtitle: 'Create and manage purchasing stock transactions.', route: 'admin:inventory/purchase-stock' },
  { key: 'SALE_STOCK', title: '2 Sale Stock', subtitle: 'Manage outbound sale stock movement and approvals.', route: 'admin:inventory/sale-stock' },
  { key: 'DAMAGE_STOCK', title: '3 Damage Stock', subtitle: 'Track damaged inventory with reason and quantities.', route: 'admin:inventory/damage-stock' },
  { key: 'RETURN_STOCK', title: '4 Return Stock', subtitle: 'Manage inbound return stock records and actions.', route: 'admin:inventory/return-stock' },
  { key: 'W2W_TRANSFER', title: '5 Warehouse to Warehouse Transfer', subtitle: 'Plan and track stock transfers between warehouses.', route: 'admin:inventory/transfers' },
  { key: 'STOCK_SUMMARY', title: '6 Stock Summary', subtitle: 'Monitor current stock by product and warehouse.', route: 'admin:inventory/summary' },
  { key: 'LOW_STOCK', title: '7 Low Stock Alert', subtitle: 'Identify SKUs below configured minimum stock.', route: 'admin:inventory/low-stock' },
  { key: 'INVENTORY_LEDGER', title: '8 Inventory Ledger', subtitle: 'Audit inventory movement history and adjustments.', route: 'admin:inventory/ledger' },
];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(v) {
  return new Intl.NumberFormat('en-US').format(num(v));
}

export default function WarehouseInventoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [summary, setSummary] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [transfers, setTransfers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [summaryRes, lowStockRes, movementRes, transferRes] = await Promise.all([
        apiClient.get('/inventory/summary'),
        apiClient.get('/inventory/low-stock'),
        apiClient.get('/inventory/movements?limit=50'),
        apiClient.get('/inventory/transfers'),
      ]);
      setSummary(summaryRes.data?.summary || summaryRes.data?.rows || []);
      setLowStock(lowStockRes.data?.items || lowStockRes.data?.rows || lowStockRes.data?.lowStock || []);
      setMovements(movementRes.data?.movements || []);
      setTransfers(transferRes.data?.transfers || []);
    } catch (e) {
      setErr(e.message || 'Failed to load warehouse and inventory overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const kpis = useMemo(() => {
    const totalSkus = summary.length;
    const stockUnits = summary.reduce((sum, row) => sum + num(row.totalPacks || row.quantity || row.balanceQty), 0);
    const lowStockCount = lowStock.length;
    const pendingTransfers = transfers.filter((t) => String(t.status || '').toLowerCase() === 'pending').length;
    return { totalSkus, stockUnits, lowStockCount, pendingTransfers };
  }, [summary, lowStock, transfers]);

  const recentMovements = useMemo(
    () => [...movements].sort((a, b) => new Date(b.createdAt || b.movementAt || 0) - new Date(a.createdAt || a.movementAt || 0)).slice(0, 6),
    [movements]
  );

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Warehouse & Inventory</Text>
        <Text style={styles.subtitle}>Module Overview</Text>
        <Text style={styles.help}>Manage Purchase, Sale, Damage, Return, Transfers, Stock Summary, Low Stock Alerts and Inventory Ledger with website-aligned module flows.</Text>
        {err ? <Text style={styles.error}>{err}</Text> : null}

        <View style={styles.kpiGrid}>
          <Metric label="SKUs" value={formatNumber(kpis.totalSkus)} />
          <Metric label="Total Units" value={formatNumber(kpis.stockUnits)} />
          <Metric label="Low Stock" value={formatNumber(kpis.lowStockCount)} tone="warn" />
          <Metric label="Pending Transfers" value={formatNumber(kpis.pendingTransfers)} tone="info" />
        </View>
      </Card>

      <View style={styles.grid}>
        {MODULE_CARDS.map((card) => (
          <Card key={card.key}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            <Pressable style={styles.openBtn} onPress={() => navigation?.navigate?.(card.route)}>
              <Text style={styles.openText}>Open</Text>
            </Pressable>
          </Card>
        ))}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Recent Inventory Movements</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              {['Date', 'Type', 'Warehouse', 'Product', 'Qty'].map((h) => (
                <Text key={h} style={styles.headCell}>{h}</Text>
              ))}
            </View>
            <View style={{ marginTop: 8, gap: 8 }}>
              {recentMovements.length === 0 ? <Text style={styles.help}>No movement records found.</Text> : recentMovements.map((row) => (
                <View key={row._id || `${row.productId}-${row.createdAt}`} style={styles.dataRow}>
                  <Text style={styles.cell}>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}</Text>
                  <Text style={styles.cell}>{row.movementType || '-'}</Text>
                  <Text style={styles.cell}>{row.warehouseName || row.warehouseId || '-'}</Text>
                  <Text style={styles.cell}>{row.productName || row.productId || '-'}</Text>
                  <Text style={styles.cell}>{formatNumber(row.quantity || row.deltaQty || 0)}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function Metric({ label, value, tone = 'default' }) {
  return (
    <View style={[styles.metricCard, tone === 'warn' ? styles.metricWarn : null, tone === 'info' ? styles.metricInfo : null]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8', gap: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, fontSize: 15, color: '#374151', fontWeight: '600' },
  help: { marginTop: 8, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  kpiGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { width: '48%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  metricWarn: { borderColor: '#fbbf24', backgroundColor: '#fffbeb' },
  metricInfo: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  metricLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  metricValue: { marginTop: 3, color: '#111827', fontSize: 18, fontWeight: '700' },
  grid: { gap: 10 },
  cardTitle: { marginTop: 4, fontSize: 17, color: '#111827', fontWeight: '700' },
  cardSubtitle: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  openBtn: { marginTop: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#10b981', backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  openText: { color: '#047857', fontWeight: '700', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  tableWrap: { minWidth: 900 },
  headerRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f3f4f6', padding: 8 },
  headCell: { width: 170, fontSize: 12, color: '#111827', fontWeight: '700' },
  dataRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 8 },
  cell: { width: 170, fontSize: 12, color: '#374151' },
});