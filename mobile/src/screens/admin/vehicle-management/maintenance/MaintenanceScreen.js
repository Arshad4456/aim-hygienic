import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const TYPES = ['oil_change', 'oil_filter', 'car_wash', 'tyre', 'brake', 'battery', 'routine', 'accidental', 'other'];
const PAGE_SIZE = 20;

function toNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function formatDateInput(date) { return date ? new Date(date).toISOString().slice(0, 10) : ''; }
function paginate(rows = [], page = 1) { const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)); const safe = Math.min(Math.max(1, page), totalPages); const start = (safe - 1) * PAGE_SIZE; return { page: safe, totalPages, rows: rows.slice(start, start + PAGE_SIZE) }; }
function vehicleLabel(v) { return `${v?.registrationNo || 'No-Reg'} · ${v?.make || ''} ${v?.model || ''}${v?.assignedUserName ? ` · ${v.assignedUserName}` : ''}`.trim(); }

export default function MaintenanceScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({ search: '', vehicleId: '', maintenanceType: '', from: '', to: '' });
  const [form, setForm] = useState({ vehicleId: '', date: '', maintenanceType: 'oil_change', cost: '', vendor: '', notes: '', proofUrl: '' });

  const map = useMemo(() => new Map(vehicles.map((v) => [v._id, v])), [vehicles]);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const [v, m] = await Promise.all([apiClient.get('/vehicles'), apiClient.get('/vehicle-management/maintenance')]);
      setVehicles(v?.data?.vehicles || []);
      setRows(m?.data?.maintenance || []);
    } catch (e) { setErr(e.message || 'Failed to load maintenance data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => setPage(1), [filters, rows.length]);

  const filtered = useMemo(() => rows.filter((r) => {
    const v = map.get(r.vehicleId) || {};
    const text = `${vehicleLabel(v)} ${r.maintenanceType || ''} ${r.vendor || ''} ${r.notes || ''}`.toLowerCase();
    const q = filters.search.trim().toLowerCase();
    if (q && !text.includes(q)) return false;
    if (filters.vehicleId && String(r.vehicleId) !== String(filters.vehicleId)) return false;
    if (filters.maintenanceType && String(r.maintenanceType) !== String(filters.maintenanceType)) return false;
    const d = String(r.date || '').slice(0, 10);
    if (filters.from && d < filters.from) return false;
    if (filters.to && d > filters.to) return false;
    return true;
  }), [rows, map, filters]);

  const pageData = paginate(filtered, page);

  const save = async () => {
    if (!form.vehicleId || !form.date || !form.maintenanceType || !form.cost) return setErr('Please fill required fields');
    if (['oil_change', 'car_wash'].includes(form.maintenanceType) && !form.proofUrl) return setErr('Proof file URL is required for Oil Change and Car Wash');
    setSaving(true); setErr('');
    try {
      await apiClient.post('/vehicle-management/maintenance', { ...form, cost: toNum(form.cost) });
      setForm({ vehicleId: '', date: '', maintenanceType: 'oil_change', cost: '', vendor: '', notes: '', proofUrl: '' });
      await load();
    } catch (e) { setErr(e.message || 'Failed to save maintenance'); }
    finally { setSaving(false); }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Vehicle Maintenance</Text>
        <Text style={styles.subtitle}>Maintenance entry and maintenance ledger (website-like flow).</Text>
        <Text style={styles.note}>Date fields now use date-picker. Maintenance Type now uses dropdown. File-picker/upload needs native picker dependency unavailable in this environment, so proof URL is captured after upload.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Text style={styles.label}>Vehicle</Text>
        <VehicleSelector vehicles={vehicles} value={form.vehicleId} onChange={(v) => setForm((s) => ({ ...s, vehicleId: v }))} />
        <DatePickerField label="Date" value={form.date} onChange={(v) => setForm((s) => ({ ...s, date: v }))} />
        <MaintenanceTypeDropdown value={form.maintenanceType} onChange={(v) => setForm((s) => ({ ...s, maintenanceType: v }))} />
        <TextInput style={styles.input} placeholder="Cost" value={form.cost} onChangeText={(v) => setForm((s) => ({ ...s, cost: v }))} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Vendor" value={form.vendor} onChangeText={(v) => setForm((s) => ({ ...s, vendor: v }))} />
        <TextInput style={styles.input} placeholder="Notes" value={form.notes} onChangeText={(v) => setForm((s) => ({ ...s, notes: v }))} />
        <TextInput style={styles.input} placeholder="Proof File URL (after upload)" value={form.proofUrl} onChangeText={(v) => setForm((s) => ({ ...s, proofUrl: v }))} />
        <Pressable style={styles.btn} onPress={save} disabled={saving}><Text style={styles.btnTx}>{saving ? 'Saving...' : 'Save'}</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.h2}>Vehicle Maintenance Ledger</Text>
        <Text style={styles.sub}>{filtered.length} entries · Page {pageData.page} of {pageData.totalPages}</Text>
        <TextInput style={styles.input} placeholder="Search vehicle / vendor / notes" value={filters.search} onChangeText={(v) => setFilters((s) => ({ ...s, search: v }))} />
        <VehicleSelector vehicles={vehicles} value={filters.vehicleId} onChange={(v) => setFilters((s) => ({ ...s, vehicleId: v }))} />
        <MaintenanceTypeDropdown value={filters.maintenanceType} onChange={(v) => setFilters((s) => ({ ...s, maintenanceType: s.maintenanceType === v ? '' : v }))} allowClear />
        <DatePickerField label="From" value={filters.from} onChange={(v) => setFilters((s) => ({ ...s, from: v }))} />
        <DatePickerField label="To" value={filters.to} onChange={(v) => setFilters((s) => ({ ...s, to: v }))} />
        <Pager page={pageData.page} totalPages={pageData.totalPages} onFirst={() => setPage(1)} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(pageData.totalPages, p + 1))} onEnd={() => setPage(pageData.totalPages)} />
      </Card>

      <Card>
        <ScrollView horizontal><View style={styles.tableWrap}><Row head cols={['Date', 'Vehicle / User', 'Type', 'Odometer', 'Vendor', 'Cost', 'Reference', 'Notes', 'Proof']} />
          {pageData.rows.map((r) => { const v = map.get(r.vehicleId) || {}; return <Row key={r._id} cols={[String(r.date || '').slice(0, 10), vehicleLabel(v), r.maintenanceType || '-', String(r.odometer || '-'), r.vendor || '-', String(r.cost || 0), r.referenceNo || '-', r.notes || '-', r.proofUrl || '-']} />; })}
          {!pageData.rows.length ? <Text style={styles.empty}>No maintenance records found.</Text> : null}
        </View></ScrollView>
      </Card>
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

function MaintenanceTypeDropdown({ value, onChange, allowClear }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>Maintenance Type</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)}><Text>{value || 'Select maintenance type'}</Text></Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {allowClear ? <Pressable style={styles.opt} onPress={() => { onChange(''); setOpen(false); }}><Text>All Types</Text></Pressable> : null}
            <ScrollView style={{ maxHeight: 280 }}>
              {TYPES.map((t) => <Pressable key={t} style={[styles.opt, value === t ? styles.optActive : null]} onPress={() => { onChange(t); setOpen(false); }}><Text style={value === t ? styles.activeTx : null}>{t}</Text></Pressable>)}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setOpen(false)}><Text>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function VehicleSelector({ vehicles, value, onChange }) {
  return <ScrollView horizontal contentContainerStyle={styles.wrap}><Pressable style={[styles.chip, !value ? styles.active : null]} onPress={() => onChange('')}><Text style={!value ? styles.activeTx : null}>All/None</Text></Pressable>{vehicles.map((v) => <Pressable key={v._id} style={[styles.chip, value === v._id ? styles.active : null]} onPress={() => onChange(v._id)}><Text style={value === v._id ? styles.activeTx : null}>{vehicleLabel(v)}</Text></Pressable>)}</ScrollView>;
}

function Row({ cols, head }) { return <View style={[styles.tRow, head ? styles.tHeadBg : null]}>{cols.map((c, i) => <Text key={i} style={[styles.tCell, head ? styles.tHead : null]}>{String(c)}</Text>)}</View>; }
function Pager({ page, totalPages, onFirst, onPrev, onNext, onEnd }) { return <View style={styles.pager}><PagerBtn label="Start" onPress={onFirst} disabled={page <= 1} /><PagerBtn label="Previous" onPress={onPrev} disabled={page <= 1} /><PagerBtn label="Next" onPress={onNext} disabled={page >= totalPages} /><PagerBtn label="End" onPress={onEnd} disabled={page >= totalPages} /></View>; }
function PagerBtn({ label, onPress, disabled }) { return <Pressable style={[styles.pagerBtn, disabled ? styles.disabled : null]} onPress={onPress} disabled={disabled}><Text style={styles.pagerTx}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  content: { padding: 12, gap: 12, paddingBottom: 30 }, title: { fontSize: 20, fontWeight: '700' }, subtitle: { color: '#6b7280', marginTop: 4 }, note: { marginTop: 6, color: '#92400e', fontSize: 12 }, err: { color: '#b91c1c', marginTop: 6 },
  h2: { fontSize: 16, fontWeight: '700' }, sub: { fontSize: 12, color: '#6b7280', marginTop: 4, marginBottom: 6 }, label: { marginBottom: 5, color: '#6b7280', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, backgroundColor: '#fff' },
  wrap: { flexDirection: 'row', gap: 8, marginBottom: 8 }, chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' }, active: { backgroundColor: '#059669', borderColor: '#059669' }, activeTx: { color: '#fff' },
  btn: { borderRadius: 10, backgroundColor: '#059669', paddingVertical: 10, alignItems: 'center' }, btnTx: { color: '#fff', fontWeight: '700' },
  pager: { flexDirection: 'row', gap: 6, marginTop: 6, marginBottom: 2 }, pagerBtn: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }, pagerTx: { fontSize: 12, fontWeight: '600' }, disabled: { opacity: 0.5 },
  tableWrap: { minWidth: 1350, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8, overflow: 'hidden' }, tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f4f4f5' }, tHeadBg: { backgroundColor: '#f8fafc', borderColor: '#e4e4e7' }, tCell: { width: 150, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 }, tHead: { fontWeight: '700' },
  empty: { color: '#6b7280', padding: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }, modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 }, monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, monthTitle: { fontWeight: '700' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }, dayCell: { width: '14.285%', alignItems: 'center', paddingVertical: 8, borderRadius: 8 }, closeBtn: { marginTop: 10, alignSelf: 'flex-end', borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  opt: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 }, optActive: { backgroundColor: '#059669', borderColor: '#059669' },
});