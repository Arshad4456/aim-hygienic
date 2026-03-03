import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function buildGroups(modules) {
  const grouped = {};
  modules.forEach((mod) => {
    const segment = (mod.modulePath || 'other').split('/')[0] || 'other';
    if (!grouped[segment]) grouped[segment] = [];
    grouped[segment].push(mod);
  });
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
}

export default function RoleDrawerContent({ modules, activeRoute, onSelect }) {
  const groups = useMemo(() => buildGroups(modules), [modules]);
  const [expanded, setExpanded] = useState(() => Object.fromEntries(groups.map(([name], i) => [name, i < 3])));

  const toggleGroup = (name) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable style={[styles.item, activeRoute === 'Home' ? styles.itemActive : null]} onPress={() => onSelect('Home')}>
        <Text style={styles.itemLabel}>Home</Text>
      </Pressable>

      {groups.map(([groupName, items]) => (
        <View key={groupName} style={styles.groupBlock}>
          <Pressable style={styles.groupHeader} onPress={() => toggleGroup(groupName)}>
            <Text style={styles.groupTitle}>{groupName.toUpperCase()}</Text>
            <Text style={styles.chevron}>{expanded[groupName] ? '−' : '+'}</Text>
          </Pressable>
          {expanded[groupName]
            ? items.map((mod) => (
                <Pressable
                  key={mod.key}
                  style={[styles.subItem, activeRoute === mod.key ? styles.itemActive : null]}
                  onPress={() => onSelect(mod.key)}
                >
                  <Text style={styles.subLabel}>{mod.title}</Text>
                </Pressable>
              ))
            : null}
        </View>
      ))}

      <Pressable style={[styles.item, activeRoute === 'Settings' ? styles.itemActive : null]} onPress={() => onSelect('Settings')}>
        <Text style={styles.itemLabel}>Settings</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 8 },
  groupBlock: { marginBottom: 8 },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  groupTitle: { fontSize: 12, fontWeight: '700', color: '#52525b' },
  chevron: { fontSize: 18, color: '#52525b', lineHeight: 18 },
  item: { paddingHorizontal: 14, paddingVertical: 12 },
  itemLabel: { fontSize: 15, color: '#18181b', fontWeight: '600' },
  subItem: { paddingVertical: 10, paddingHorizontal: 14, paddingLeft: 24 },
  subLabel: { fontSize: 14, color: '#27272a' },
  itemActive: { backgroundColor: '#ecfdf5' },
});
