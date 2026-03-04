import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ADMIN_SIDEBAR_MODULES } from './AdminSidebarConfig';

function toGroupTitle(name = '') {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildDefaultGroups(modules) {
  const grouped = {};

  modules.forEach((mod) => {
    const segment = (mod.modulePath || '').split('/')[0] || 'dashboard';
    if (!grouped[segment]) grouped[segment] = [];
    grouped[segment].push(mod);
  });

  return Object.entries(grouped).map(([key, items]) => ({
    type: 'group',
    key,
    title: key === 'dashboard' ? 'Dashboard' : toGroupTitle(key),
    items,
  }));
}

function buildAdminMenu(modules) {
  const byPath = Object.fromEntries(modules.map((mod) => [String(mod.modulePath || '').toLowerCase(), mod]));

  return ADMIN_SIDEBAR_MODULES.map((entry) => {
    if (entry.type === 'link') {
      const mod = byPath[String(entry.modulePath || '').toLowerCase()];
      if (!mod) return null;
      return {
        type: 'link',
        key: entry.key,
        title: entry.title,
        module: mod,
      };
    }

    const items = entry.children
      .map((child) => {
        const mod = byPath[String(child.modulePath || '').toLowerCase()];
        if (!mod) return null;
        return { ...mod, title: child.title };
      })
      .filter(Boolean);

    if (!items.length) return null;
    return {
      type: 'group',
      key: entry.key,
      title: entry.title,
      items,
    };
  }).filter(Boolean);
}

export default function RoleDrawerContent({ roleKey, modules, activeRoute, onSelect }) {
  const items = useMemo(() => {
    if (roleKey === 'admin') return buildAdminMenu(modules);
    return buildDefaultGroups(modules);
  }, [roleKey, modules]);

  const [expanded, setExpanded] = useState(() => Object.fromEntries(items.map((item, i) => [item.key, i < 4])));

  useEffect(() => {
    setExpanded((prev) => {
      const next = {};
      items.forEach((item, i) => {
        next[item.key] = prev[item.key] ?? i < 4;
      });
      return next;
    });
  }, [items]);

  const toggleGroup = (name) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.brandBlock}>
        <View style={styles.brandAvatar}><Text style={styles.brandAvatarText}>AH</Text></View>
        <Text style={styles.brandText}>AIM Hygienics</Text>
      </View>

      {items.map((item) => {
        if (item.type === 'link') {
          const active = activeRoute === item.module.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.linkItem, active ? styles.itemActive : null]}
              onPress={() => onSelect(item.module.key)}
            >
              <Text style={styles.subLabel}>{item.title}</Text>
            </Pressable>
          );
        }

        return (
          <View key={item.key} style={styles.groupBlock}>
            <Pressable style={styles.groupHeader} onPress={() => toggleGroup(item.key)}>
              <Text style={styles.groupTitle}>{item.title}</Text>
              <Text style={styles.chevron}>{expanded[item.key] ? '▾' : '▸'}</Text>
            </Pressable>

            {expanded[item.key]
              ? item.items.map((mod) => (
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
        );
      })}

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
  linkItem: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});