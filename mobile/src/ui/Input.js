import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function Input({
  label,
  error,
  style,
  inputStyle,
  ...props
}) {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error ? styles.inputError : null, inputStyle]}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#fca5a5',
  },
  errorText: {
    marginTop: 6,
    color: '#b91c1c',
    fontSize: 12,
  },
});