import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

export default function RoutesScreen({ navigation }) {
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dispatchQueue, setDispatchQueue] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async (showLoading = false) => {
      if (showLoading && mounted) setLoading(true);
      if (mounted) setErr('');
      try {
        const [w, r, z, a, v, d] = await Promise.all([
          apiClient.get('/warehouses'), apiClient.get('/regions'), apiClient.get('/zones'), apiClient.get('/areas'), apiClient.get('/vehicles'), apiClient.get('/orders/dispatch'),
        ]);
        if (!mounted) return;
        setWarehouses(w?.data?.warehouses || []);
        setRegions(r?.data?.regions || []);
        setZones(z?.data?.zones || []);
        setAreas(a?.data?.areas || []);
        setVehicles(v?.data?.vehicles || []);
        setDispatchQueue(d?.data?.orders || []);
      } catch (e) {
        if (mounted) setErr(e.message || 'Failed to load route planning data');
      } finally {
        if (showLoading && mounted) setLoading(false);
      }
    };
    load(true);
    const interval = setInterval(() => load(false), 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const fleetStats = useMemo(() => {
    const assignedDrivers = vehicles.filter((v) => v.driverName || v.driverId).length;
    const withCapacity = vehicles.filter((v) => Number(v.deliveryCapacity) > 0).length;
    return { total: vehicles.length, assignedDrivers, withoutDrivers: Math.max(vehicles.length - assignedDrivers, 0), withCapacity };
  }, [vehicles]);

  const coverageRows = useMemo(() => regions.map((region) => {
    const regionZones = zones.filter((zone) => zone.regionId === region.regionId);
    const zoneIds = regionZones.map((zone) => zone.zoneId);
    const regionAreas = areas.filter((area) => zoneIds.includes(area.zoneId));
    return { regionName: region.name, zones: regionZones.length, areas: regionAreas.length, updatedAt: region.updatedAt };
  }), [regions, zones, areas]);

  const dispatchPreview = useMemo(() => dispatchQueue.slice(0, 5), [dispatchQueue]);

  const metrics = [
    { label: 'Warehouses', value: formatNumber(warehouses.length) },
    { label: 'Regions', value: formatNumber(regions.length) },
    { label: 'Zones', value: formatNumber(zones.length) },
    { label: 'Areas', value: formatNumber(areas.length) },
    { label: 'Fleet Vehicles', value: formatNumber(fleetStats.total) },
    { label: 'Drivers Assigned', value: formatNumber(fleetStats.assignedDrivers) },
    { label: 'Dispatch Queue', value: formatNumber(dispatchQueue.length) },
    { label: 'Vehicles With Capacity', value: formatNumber(fleetStats.withCapacity) },
  ];

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Route Planning Command Center</Text>
        <Text style={styles.subtitle}>Build delivery routes by warehouse, region, zone, and area with live fleet readiness.</Text>
        <Text style={styles.refresh}>Auto-refreshing every 30 seconds</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <View style={styles.grid}>{metrics.map((m) => <Metric key={m.label} label={m.label} value={m.value} />)}</View>
        <View style={styles.grid}>
          <QuickLink title="Manage Warehouses" description="Align supply points and coverage." route="admin:warehouses" navigation={navigation} />
          <QuickLink title="Region & Zone Setup" description="Define delivery boundaries." route="admin:regions" navigation={navigation} />
          <QuickLink title="Area Coverage" description="Maintain area master data." route="admin:areas" navigation={navigation} />
          <QuickLink title="Fleet Vehicles" description="Assign drivers and capacity." route="admin:assets/vehicles" navigation={navigation} />
        </View>
      </Card>

      <Card>
        <Text style={styles.h2}>Coverage Matrix</Text>
        <Text style={styles.hint}>Monitor region-to-zone and area coverage for route balancing.</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Region', 'Zones', 'Areas', 'Last Update']} />
            {coverageRows.map((row) => <Row key={row.regionName} cols={[row.regionName, formatNumber(row.zones), formatNumber(row.areas), row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—']} />)}
            {!coverageRows.length ? <Text style={styles.empty}>No region coverage data available yet.</Text> : null}
          </View>
        </ScrollView>
      </Card>

      <Card>
        <Text style={styles.h2}>Fleet Readiness</Text>
        <Text style={styles.hint}>Balance vehicles with driver assignments and delivery capacity.</Text>
        <StatRow label="Total Fleet" value={formatNumber(fleetStats.total)} />
        <StatRow label="Drivers Assigned" value={formatNumber(fleetStats.assignedDrivers)} />
        <StatRow label="Without Drivers" value={formatNumber(fleetStats.withoutDrivers)} />
        <StatRow label="Vehicles With Capacity" value={formatNumber(fleetStats.withCapacity)} />
        <Text style={styles.tip}>Tip: Ensure every dispatch-ready vehicle has a driver and capacity set for accurate route planning.</Text>
      </Card>

      <Card>
        <Text style={styles.h2}>Dispatch Preview</Text>
        <Text style={styles.hint}>Orders waiting for route assignment and dispatch scheduling.</Text>
        <ScrollView horizontal>
          <View style={styles.table}>
            <Row head cols={['Order No', 'Customer', 'Status', 'Expected Delivery']} />
            {dispatchPreview.map((o) => <Row key={o._id} cols={[o.orderNo, o.customerName, o.status, o.expectedDelivery ? new Date(o.expectedDelivery).toLocaleDateString() : '—']} />)}
            {!dispatchPreview.length ? <Text style={styles.empty}>No dispatch-ready orders yet.</Text> : null}
          </View>
        </ScrollView>
      </Card>
    </ScrollView>
  );
}

function QuickLink({ title, description, route, navigation }) {
  return <Pressable style={styles.quickLink} onPress={() => navigation?.navigate?.(route)}><Text style={styles.quickTitle}>{title}</Text><Text style={styles.quickDesc}>{description}</Text></Pressable>;
}
function StatRow({ label, value }) { return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }
function formatNumber(value) { return value === null || value === undefined ? '—' : Number(value).toLocaleString(); }
function Metric({ label, value }) { return <View style={styles.metric}><Text style={styles.metricL}>{label}</Text><Text style={styles.metricV}>{value}</Text></View>; }
function Row({ cols, head }) { return <View style={[styles.row, head ? styles.head : null]}>{cols.map((c, i) => <Text key={i} style={styles.cell}>{String(c || '—')}</Text>)}</View>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 26 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  refresh: { marginTop: 4, color: '#059669', fontSize: 12 },
  err: { marginTop: 8, color: '#b91c1c' },
  grid: { marginTop: 10, gap: 8 },
  metric: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  metricL: { fontSize: 12, color: '#6b7280' },
  metricV: { marginTop: 4, fontWeight: '700' },
  quickLink: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  quickDesc: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  h2: { fontSize: 16, fontWeight: '700', color: '#111827' },
  hint: { marginTop: 2, color: '#6b7280', fontSize: 12 },
  table: { marginTop: 8, minWidth: 760, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' },
  head: { backgroundColor: '#f8fafc' },
  cell: { width: 190, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12 },
  empty: { color: '#6b7280', padding: 10 },
  stat: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  statLabel: { color: '#52525b', fontSize: 12 },
  statValue: { color: '#111827', fontWeight: '700' },
  tip: { marginTop: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d4d4d8', borderRadius: 10, backgroundColor: '#fafafa', padding: 10, color: '#6b7280', fontSize: 12 },
});