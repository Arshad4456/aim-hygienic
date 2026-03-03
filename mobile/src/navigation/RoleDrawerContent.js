import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function toGroupTitle(name = '') {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildGroups(modules) {
  const grouped = {};

  modules.forEach((mod) => {
    const segment = (mod.modulePath || '').split('/')[0] || 'dashboard';
    if (!grouped[segment]) grouped[segment] = [];
    grouped[segment].push(mod);
  });

  return Object.entries(grouped).map(([key, items]) => ({
    key,
    title: key === 'dashboard' ? 'Dashboard' : toGroupTitle(key),
    items,
  }));
}

export default function RoleDrawerContent({ modules, activeRoute, onSelect }) {
  const groups = useMemo(() => buildGroups(modules), [modules]);
  const [expanded, setExpanded] = useState(() => Object.fromEntries(groups.map((group, i) => [group.key, i < 4])));

  useEffect(() => {
    setExpanded((prev) => {
      const next = {};
      groups.forEach((group, i) => {
        next[group.key] = prev[group.key] ?? i < 4;
      });
      return next;
    });
  }, [groups]);

  const toggleGroup = (name) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.brandBlock}>
        <View style={styles.brandAvatar}><Text style={styles.brandAvatarText}>AH</Text></View>
        <Text style={styles.brandText}>AIM Hygienics</Text>
      </View>

      {groups.map((group) => (
        <View key={group.key} style={styles.groupBlock}>
          <Pressable style={styles.groupHeader} onPress={() => toggleGroup(group.key)}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Text style={styles.chevron}>{expanded[group.key] ? '▾' : '▸'}</Text>
          </Pressable>

          {expanded[group.key]
            ? group.items.map((mod) => (
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  brandBlock: { alignItems: 'center', marginBottom: 8 },
  brandAvatar: {
    height: 42,
    width: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
  },
  brandAvatarText: { color: '#047857', fontWeight: '700' },
  brandText: { marginTop: 6, fontSize: 12, color: '#52525b', fontWeight: '600' },
  groupBlock: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#27272a' },
  chevron: { fontSize: 14, color: '#52525b' },
  subItem: {
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  subLabel: { fontSize: 14, color: '#27272a' },
  itemActive: {
    backgroundColor: '#dcfce7',
  },
});
