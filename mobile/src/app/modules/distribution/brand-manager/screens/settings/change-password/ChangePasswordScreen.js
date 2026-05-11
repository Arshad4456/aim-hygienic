import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import apiClient from '../../../../../../infrastructure/api/client';
import Card from '../../../../../../foundation/ui/Card';

const rules = ['At least 8 characters', 'One capital letter', 'One number', 'One symbol'];

function validatePassword(value) {
  if (!value || value.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(value)) return 'Password must include at least one capital letter.';
  if (!/[0-9]/.test(value)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include at least one symbol.';
  return '';
}

export default function ChangePasswordScreen() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const setField = (key, value) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  const onSubmit = async () => {
    setErr('');
    setOk('');

    const validationError = validatePassword(form.newPassword);
    if (validationError) {
      setErr(validationError);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setErr('New password and confirm password must match.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.put('/users/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setOk('✅ Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setErr(error.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Brand Manager Change Password</Text>
        <Text style={styles.subtitle}>Use a strong password to secure your account.</Text>

        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Password rules</Text>
          {rules.map((rule) => (
            <Text key={rule} style={styles.ruleItem}>• {rule}</Text>
          ))}
        </View>

        {err ? <Text style={styles.err}>{err}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}

        <View style={styles.formGrid}>
          <PasswordField
            label="Current Password"
            value={form.currentPassword}
            show={show.current}
            onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
            onChangeText={(v) => setField('currentPassword', v)}
          />
          <PasswordField
            label="New Password"
            value={form.newPassword}
            show={show.next}
            onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
            onChangeText={(v) => setField('newPassword', v)}
          />
          <PasswordField
            label="Confirm New Password"
            value={form.confirmPassword}
            show={show.confirm}
            onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
            onChangeText={(v) => setField('confirmPassword', v)}
          />
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.primaryBtn} onPress={onSubmit} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Update Password'}</Text>
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}

function PasswordField({ label, value, onChangeText, show, onToggle }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          secureTextEntry={!show}
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholderTextColor="#9ca3af"
        />
        <Pressable style={styles.toggleBtn} onPress={onToggle}>
          <Text style={styles.toggleText}>{show ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  rulesBox: { marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fafafa', padding: 10 },
  rulesTitle: { fontSize: 13, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  ruleItem: { fontSize: 12, color: '#4b5563', marginTop: 2 },
  err: { marginTop: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 10, padding: 10, fontSize: 12 },
  ok: { marginTop: 10, borderWidth: 1, borderColor: '#a7f3d0', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: 10, padding: 10, fontSize: 12 },
  formGrid: { marginTop: 12, gap: 10 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, paddingRight: 52, fontSize: 13, color: '#111827', backgroundColor: '#fff' },
  toggleBtn: { position: 'absolute', right: 10, top: 10 },
  toggleText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  actionRow: { marginTop: 14, flexDirection: 'row' },
  primaryBtn: { backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});