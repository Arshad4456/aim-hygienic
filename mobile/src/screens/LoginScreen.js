import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
      <View style={styles.wrapper}>
        <Text style={styles.title}>AIM ERP</Text>
        <Text style={styles.subtitle}>Sign in using your existing backend account</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="phone-pad"
          placeholder="Mobile"
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

        <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 12,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
  },
  button: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.button,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});
