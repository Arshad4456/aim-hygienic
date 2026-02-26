import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export function AppCard({ title, value, subtitle, children }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {value !== undefined ? <Text style={styles.cardValue}>{value}</Text> : null}
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function AppButton({ label, onPress, loading, disabled, variant = 'primary' }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, variant === 'secondary' ? styles.secondaryButton : styles.primaryButton, disabled ? styles.buttonDisabled : null]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

export function AppInput({ label, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#7a7a7a" {...props} />
    </View>
  );
}

export function EmptyState({ title, subtitle }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  cardTitle: { fontSize: 14, color: '#4c4c4c', marginBottom: 8 },
  cardValue: { fontSize: 22, fontWeight: '700', color: '#101010' },
  cardSubtitle: { fontSize: 13, color: '#666', marginTop: 6 },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: '#0f62fe' },
  secondaryButton: { backgroundColor: '#4a4a4a' },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  inputWrap: { marginBottom: 12 },
  inputLabel: { fontSize: 13, marginBottom: 6, color: '#404040' },
  input: { borderWidth: 1, borderColor: '#d0d0d0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111' },
  emptyWrap: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 16 },
  emptyTitle: { fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { color: '#666' }
});
