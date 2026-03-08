import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../../../../ui/Card';

export default function RawMaterialScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Raw Material QC</Text>
        <Text style={styles.subtitle}>Inspect raw materials and capture QC status before GRN.</Text>
        <View style={styles.emptyWrap}><Text style={styles.empty}>No QC entries yet. Record inspection results for incoming goods.</Text></View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  emptyWrap: { marginTop: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d4d4d8', borderRadius: 12, backgroundColor: '#fafafa', padding: 12 },
  empty: { color: '#6b7280' },
});
