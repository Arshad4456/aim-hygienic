import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DateRangePicker() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>Date range picker placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fff', padding: 12 },
  text: { color: '#3f3f46', fontSize: 13 },
});