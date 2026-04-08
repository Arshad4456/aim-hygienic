import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '../../../../api/client';
import Card from '../../../../ui/Card';
import Loader from '../../../../ui/Loader';
import { AIM_USER_ROLES, COMMON_USER_FIELDS, DISTRIBUTOR_TEAM_ROLES, FIELD_LABELS, ROLE_EXTRA_FIELDS, validatePassword } from '../roleConfig';

const SYSTEM_LEVEL_ROLES = new Set(['admin', 'system admin', 'company admin']);

function buildCompanyUserPrefix(companyName, companyId) {
  const source = String(companyName || companyId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return source.slice(0, 3);
}

function nextCompanyScopedUserId(users, prefix) {
  if (!prefix) return '';
  const matcher = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  const maxSerial = (users || []).reduce((max, user) => {
    const userId = String(user?.userId || '').trim();
    const match = userId.match(matcher);
    if (!match) return max;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isNaN(parsed)) return max;
    return Math.max(max, parsed);
  }, 0);
  return `${prefix}-${String(maxSerial + 1).padStart(2, '0')}`;
}

async function fileToBase64FromUri(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read PDF file'));
    reader.readAsDataURL(blob);
  });
}

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

export default function AddScreen({ navigation, mode = 'admin' }) {
  const distributorMode = mode === 'distributor';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [fieldsWarning, setFieldsWarning] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [fields, setFields] = useState([]);
  const [me, setMe] = useState(null);

  const [form, setForm] = useState({
    userId: '00',
    role: '',
    fullName: '',
    email: '',
    mobileNumber: '',
    cnicNo: '',
    address: '',
    businessType: '',
    businessName: '',
    companyId: '',
    companyName: '',
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
    documentPdf: '',
    documentPdfUrl: '',
    documentPdfObjectKey: '',
    documentPdfName: '',
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
          setFieldsWarning('');
        } catch (fieldErr) {
          f = { data: { fields: [] } };
          setFieldsWarning(fieldErr?.message || 'Fields API unavailable');
        }

        if (!mounted) return;

        const userRows = u.data?.users || [];
        setUsers(userRows);
        setWarehouses(w.data?.warehouses || []);
        setRegions(r.data?.regions || []);
        setZones(z.data?.zones || []);
        setAreas(a.data?.areas || []);
        setFields(f.data?.fields || []);
        const meRes = await apiClient.get('/users/me');
        setMe(meRes.data?.user || null);
        try {
          const companiesRes = await apiClient.get('/companies');
          setCompanies(companiesRes.data?.companies || []);
        } catch (_companyErr) {
          const meRes = await apiClient.get('/users/me');
          const companyId = String(meRes.data?.user?.companyId || '').trim();
          const companyName = String(meRes.data?.user?.companyName || '').trim();
          setCompanies(companyId ? [{ companyId, name: companyName || companyId }] : []);
        }

      
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

  useEffect(() => {
    const actorRole = String(me?.role || '').trim().toLowerCase();
    if (actorRole !== 'company admin') return;
    const companyId = String(me?.companyId || '').trim();
    const companyName = String(me?.companyName || '').trim();
    if (!companyId) return;
    setForm((prev) => ({ ...prev, companyId, companyName }));
  }, [me?.companyId, me?.companyName, me?.role]);

  const nextGlobalUserId = useMemo(() => {
    const maxUserId = (users || []).reduce((max, user) => {
      const parsed = Number.parseInt(String(user?.userId || ""), 10);
      if (Number.isNaN(parsed)) return max;
      return Math.max(max, parsed);
    }, 0);
    return String(maxUserId + 1).padStart(2, "0");
  }, [users]);

  const roleNeeds = useMemo(() => ROLE_EXTRA_FIELDS[form.role] || [], [form.role]);
  const roleOptions = useMemo(() => {
    const actorRole = String(me?.role || '').trim().toLowerCase();
    if (distributorMode) return DISTRIBUTOR_TEAM_ROLES;
    if (actorRole === 'company admin') {
      return AIM_USER_ROLES.filter((candidateRole) => !SYSTEM_LEVEL_ROLES.has(String(candidateRole || '').trim().toLowerCase()));
    }
    return AIM_USER_ROLES;
  }, [distributorMode, me?.role]);
  const requiresCompany = useMemo(() => {
    const normalizedRole = String(form.role || '').trim().toLowerCase();
    return Boolean(normalizedRole && normalizedRole !== 'admin' && normalizedRole !== 'system admin');
  }, [form.role]);
  const userIdCompanyContext = useMemo(() => {
    if (!requiresCompany) return { companyName: '', companyId: '' };
    const actorRole = String(me?.role || '').trim().toLowerCase();
    if (actorRole === 'company admin') {
      return {
        companyName: String(me?.companyName || '').trim(),
        companyId: String(me?.companyId || '').trim(),
      };
    }
    return {
      companyName: String(form.companyName || '').trim(),
      companyId: String(form.companyId || '').trim(),
    };
  }, [form.companyId, form.companyName, me?.companyId, me?.companyName, me?.role, requiresCompany]);
  const nextUserId = useMemo(() => {
    if (!requiresCompany) return nextGlobalUserId;
    const prefix = buildCompanyUserPrefix(userIdCompanyContext.companyName, userIdCompanyContext.companyId);
    return nextCompanyScopedUserId(users, prefix);
  }, [nextGlobalUserId, requiresCompany, userIdCompanyContext.companyId, userIdCompanyContext.companyName, users]);
  useEffect(() => {
    setForm((prev) => ({ ...prev, userId: nextUserId || '' }));
  }, [nextUserId]);

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
    if (requiresCompany && !String(form.companyId || '').trim()) {
      setErr('Company is required for this role.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        ...(distributorMode
          ? {
            companyId: me?.companyId || '',
            companyName: me?.companyName || '',
            warehouseId: me?.warehouseId || '',
            warehouseName: me?.warehouseName || '',
            regionId: me?.regionId || '',
            regionName: me?.regionName || '',
            zoneId: me?.zoneId || '',
            zoneName: me?.zoneName || '',
            territoryId: me?.territoryId || '',
            territoryName: me?.territoryName || '',
          }
          : {}),
      };
      await apiClient.post('/users', payload);
      setOk('✅ User created successfully.');
      setTimeout(() => navigation?.navigate?.(distributorMode ? 'distributor:users' : 'admin:users'), 500);
    } catch (e) {
      setErr(e.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const pickDocumentPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const base64 = await fileToBase64FromUri(asset.uri);
      const uploadRes = await apiClient.post('/uploads/user-document', {
        userId: form.userId || 'unknown',
        contentType: 'application/pdf',
        fileBase64: base64,
        fileName: asset.name || 'document.pdf',
      });
      setForm((s) => ({
        ...s,
        documentPdfUrl: uploadRes?.data?.publicUrl || '',
        documentPdfObjectKey: uploadRes?.data?.objectKey || '',
        documentPdfName: asset.name || 'document.pdf',
      }));
      setErr('');
    } catch (e) {
      setErr(e.message || 'Failed to read PDF file');
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{distributorMode ? 'Distributor Add User' : 'Add User'}</Text>
        <Text style={styles.subtitle}>Create users for warehouses, sales, and suppliers.</Text>

        {err ? <Text style={styles.error}>{err}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}
        {fieldsWarning ? <Text style={styles.warn}>{fieldsWarning} (Add User still works; Field dropdown may remain empty.)</Text> : null}

        <View style={styles.formWrap}>
          <Text style={styles.fieldLabel}>Role</Text>
          <SelectPills options={roleOptions} value={form.role} onChange={(role) => {
            const normalizedRole = String(role || '').trim().toLowerCase();
            setForm((s) => ({
              ...s,
              role,
              companyId: normalizedRole === 'admin' || normalizedRole === 'system admin' ? '' : s.companyId,
              companyName: normalizedRole === 'admin' || normalizedRole === 'system admin' ? '' : s.companyName,
            }));
          }} />

          <Field label="Auto User ID" value={form.userId} onChangeText={() => {}} readOnly />

          {requiresCompany ? (
            <>
              <Text style={styles.fieldLabel}>Company</Text>
              <SelectPills
                options={companies.map((c) => `${c.name} (${c.companyId})`)}
                value={form.companyName && form.companyId ? `${form.companyName} (${form.companyId})` : ''}
                onChange={(label) => {
                  const picked = companies.find((c) => `${c.name} (${c.companyId})` === label);
                  setForm((s) => ({ ...s, companyId: picked?.companyId || '', companyName: picked?.name || '' }));
                }}
              />
            </>
          ) : null}

          {COMMON_USER_FIELDS.map((field) => (
            <Field
              key={field}
              label={FIELD_LABELS[field] || field}
              value={form[field] || ''}
              onChangeText={(v) => setForm((s) => ({ ...s, [field]: v }))}
              keyboardType={field === 'mobileNumber' ? 'phone-pad' : field === 'email' ? 'email-address' : 'default'}
            />
          ))}

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={form.password}
                onChangeText={(v) => setForm((s) => ({ ...s, password: v }))}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                placeholderTextColor="#71717a"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
          </View>

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

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>User Document PDF</Text>
            <View style={styles.docActions}>
              <Pressable style={styles.docBtn} onPress={pickDocumentPdf}>
                <Text style={styles.docBtnText}>Upload PDF</Text>
              </Pressable>
              {form.documentPdfUrl ? (
                <Pressable style={styles.docBtn} onPress={() => Linking.openURL(form.documentPdfUrl)}>
                  <Text style={styles.docBtnText}>Open PDF</Text>
                </Pressable>
              ) : null}
              {form.documentPdfUrl ? (
                <Pressable
                  style={styles.docDeleteBtn}
                  onPress={() => {
                    Alert.alert('Delete Document', 'Are you sure, to delete this document pdf', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => setForm((s) => ({ ...s, documentPdf: '', documentPdfUrl: '', documentPdfObjectKey: '', documentPdfName: '' })) },
                    ]);
                  }}
                >
                  <Text style={styles.docDeleteText}>Delete Document</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.docName}>{form.documentPdfName || 'No document selected.'}</Text>
          </View>

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
  warn: { marginTop: 8, color: '#b45309' },
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
  passwordRow: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    backgroundColor: '#fff',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  passwordInput: { flex: 1, color: '#111827' },
  eyeBtn: {
    width: 42,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  eyeText: { fontSize: 16 },
  roleChip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  roleChipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  roleChipText: { color: '#52525b', fontSize: 12 },
  roleChipTextActive: { color: '#047857', fontWeight: '700' },
  docActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  docBtn: { borderWidth: 1, borderColor: '#059669', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#ecfdf5' },
  docBtnText: { color: '#047857', fontWeight: '700', fontSize: 12 },
  docDeleteBtn: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff1f2' },
  docDeleteText: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
  docName: { marginTop: 5, fontSize: 12, color: '#52525b' },
  actions: { marginTop: 10 },
  primaryBtn: { backgroundColor: '#059669', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
