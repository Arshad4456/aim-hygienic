import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/useAuth';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Toast from '../../ui/Toast';

export default function LoginScreen() {
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit() {
    setError('');
    setLoading(true);
    try {
      await login({ mobile: mobile.trim(), password });
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.badge}><Text style={styles.badgeText}>AH</Text></View>
          <View>
            <Text style={styles.title}>AIM Hygienic ERP</Text>
            <Text style={styles.subtitle}>Login to continue</Text>
          </View>
        </View>

        <Toast message={error} />

        <View style={styles.form}>
          <Input label="Mobile Number" value={mobile} onChangeText={setMobile} autoCapitalize="none" keyboardType="phone-pad" placeholder="03xx-xxxxxxx" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Enter Your Password" />
          <Button title={loading ? 'Signing in...' : 'Login'} onPress={onSubmit} loading={loading} />
          <Text style={styles.hint}>Admin creates users and assigns roles.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4f4f5', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e4e4e7', padding: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#047857', fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: '#18181b' },
  subtitle: { fontSize: 13, color: '#52525b', marginTop: 2 },
  form: { gap: 12 },
  hint: { textAlign: 'center', color: '#71717a', fontSize: 12, marginTop: 2 },
});