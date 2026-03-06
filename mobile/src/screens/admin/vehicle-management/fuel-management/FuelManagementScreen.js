import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const PAGE_SIZE = 20;

function toNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function formatDateInput(date) { return date ? new Date(date).toISOString().slice(0, 10) : ''; }
function paginate(rows = [], page = 1) { const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)); const safe = Math.min(Math.max(1, page), totalPages); const start = (safe - 1) * PAGE_SIZE; return { page: safe, totalPages, rows: rows.slice(start, start + PAGE_SIZE) }; }
function vehicleLabel(vehicle) { return `${vehicle?.registrationNo || 'No-Reg'} · ${vehicle?.make || ''} ${vehicle?.model || ''}${vehicle?.assignedUserName ? ` · ${vehicle.assignedUserName}` : ''}`.trim(); }

export default function FuelManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [refuels, setRefuels] = useState([]);
  const [savingTrip, setSavingTrip] = useState(false);
  const [savingRefuel, setSavingRefuel] = useState(false);

  const [tripPage, setTripPage] = useState(1);
  const [refuelPage, setRefuelPage] = useState(1);

  const [tripFilters, setTripFilters] = useState({ search: '', vehicleId: '', tripType: '', from: '', to: '' });
  const [refuelFilters, setRefuelFilters] = useState({ search: '', vehicleId: '', from: '', to: '' });

  const [form, setForm] = useState({ vehicleId: '', tripType: 'company', tripDate: '', fromPlace: '', toPlace: '', startOdometer: '', endOdometer: '', startMeterUrl: '', endMeterUrl: '' });
  const [refuel, setRefuel] = useState({ vehicleId: '', date: '', liters: '', cost: '', vendor: '', receiptUrl: '' });

  const map = useMemo(() => new Map(vehicles.map((v) => [v._id, v])), [vehicles]);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [v, t, r] = await Promise.all([apiClient.get('/vehicles'), apiClient.get('/vehicle-management/trips'), apiClient.get('/vehicle-management/refuels')]);
      setVehicles(v?.data?.vehicles || []);
      setTrips(t?.data?.trips || []);
      setRefuels(r?.data?.refuels || []);
    } catch (e) {
      setErr(e.message || 'Failed to load fuel management data');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => setTripPage(1), [tripFilters, trips.length]);
  useEffect(() => setRefuelPage(1), [refuelFilters, refuels.length]);

  const filteredTrips = useMemo(() => trips.filter((t) => {
    const v = map.get(t.vehicleId) || {};
    const text = `${vehicleLabel(v)} ${t.fromPlace || ''} ${t.toPlace || ''}`.toLowerCase();
    const q = tripFilters.search.trim().toLowerCase();
    if (q && !text.includes(q)) return false;
    if (tripFilters.vehicleId && String(t.vehicleId) !== String(tripFilters.vehicleId)) return false;
    if (tripFilters.tripType && String(t.tripType) !== String(tripFilters.tripType)) return false;
    const d = String(t.tripDate || '').slice(0, 10);
    if (tripFilters.from && d < tripFilters.from) return false;
    if (tripFilters.to && d > tripFilters.to) return false;
    return true;
  }), [trips, map, tripFilters]);

  const filteredRefuels = useMemo(() => refuels.filter((r) => {
    const v = map.get(r.vehicleId) || {};
    const text = `${vehicleLabel(v)} ${r.vendor || ''}`.toLowerCase();
    const q = refuelFilters.search.trim().toLowerCase();
    if (q && !text.includes(q)) return false;
    if (refuelFilters.vehicleId && String(r.vehicleId) !== String(refuelFilters.vehicleId)) return false;
    const d = String(r.date || '').slice(0, 10);
    if (refuelFilters.from && d < refuelFilters.from) return false;
    if (refuelFilters.to && d > refuelFilters.to) return false;
    return true;
  }), [refuels, map, refuelFilters]);

  const tripPageData = paginate(filteredTrips, tripPage);
  const refuelPageData = paginate(filteredRefuels, refuelPage);

  const saveTrip = async () => {
    if (!form.vehicleId || !form.tripDate || !form.fromPlace || !form.toPlace) return setErr('Please fill required trip fields');
    if (!form.startMeterUrl || !form.endMeterUrl) return setErr('Start Meter Proof URL and End Meter Proof URL are required.');
    setSavingTrip(true); setErr('');
    try {
      await apiClient.post('/vehicle-management/trips', { ...form, startOdometer: toNum(form.startOdometer), endOdometer: toNum(form.endOdometer) });
      setForm({ vehicleId: '', tripType: 'company', tripDate: '', fromPlace: '', toPlace: '', startOdometer: '', endOdometer: '', startMeterUrl: '', endMeterUrl: '' });
      await load();
    } catch (e) { setErr(e.message || 'Failed to save trip'); }
    finally { setSavingTrip(false); }
  };

  const saveRefuel = async () => {
    if (!refuel.vehicleId || !refuel.date || !refuel.liters) return setErr('Please fill required refuel fields');
    if (!refuel.receiptUrl) return setErr('Receipt URL is required.');
    setSavingRefuel(true); setErr('');
    try {
      await apiClient.post('/vehicle-management/refuels', { ...refuel, liters: toNum(refuel.liters), cost: toNum(refuel.cost) });
      setRefuel({ vehicleId: '', date: '', liters: '', cost: '', vendor: '', receiptUrl: '' });
      await load();
    } catch (e) { setErr(e.message || 'Failed to save refuel'); }
    finally { setSavingRefuel(false); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Fuel Management</Text>
        <Text style={styles.subtitle}>Trip entry, refuel entry, trip ledger and refuel ledger.</Text>
        <Text style={styles.note}>Date fields now use a calendar picker. File picking/upload to R2 needs native picker dependency not currently available in this project environment.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
      </Card>

      <View style={styles.grid}>
        <Card>
          <Text style={styles.h2}>Trip Entry</Text>
          <VehicleSelector vehicles={vehicles} value={form.vehicleId} onChange={(v) => setForm((s) => ({ ...s, vehicleId: v }))} />
          <DatePickerField label="Trip Date" value={form.tripDate} onChange={(v) => setForm((s) => ({ ...s, tripDate: v }))} />
          <TextInput style={styles.input} placeholder="Trip Type (company/personal)" value={form.tripType} onChangeText={(v) => setForm((s) => ({ ...s, tripType: v }))} />
          <TextInput style={styles.input} placeholder="From" value={form.fromPlace} onChangeText={(v) => setForm((s) => ({ ...s, fromPlace: v }))} />
          <TextInput style={styles.input} placeholder="To" value={form.toPlace} onChangeText={(v) => setForm((s) => ({ ...s, toPlace: v }))} />
          <TextInput style={styles.input} placeholder="Start Odometer" value={form.startOdometer} onChangeText={(v) => setForm((s) => ({ ...s, startOdometer: v }))} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="End Odometer" value={form.endOdometer} onChangeText={(v) => setForm((s) => ({ ...s, endOdometer: v }))} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Start Meter Proof URL (R2 URL)" value={form.startMeterUrl} onChangeText={(v) => setForm((s) => ({ ...s, startMeterUrl: v }))} />
          <TextInput style={styles.input} placeholder="End Meter Proof URL (R2 URL)" value={form.endMeterUrl} onChangeText={(v) => setForm((s) => ({ ...s, endMeterUrl: v }))} />
          <Pressable style={styles.btn} onPress={saveTrip} disabled={savingTrip}><Text style={styles.btnTx}>{savingTrip ? 'Saving...' : 'Save Trip'}</Text></Pressable>
        </Card>

        <Card>
          <Text style={styles.h2}>Refuel Entry</Text>
          <VehicleSelector vehicles={vehicles} value={refuel.vehicleId} onChange={(v) => setRefuel((s) => ({ ...s, vehicleId: v }))} />
          <DatePickerField label="Refuel Date" value={refuel.date} onChange={(v) => setRefuel((s) => ({ ...s, date: v }))} />
          <TextInput style={styles.input} placeholder="Liters" value={refuel.liters} onChangeText={(v) => setRefuel((s) => ({ ...s, liters: v }))} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Cost" value={refuel.cost} onChangeText={(v) => setRefuel((s) => ({ ...s, cost: v }))} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Vendor" value={refuel.vendor} onChangeText={(v) => setRefuel((s) => ({ ...s, vendor: v }))} />
          <TextInput style={styles.input} placeholder="Receipt URL (R2 URL)" value={refuel.receiptUrl} onChangeText={(v) => setRefuel((s) => ({ ...s, receiptUrl: v }))} />
          <Pressable style={styles.btn} onPress={saveRefuel} disabled={savingRefuel}><Text style={styles.btnTx}>{savingRefuel ? 'Saving...' : 'Save Refuel'}</Text></Pressable>
        </Card>
      </View>

      <Ledger title="Trip Ledger" total={filteredTrips.length} page={tripPageData.page} totalPages={tripPageData.totalPages} onFirst={() => setTripPage(1)} onPrev={() => setTripPage((p) => Math.max(1, p - 1))} onNext={() => setTripPage((p) => Math.min(tripPageData.totalPages, p + 1))} onEnd={() => setTripPage(tripPageData.totalPages)}>
        <Filters vehicles={vehicles} filters={tripFilters} setFilters={setTripFilters} withTripType withDates />
        <ScrollView horizontal><View style={styles.tableWrap}><Row head cols={['Date', 'Vehicle / User', 'Trip Type', 'Route', 'Odometer', 'Distance', 'Start Proof', 'End Proof', 'Receipt']} />
          {tripPageData.rows.map((t) => { const v = map.get(t.vehicleId) || {}; return <Row key={t._id} cols={[String(t.tripDate || '').slice(0, 10), vehicleLabel(v), t.tripType || '-', `${t.fromPlace || '-'} → ${t.toPlace || '-'}`, `${t.startOdometer || '-'} / ${t.endOdometer || '-'}`, String(t.distance || '-'), t.startMeterUrl || '-', t.endMeterUrl || '-', t.fuelReceiptUrl || '-']} />; })}
          {!tripPageData.rows.length ? <Text style={styles.empty}>No trips found.</Text> : null}
        </View></ScrollView>
      </Ledger>

      <Ledger title="Refuel Ledger" total={filteredRefuels.length} page={refuelPageData.page} totalPages={refuelPageData.totalPages} onFirst={() => setRefuelPage(1)} onPrev={() => setRefuelPage((p) => Math.max(1, p - 1))} onNext={() => setRefuelPage((p) => Math.min(refuelPageData.totalPages, p + 1))} onEnd={() => setRefuelPage(refuelPageData.totalPages)}>
        <Filters vehicles={vehicles} filters={refuelFilters} setFilters={setRefuelFilters} withDates />
        <ScrollView horizontal><View style={styles.tableWrap}><Row head cols={['Date', 'Vehicle / User', 'Odometer', 'Liters', 'Cost', 'Vendor', 'Receipt']} />
          {refuelPageData.rows.map((r) => { const v = map.get(r.vehicleId) || {}; return <Row key={r._id} cols={[String(r.date || '').slice(0, 10), vehicleLabel(v), String(r.odometer || '-'), String(r.liters || 0), String(r.cost || 0), r.vendor || '-', r.receiptUrl || '-']} />; })}
          {!refuelPageData.rows.length ? <Text style={styles.empty}>No refuels found.</Text> : null}
        </View></ScrollView>
      </Ledger>
    </ScrollView>
  );
}

function DatePickerField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(value ? new Date(value) : new Date());

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < startDay; i += 1) arr.push(null);
    for (let d = 1; d <= total; d += 1) arr.push(new Date(year, month, d));
    return arr;
  }, [cursor]);

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)}><Text>{value || 'Select date'}</Text></Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.monthRow}>
              <Pressable onPress={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><Text>{'<'}</Text></Pressable>
              <Text style={styles.monthTitle}>{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
              <Pressable onPress={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><Text>{'>'}</Text></Pressable>
            </View>
            <View style={styles.daysGrid}>{days.map((d, idx) => <Pressable key={`${idx}-${d ? d.getDate() : 'x'}`} style={[styles.dayCell, d && formatDateInput(d) === value ? styles.active : null]} disabled={!d} onPress={() => { onChange(formatDateInput(d)); setOpen(false); }}><Text style={d && formatDateInput(d) === value ? styles.activeTx : null}>{d ? d.getDate() : ''}</Text></Pressable>)}</View>
            <Pressable style={styles.closeBtn} onPress={() => setOpen(false)}><Text>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function VehicleSelector({ vehicles, value, onChange }) {
  return (
    <ScrollView horizontal contentContainerStyle={styles.wrap}>
      <Pressable style={[styles.chip, !value ? styles.active : null]} onPress={() => onChange('')}><Text style={!value ? styles.activeTx : null}>Vehicle</Text></Pressable>
      {vehicles.map((v) => <Pressable key={v._id} style={[styles.chip, value === v._id ? styles.active : null]} onPress={() => onChange(v._id)}><Text style={value === v._id ? styles.activeTx : null}>{vehicleLabel(v)}</Text></Pressable>)}
    </ScrollView>
  );
}

function Filters({ vehicles, filters, setFilters, withTripType, withDates }) {
  return (
    <View>
      <TextInput style={styles.input} placeholder="Search" value={filters.search} onChangeText={(v) => setFilters((s) => ({ ...s, search: v }))} />
      <VehicleSelector vehicles={vehicles} value={filters.vehicleId} onChange={(v) => setFilters((s) => ({ ...s, vehicleId: v }))} />
      {withTripType ? <TextInput style={styles.input} placeholder="Trip Type (company/personal)" value={filters.tripType} onChangeText={(v) => setFilters((s) => ({ ...s, tripType: v }))} /> : null}
      {withDates ? <View><DatePickerField label="From" value={filters.from} onChange={(v) => setFilters((s) => ({ ...s, from: v }))} /><DatePickerField label="To" value={filters.to} onChange={(v) => setFilters((s) => ({ ...s, to: v }))} /></View> : null}
    </View>
  );
}

function Ledger({ title, total, page, totalPages, onFirst, onPrev, onNext, onEnd, children }) { return <Card><Text style={styles.h2}>{title}</Text><Text style={styles.sub}>{total} entries · Page {page} of {totalPages}</Text>{children}<Pager page={page} totalPages={totalPages} onFirst={onFirst} onPrev={onPrev} onNext={onNext} onEnd={onEnd} /></Card>; }
function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHeadBg : null]}>{cols.map((c, i) => <Text key={i} style={[styles.tCell, head ? styles.tHead : null]}>{String(c)}</Text>)}</View>; }
function Pager({ page, totalPages, onFirst, onPrev, onNext, onEnd }) { return <View style={styles.pager}><PagerBtn label="Start" onPress={onFirst} disabled={page <= 1} /><PagerBtn label="Previous" onPress={onPrev} disabled={page <= 1} /><PagerBtn label="Next" onPress={onNext} disabled={page >= totalPages} /><PagerBtn label="End" onPress={onEnd} disabled={page >= totalPages} /></View>; }
function PagerBtn({ label, onPress, disabled }) { return <Pressable onPress={onPress} disabled={disabled} style={[styles.pagerBtn, disabled ? styles.disabled : null]}><Text style={styles.pagerTx}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 30 }, title: { fontSize: 20, fontWeight: '700' }, subtitle: { marginTop: 4, color: '#6b7280' }, note: { marginTop: 6, color: '#92400e', fontSize: 12 }, err: { marginTop: 6, color: '#b91c1c' },
  grid: { gap: 12 }, h2: { fontSize: 16, fontWeight: '700', marginBottom: 8 }, sub: { fontSize: 12, color: '#6b7280', marginBottom: 8 }, label: { marginBottom: 5, color: '#6b7280', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, backgroundColor: '#fff' },
  wrap: { flexDirection: 'row', gap: 8, marginBottom: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' }, active: { backgroundColor: '#059669', borderColor: '#059669' }, activeTx: { color: '#fff' },
  btn: { borderRadius: 10, backgroundColor: '#059669', paddingVertical: 10, alignItems: 'center' }, btnTx: { color: '#fff', fontWeight: '700' },
  tableWrap: { minWidth: 1500, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHeadBg: { backgroundColor: '#f8fafc', borderColor: '#e4e4e7' }, tCell: { width: 150, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 }, tHead: { fontWeight: '700' },
  empty: { color: '#6b7280', padding: 10 }, pager: { flexDirection: 'row', gap: 6, marginTop: 10 }, pagerBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }, pagerTx: { fontSize: 12, fontWeight: '600' }, disabled: { opacity: 0.5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }, modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 }, monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, monthTitle: { fontWeight: '700' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }, dayCell: { width: '14.285%', alignItems: 'center', paddingVertical: 8, borderRadius: 8 }, closeBtn: { marginTop: 10, alignSelf: 'flex-end', borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});