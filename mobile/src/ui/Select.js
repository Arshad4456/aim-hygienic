import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export default function Select({ label = 'Select', onPress }) {
  return (
    <Pressable style={styles.box} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fff', padding: 12 },
  text: { color: '#3f3f46' },
});