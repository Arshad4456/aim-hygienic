import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <View style={styles.toast}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 10 },
  text: { color: '#991b1b', fontSize: 13 },
});
