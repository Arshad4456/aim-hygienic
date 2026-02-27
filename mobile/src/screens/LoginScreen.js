import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../utils/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      await login({ mobile, password });
    } catch (err) {
      setError(err.message || 'Unable to login.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrapper}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Welcome back</Text>
          <Text style={styles.title}>AIM ERP</Text>
          <Text style={styles.subtitle}>Track hygiene operations, workforce, and performance in one place.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign in</Text>

          <TextInput
            autoCapitalize="none"
            keyboardType="phone-pad"
            placeholder="Mobile number"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
          />

          <TextInput
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && !submitting && styles.buttonPressed]}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  hero: {
    gap: 8,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
    maxWidth: '95%',
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    padding: 18,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8faff',
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
  },
  button: {
    marginTop: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.button,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
    marginBottom: 2,
  },
});
