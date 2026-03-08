import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../../../../ui/Card';

export default function FinalReleaseScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Final Release QC</Text>
        <Text style={styles.subtitle}>Approve final release for dispatch after QC sign-off.</Text>
        <View style={styles.emptyWrap}><Text style={styles.empty}>No final release approvals yet. Finalize QC when batches are complete.</Text></View>
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
