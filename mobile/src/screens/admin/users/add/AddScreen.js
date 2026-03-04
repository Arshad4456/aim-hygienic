import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';

const ROLES = [
  'admin', 'ceo', 'manageDirector', 'nationalSM', 'regionalSM', 'zoneSM', 'fieldSM', 'territorySM',
  'warehouseManager', 'salesman', 'orderBooker', 'deliveryBoy', 'distributor', 'brandManager',
  'customer', 'kpo', 'hrAssistant', 'accountOfficer', 'cashier',
];

function SelectPills({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map((item) => (
        <Pressable key={item} style={[styles.roleChip, value === item ? styles.roleChipActive : null]} onPress={() => onChange(item)}>
          <Text style={[styles.roleChipText, value === item ? styles.roleChipTextActive : null]}>{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, keyboardType = 'default', secureTextEntry = false }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        placeholderTextColor="#71717a"
      />
    </View>
  );
}

export default function AddScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);

  const [form, setForm] = useState({
    userId: '',
    role: 'salesman',
    fullName: '',
    email: '',
    mobileNumber: '',
    cnicNo: '',
    address: '',
    businessType: '',
    businessName: '',
    password: '',
    warehouseId: '',
    warehouseName: '',
    regionId: '',
    regionName: '',
    zoneId: '',
    zoneName: '',
    territoryId: '',
    territoryName: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [u, w, r, z, a] = await Promise.all([
          apiClient.get('/users'),
          apiClient.get('/warehouses'),
          apiClient.get('/regions'),
          apiClient.get('/zones'),
          apiClient.get('/areas'),
        ]);

        if (!mounted) return;

        const userRows = u.data?.users || [];
        setUsers(userRows);
        setWarehouses(w.data?.warehouses || []);
        setRegions(r.data?.regions || []);
        setZones(z.data?.zones || []);
        setAreas(a.data?.areas || []);

        const nextId = `USR-${String(userRows.length + 1).padStart(4, '0')}`;
        setForm((prev) => ({ ...prev, userId: nextId }));
      } catch (e) {
        if (mounted) setErr(e.message || 'Failed to load master data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRegions = useMemo(() => {
    if (!form.warehouseId) return regions;
    return regions.filter((r) => !r.warehouseId || r.warehouseId === form.warehouseId);
  }, [regions, form.warehouseId]);

  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      if (form.warehouseId && z.warehouseId !== form.warehouseId) return false;
      if (form.regionId && z.regionId !== form.regionId) return false;
      return true;
    });
  }, [zones, form.warehouseId, form.regionId]);

  const filteredAreas = useMemo(() => {
    return areas.filter((a) => {
      if (form.warehouseId && a.warehouseId !== form.warehouseId) return false;
      if (form.regionId && a.regionId !== form.regionId) return false;
      if (form.zoneId && a.zoneId !== form.zoneId) return false;
      return true;
    });
  }, [areas, form.warehouseId, form.regionId, form.zoneId]);

  const save = async () => {
    setErr('');
    setOk('');
    if (!form.role || !form.fullName.trim() || !form.mobileNumber.trim() || !form.password.trim()) {
      setErr('Role, Full Name, Mobile Number and Password are required.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/users', {
        userId: form.userId,
        role: form.role,
        fullName: form.fullName,
        email: form.email,
        mobileNumber: form.mobileNumber,
        cnicNo: form.cnicNo,
        address: form.address,
        businessType: form.businessType,
        businessName: form.businessName,
        password: form.password,
        warehouseId: form.warehouseId,
        warehouseName: form.warehouseName,
        regionId: form.regionId,
        regionName: form.regionName,
        zoneId: form.zoneId,
        zoneName: form.zoneName,
        territoryId: form.territoryId,
        territoryName: form.territoryName,
      });

      setOk('✅ User created successfully.');
      setTimeout(() => navigation?.navigate?.('admin:users'), 500);
    } catch (e) {
      setErr(e.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Add User</Text>
        <Text style={styles.subtitle}>Create users for warehouses, sales, and suppliers.</Text>

        {err ? <Text style={styles.error}>{err}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}

        <View style={styles.formWrap}>
          <Text style={styles.fieldLabel}>Role</Text>
          <SelectPills options={ROLES} value={form.role} onChange={(role) => setForm((s) => ({ ...s, role }))} />

          <Field label="Auto User ID" value={form.userId} onChangeText={() => {}} />
          <Field label="Full Name" value={form.fullName} onChangeText={(v) => setForm((s) => ({ ...s, fullName: v }))} />
          <Field label="Email" value={form.email} onChangeText={(v) => setForm((s) => ({ ...s, email: v }))} keyboardType="email-address" />
          <Field label="Mobile Number" value={form.mobileNumber} onChangeText={(v) => setForm((s) => ({ ...s, mobileNumber: v }))} keyboardType="phone-pad" />
          <Field label="CNIC" value={form.cnicNo} onChangeText={(v) => setForm((s) => ({ ...s, cnicNo: v }))} />
          <Field label="Address" value={form.address} onChangeText={(v) => setForm((s) => ({ ...s, address: v }))} />
          <Field label="Business Type" value={form.businessType} onChangeText={(v) => setForm((s) => ({ ...s, businessType: v }))} />
          <Field label="Business Name" value={form.businessName} onChangeText={(v) => setForm((s) => ({ ...s, businessName: v }))} />
          <Field label="Password" value={form.password} onChangeText={(v) => setForm((s) => ({ ...s, password: v }))} secureTextEntry />

          <Text style={styles.sectionLabel}>Location Mapping (optional)</Text>

          <Text style={styles.fieldLabel}>Warehouse</Text>
          <SelectPills
            options={['(none)', ...warehouses.map((w) => w.name)]}
            value={form.warehouseName || '(none)'}
            onChange={(name) => {
              const w = warehouses.find((x) => x.name === name);
              setForm((s) => ({ ...s, warehouseId: w?.warehouseId || '', warehouseName: w?.name || '' }));
            }}
          />

          <Text style={styles.fieldLabel}>Region</Text>
          <SelectPills
            options={['(none)', ...filteredRegions.map((r) => r.name)]}
            value={form.regionName || '(none)'}
            onChange={(name) => {
              const r = filteredRegions.find((x) => x.name === name);
              setForm((s) => ({ ...s, regionId: r?.regionId || '', regionName: r?.name || '' }));
            }}
          />

          <Text style={styles.fieldLabel}>Zone</Text>
          <SelectPills
            options={['(none)', ...filteredZones.map((z) => z.name)]}
            value={form.zoneName || '(none)'}
            onChange={(name) => {
              const z = filteredZones.find((x) => x.name === name);
              setForm((s) => ({ ...s, zoneId: z?.zoneId || '', zoneName: z?.name || '' }));
            }}
          />

          <Text style={styles.fieldLabel}>Territory</Text>
          <SelectPills
            options={['(none)', ...filteredAreas.map((a) => a.name)]}
            value={form.territoryName || '(none)'}
            onChange={(name) => {
              const a = filteredAreas.find((x) => x.name === name);
              setForm((s) => ({ ...s, territoryId: a?.areaId || '', territoryName: a?.name || '' }));
            }}
          />

          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={save} disabled={saving}>
              <Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save User'}</Text>
            </Pressable>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, backgroundColor: '#f5f6f8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6b7280', fontSize: 13 },
  error: { marginTop: 8, color: '#b91c1c' },
  ok: { marginTop: 8, color: '#047857' },
  formWrap: { marginTop: 12, gap: 8 },
  fieldWrap: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 13,
  },
  roleChip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  roleChipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  roleChipText: { color: '#52525b', fontSize: 12 },
  roleChipTextActive: { color: '#047857', fontWeight: '700' },
  sectionLabel: { marginTop: 10, fontSize: 13, fontWeight: '700', color: '#111827' },
  actions: { marginTop: 10 },
  primaryBtn: { backgroundColor: '#059669', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
