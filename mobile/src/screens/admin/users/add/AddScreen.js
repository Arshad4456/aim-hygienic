import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';
import { AIM_USER_ROLES, COMMON_USER_FIELDS, FIELD_LABELS, ROLE_EXTRA_FIELDS, validatePassword } from '../roleConfig';

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

function Field({ label, value, onChangeText, keyboardType = 'default', secureTextEntry = false, readOnly = false }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        editable={!readOnly}
        style={[styles.input, readOnly ? styles.inputReadonly : null]}
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
  const [fields, setFields] = useState([]);

  const [form, setForm] = useState({
    userId: '',
    role: 'Salesman',
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
    fieldId: '',
    fieldName: '',
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
        let f = { data: { fields: [] } };
        try {
          f = await apiClient.get('/fields');
        } catch {
          f = { data: { fields: [] } };
        }

        if (!mounted) return;

        const userRows = u.data?.users || [];
        setUsers(userRows);
        setWarehouses(w.data?.warehouses || []);
        setRegions(r.data?.regions || []);
        setZones(z.data?.zones || []);
        setAreas(a.data?.areas || []);
        setFields(f.data?.fields || []);

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

  const roleNeeds = useMemo(() => ROLE_EXTRA_FIELDS[form.role] || [], [form.role]);

  const filteredRegions = useMemo(() => {
    if (!form.warehouseId) return regions;
    return regions.filter((r) => !r.companyId || r.companyId === warehouses.find((w) => w.warehouseId === form.warehouseId)?.companyId);
  }, [regions, warehouses, form.warehouseId]);

  const filteredZones = useMemo(
    () => zones.filter((z) => {
      if (form.warehouseId && z.warehouseId !== form.warehouseId) return false;
      if (form.regionId && z.regionId !== form.regionId) return false;
      return true;
    }),
    [zones, form.warehouseId, form.regionId]
  );

  const filteredAreas = useMemo(
    () => areas.filter((a) => {
      if (form.warehouseId && a.warehouseId !== form.warehouseId) return false;
      if (form.regionId && a.regionId !== form.regionId) return false;
      if (form.zoneId && a.zoneId !== form.zoneId) return false;
      return true;
    }),
    [areas, form.warehouseId, form.regionId, form.zoneId]
  );

  const filteredFields = useMemo(
    () => fields.filter((f) => {
      if (form.warehouseId && f.warehouseId !== form.warehouseId) return false;
      if (form.regionId && f.regionId !== form.regionId) return false;
      if (form.zoneId && f.zoneId !== form.zoneId) return false;
      if (form.territoryId && f.territoryId !== form.territoryId) return false;
      return true;
    }),
    [fields, form.warehouseId, form.regionId, form.zoneId, form.territoryId]
  );

  const save = async () => {
    setErr('');
    setOk('');
    const passwordError = validatePassword(form.password);
    if (passwordError) {
      setErr(passwordError);
      return;
    }
    if (!form.role || !form.fullName.trim() || !form.mobileNumber.trim()) {
      setErr('Role, Name, and Mobile Number are required.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/users', form);
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
          <SelectPills options={AIM_USER_ROLES} value={form.role} onChange={(role) => setForm((s) => ({ ...s, role }))} />

          <Field label="Auto User ID" value={form.userId} onChangeText={() => {}} readOnly />

          {COMMON_USER_FIELDS.map((field) => (
            <Field
              key={field}
              label={FIELD_LABELS[field] || field}
              value={form[field] || ''}
              onChangeText={(v) => setForm((s) => ({ ...s, [field]: v }))}
              keyboardType={field === 'mobileNumber' ? 'phone-pad' : field === 'email' ? 'email-address' : 'default'}
            />
          ))}

          <Field label="Password" value={form.password} onChangeText={(v) => setForm((s) => ({ ...s, password: v }))} secureTextEntry />

          {roleNeeds.includes('businessType') ? <Field label="Business Type" value={form.businessType} onChangeText={(v) => setForm((s) => ({ ...s, businessType: v }))} /> : null}
          {roleNeeds.includes('businessName') ? <Field label="Business Name" value={form.businessName} onChangeText={(v) => setForm((s) => ({ ...s, businessName: v }))} /> : null}

          {roleNeeds.includes('warehouse') ? (
            <>
              <Text style={styles.fieldLabel}>Warehouse Name</Text>
              <SelectPills
                options={warehouses.map((w) => w.name)}
                value={form.warehouseName}
                onChange={(name) => {
                  const w = warehouses.find((x) => x.name === name);
                  setForm((s) => ({ ...s, warehouseId: w?.warehouseId || '', warehouseName: w?.name || '', regionId: '', regionName: '', zoneId: '', zoneName: '', territoryId: '', territoryName: '', fieldId: '', fieldName: '' }));
                }}
              />
            </>
          ) : null}

          {roleNeeds.includes('region') ? (
            <>
              <Text style={styles.fieldLabel}>Region Name</Text>
              <SelectPills
                options={filteredRegions.map((r) => r.name)}
                value={form.regionName}
                onChange={(name) => {
                  const r = filteredRegions.find((x) => x.name === name);
                  setForm((s) => ({ ...s, regionId: r?.regionId || '', regionName: r?.name || '', zoneId: '', zoneName: '', territoryId: '', territoryName: '', fieldId: '', fieldName: '' }));
                }}
              />
            </>
          ) : null}

          {roleNeeds.includes('zone') ? (
            <>
              <Text style={styles.fieldLabel}>Zone Name</Text>
              <SelectPills
                options={filteredZones.map((z) => z.name)}
                value={form.zoneName}
                onChange={(name) => {
                  const z = filteredZones.find((x) => x.name === name);
                  setForm((s) => ({ ...s, zoneId: z?.zoneId || '', zoneName: z?.name || '', territoryId: '', territoryName: '', fieldId: '', fieldName: '' }));
                }}
              />
            </>
          ) : null}

          {roleNeeds.includes('territory') ? (
            <>
              <Text style={styles.fieldLabel}>Territory Name</Text>
              <SelectPills
                options={filteredAreas.map((a) => a.name)}
                value={form.territoryName}
                onChange={(name) => {
                  const a = filteredAreas.find((x) => x.name === name);
                  setForm((s) => ({ ...s, territoryId: a?.areaId || '', territoryName: a?.name || '', fieldId: '', fieldName: '' }));
                }}
              />
            </>
          ) : null}

          {roleNeeds.includes('field') ? (
            <>
              <Text style={styles.fieldLabel}>Field Name</Text>
              <SelectPills
                options={filteredFields.map((f) => f.name)}
                value={form.fieldName}
                onChange={(name) => {
                  const f = filteredFields.find((x) => x.name === name);
                  setForm((s) => ({ ...s, fieldId: f?.fieldId || '', fieldName: f?.name || '' }));
                }}
              />
            </>
          ) : null}

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
  inputReadonly: { backgroundColor: '#f4f4f5' },
  roleChip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  roleChipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  roleChipText: { color: '#52525b', fontSize: 12 },
  roleChipTextActive: { color: '#047857', fontWeight: '700' },
  actions: { marginTop: 10 },
  primaryBtn: { backgroundColor: '#059669', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});