import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../api/client';

export default function RuntimeDataModuleScreen({ title, moduleItem, endpointMap = {} }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataBySection, setDataBySection] = useState({});

  const sections = useMemo(() => moduleItem?.selectedSections || [], [moduleItem]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const next = {};
        for (const section of sections) {
          const endpoint = endpointMap[section];
          if (!endpoint) continue;
          const { data } = await apiClient.get(endpoint);
          next[section] = data;
        }
        if (!cancelled) setDataBySection(next);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load module data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sections.join('|'), JSON.stringify(endpointMap)]);

  const canCreate = (moduleItem?.allowedActions || []).includes('create');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {canCreate ? <Text style={styles.createBadge}>CREATE</Text> : null}
      </View>
      <Text style={styles.meta}>Type: {moduleItem?.moduleType || 'default'}</Text>
      <Text style={styles.meta}>Actions: {(moduleItem?.allowedActions || []).join(', ') || '-'}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <Text style={styles.meta}>Loading data...</Text> : null}

      {sections.map((section) => {
        const sectionData = dataBySection[section] || {};
        const list = Object.values(sectionData).find((val) => Array.isArray(val)) || [];
        const sectionPerm = (moduleItem?.sectionPermissions || []).find((sp) => sp.sectionCode === section);
        return (
          <View key={section} style={styles.card}>
            <Text style={styles.cardTitle}>{section}</Text>
            <Text style={styles.meta}>Allowed: {(sectionPerm?.allowedActions || []).join(', ') || '-'}</Text>
            <Text style={styles.meta}>Records: {list.length}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  createBadge: { fontSize: 11, color: '#fff', backgroundColor: '#059669', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  meta: { fontSize: 13, color: '#4b5563' },
  error: { fontSize: 13, color: '#991b1b' },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
});
