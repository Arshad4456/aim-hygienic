import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

export default function Screen({ title, children }) {
  return (
    <SafeAreaView style={styles.safe}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bg }, title: { fontSize: 20, fontWeight: '700', color: colors.text, padding: 14 }, body: { flex: 1, paddingHorizontal: 14, paddingBottom: 14 } });
