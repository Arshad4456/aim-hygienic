import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

export default function LiveTrackingScreen() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async (showLoading = false) => {
      if (showLoading && mounted) setLoading(true);
      if (mounted) setErr('');
      try {
        const [summaryData, usersData, vehiclesData, dispatchesData] = await Promise.all([
          apiClient.get('/live-tracking/summary'),
          apiClient.get('/live-tracking/users'),
          apiClient.get('/live-tracking/vehicles'),
          apiClient.get('/live-tracking/dispatches'),
        ]);
        if (!mounted) return;
        setSummary(summaryData?.data?.summary || null);
        setUsers(usersData?.data?.users || []);
        setVehicles(vehiclesData?.data?.vehicles || []);
        setDispatches(dispatchesData?.data?.dispatches || []);
      } catch (e) {
        if (mounted) setErr(e.message || 'Failed to load live tracking data');
      } finally {
        if (showLoading && mounted) setLoading(false);
      }
    };

    load(true);
    const interval = setInterval(() => load(false), 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const metrics = useMemo(() => [
    { label: 'Total Users', value: formatNumber(summary?.totalUsers) },
    { label: 'Active Users', value: formatNumber(summary?.activeUsers) },
    { label: 'Tracked Users', value: formatNumber(summary?.trackedUsers) },
    { label: 'Live Coordinates', value: formatNumber(users.length) },
    { label: 'Fleet Vehicles', value: formatNumber(summary?.totalVehicles) },
    { label: 'Tracked Vehicles', value: formatNumber(summary?.trackedVehicles) },
    { label: 'Active Dispatches', value: formatNumber(summary?.activeDispatches) },
  ], [summary, users.length]);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Live Tracking Command Center</Text>
        <Text style={styles.subtitle}>Monitor delivery teams and vehicle GPS updates with auto-refresh every 30 seconds.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <View style={styles.grid}>{metrics.map((m) => <Metric key={m.label} label={m.label} value={m.value} />)}</View>
      </Card>

      <Card>
        <Text style={styles.h2}>Field Team GPS</Text>
        <Text style={styles.hint}>Sales reps, dispatch riders, and warehouse runners.</Text>
        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.tableWide}>
            <Row head cols={['User', 'Role', 'Region', 'Zone', 'Area', 'Latitude', 'Longitude', 'Last Update']} />
            {users.length === 0 ? <Text style={styles.empty}>No live coordinates available</Text> : users.map((u) => (
              <Row key={u._id} cols={[`${u.fullName || '-'} (${u.mobile || '—'})`, u.role || '—', u.regionName || '—', u.zoneName || '—', u.areaName || '—', formatCoordinate(u.gpsLatitude), formatCoordinate(u.gpsLongitude), u.updatedAt ? new Date(u.updatedAt).toLocaleString() : '—']} />
            ))}
          </View>
        </ScrollView>
      </Card>

      <Card>
        <Text style={styles.h2}>Vehicle GPS Tracking</Text>
        <Text style={styles.hint}>Active fleet coordinates and latest GPS ping.</Text>
        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.table}>
            <Row head cols={['Vehicle', 'Driver', 'Latitude', 'Longitude', 'Last GPS']} />
            {vehicles.length === 0 ? <Text style={styles.empty}>No vehicle GPS updates available</Text> : vehicles.map((v) => (
              <Row key={v._id} cols={[`${v.name || v.vehicleId || '-'} (${v.plateNumber || '—'})`, v.driverName || '—', formatCoordinate(v.gpsLatitude), formatCoordinate(v.gpsLongitude), v.lastReportedAt ? new Date(v.lastReportedAt).toLocaleString() : (v.updatedAt ? new Date(v.updatedAt).toLocaleString() : '—')]} />
            ))}
          </View>
        </ScrollView>
      </Card>

      <Card>
        <Text style={styles.h2}>Active Dispatch Tracking</Text>
        <Text style={styles.hint}>Orders on the move with assigned driver and vehicle GPS.</Text>
        <ScrollView horizontal style={{ marginTop: 8 }}>
          <View style={styles.tableWide}>
            <Row head cols={['Order', 'Customer', 'Driver', 'Vehicle', 'Tracking ID', 'Vehicle GPS', 'Dispatched At']} />
            {dispatches.length === 0 ? <Text style={styles.empty}>No dispatched orders currently tracked</Text> : dispatches.map((d) => (
              <Row
                key={d._id}
                cols={[
                  d.orderNo || '—',
                  d.customerName || '—',
                  d.dispatchDriverName || '—',
                  d.dispatchVehicleName || '—',
                  d.dispatchTracking || '—',
                  d.vehicle ? `${formatCoordinate(d.vehicle.gpsLatitude)}, ${formatCoordinate(d.vehicle.gpsLongitude)}` : '—',
                  d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleString() : '—',
                ]}
              />
            ))}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString();
}

function formatCoordinate(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toFixed(5);
}

function Metric({ label, value }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function Row({ cols, head }) {
  return <View style={[styles.row, head ? styles.head : null]}>{cols.map((c, i) => <Text key={i} style={styles.cell}>{String(c)}</Text>)}</View>;
}

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  err: { marginTop: 8, color: '#b91c1c' },
  grid: { marginTop: 10, gap: 8 },
  metric: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fafafa', padding: 10 },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { marginTop: 4, fontWeight: '700', color: '#111827' },
  h2: { fontSize: 16, fontWeight: '700', color: '#111827' },
  hint: { marginTop: 2, color: '#6b7280', fontSize: 12 },
  table: { minWidth: 840, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  tableWide: { minWidth: 1120, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 160, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#111827' },
  empty: { color: '#6b7280', padding: 10 },
});
