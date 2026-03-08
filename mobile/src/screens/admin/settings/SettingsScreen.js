import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      setErr('');
      try {
        const data = await apiClient.get('/users/me');
        const nextUser = data?.data?.user || null;
        if (!mounted) return;
        setUser(nextUser);
        setForm({
          fullName: nextUser?.fullName || '',
          email: nextUser?.email || '',
          mobile: nextUser?.mobile || '',
          address: nextUser?.address || '',
        });
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load account');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const setField = (key, value) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  const onSave = async () => {
    if (!form.fullName?.trim()) {
      setErr('Full Name is required.');
      return;
    }
    setErr('');
    setOk('');
    setSaving(true);
    try {
      const data = await apiClient.put('/users/me', form);
      const nextUser = data?.data?.user || null;
      setUser(nextUser);
      setOk('✅ Account updated.');
    } catch (e) {
      setErr(e.message || 'Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Account Settings</Text>
        <Text style={styles.subtitle}>Review and update your profile details.</Text>

        {err ? <Text style={styles.err}>{err}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}

        <View style={styles.formGrid}>
          <Input label="Full Name" value={form.fullName} onChangeText={(v) => setField('fullName', v)} />
          <Input label="Email" value={form.email} onChangeText={(v) => setField('email', v)} keyboardType="email-address" />
          <Input label="Mobile Number" value={form.mobile} onChangeText={(v) => setField('mobile', v)} keyboardType="phone-pad" />
          <Input
            label="Address"
            value={form.address}
            onChangeText={(v) => setField('address', v)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.actionRow}>
          <Pressable style={[styles.btn, styles.primaryBtn]} onPress={onSave} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => navigation?.navigate?.('admin:settings/change-password')}>
            <Text style={styles.secondaryBtnText}>Change Password</Text>
          </Pressable>
        </View>

        {user ? (
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Signed in as</Text>
            <Text style={styles.metaValue}>{user.fullName || '—'}</Text>
            <Text style={styles.metaHint}>{user.role || user.email || '—'}</Text>
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

function Input({ label, multiline = false, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  err: { marginTop: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 10, padding: 10, fontSize: 12 },
  ok: { marginTop: 10, borderWidth: 1, borderColor: '#a7f3d0', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: 10, padding: 10, fontSize: 12 },
  formGrid: { marginTop: 12, gap: 10 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#111827', backgroundColor: '#fff' },
  inputMultiline: { minHeight: 84, paddingTop: 10 },
  actionRow: { marginTop: 14, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  primaryBtn: { backgroundColor: '#059669' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  secondaryBtn: { borderWidth: 1, borderColor: '#d4d4d8', backgroundColor: '#fff' },
  secondaryBtnText: { color: '#111827', fontWeight: '600', fontSize: 12 },
  metaCard: { marginTop: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  metaTitle: { fontSize: 12, color: '#6b7280' },
  metaValue: { marginTop: 2, fontSize: 14, fontWeight: '700', color: '#111827' },
  metaHint: { marginTop: 2, fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
});
