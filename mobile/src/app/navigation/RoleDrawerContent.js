import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ADMIN_SIDEBAR_MODULES } from './AdminSidebarConfig';
import { APP_CONFIG, getAppInitials } from '../config/app';

function toGroupTitle(name = '') {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}


function scoreModuleMatch(query, groupTitle, module, t = (value) => value) {
  const value = String(query || '').trim().toLowerCase();
  if (!value) return 0;
  const terms = value.split(/\s+/).filter(Boolean);
  const translatedGroupTitle = t(groupTitle);
  const translatedTitle = t(module.title);
  const haystack = [groupTitle, translatedGroupTitle, module.title, translatedTitle, module.modulePath, module.route, module.key]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const allTermsMatch = terms.every((term) => haystack.includes(term));
  if (!allTermsMatch) return 0;

  const title = String(translatedTitle || module.title || '').toLowerCase();
  const starts = title.startsWith(value);
  const includes = title.includes(value);
  const pathIncludes = String(module.modulePath || '').toLowerCase().includes(value);
  return (starts ? 4 : 0) + (includes ? 2 : 0) + (pathIncludes ? 1 : 0) + 1;
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

export default function RoleDrawerContent({ roleKey, userRole, modules, activeRoute, onSelect, t = (v) => v }) {
  const [searchTerm, setSearchTerm] = useState('');

  const items = useMemo(() => {
    if (roleKey === 'admin') {
      const normalizedRole = String(userRole || '').trim().toLowerCase();
      const canAccessCompanyManagement = normalizedRole === 'admin' || normalizedRole === 'system admin';
      const adminMenu = buildAdminMenu(modules);
      if (canAccessCompanyManagement) return adminMenu;
      return adminMenu.filter((item) => item.key !== 'company');
    }
    return buildDefaultGroups(modules);
  }, [roleKey, userRole, modules]);

  const filteredItems = useMemo(() => {
    const value = String(searchTerm || '').trim();
    if (!value) return items;

    return items
      .map((item) => {
        if (item.type === 'link') {
          const score = scoreModuleMatch(value, item.title, item.module, t);
          if (!score) return null;
          return { ...item, score };
        }

        const matches = item.items
          .map((mod) => ({ mod, score: scoreModuleMatch(value, item.title, mod, t) }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score || String(a.mod.title || '').localeCompare(String(b.mod.title || '')))
          .map((entry) => entry.mod);

        if (!matches.length) return null;
        return {
          ...item,
          items: matches,
          score: Math.max(...matches.map((mod) => scoreModuleMatch(value, item.title, mod, t))),
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [items, searchTerm, t]);

  const [expanded, setExpanded] = useState(() => Object.fromEntries(filteredItems.map((item, i) => [item.key, i < 4])));

  useEffect(() => {
    setExpanded((prev) => {
      const next = {};
      filteredItems.forEach((item, i) => {
        next[item.key] = prev[item.key] ?? i < 4;
      });
      return next;
    });
  }, [filteredItems]);

  const toggleGroup = (name) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.brandBlock}>
        <View style={styles.brandAvatar}><Text style={styles.brandAvatarText}>{getAppInitials()}</Text></View>
        <Text style={styles.brandText}>{APP_CONFIG.shortName}</Text>
      </View>

      <TextInput
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder={t('Deep search modules...')}
        placeholderTextColor="#71717a"
        style={styles.searchInput}
      />

      {filteredItems.map((item) => {
        if (item.type === 'link') {
          const active = activeRoute === item.module.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.linkItem, active ? styles.itemActive : null]}
              onPress={() => onSelect(item.module.key)}
            >
              <Text style={styles.subLabel}>{t(item.title)}</Text>
            </Pressable>
          );
        }

        return (
          <View key={item.key} style={styles.groupBlock}>
            <Pressable style={styles.groupHeader} onPress={() => toggleGroup(item.key)}>
              <Text style={styles.groupTitle}>{t(item.title)}</Text>
              <Text style={styles.chevron}>{expanded[item.key] ? '▾' : '▸'}</Text>
            </Pressable>

            {expanded[item.key]
              ? item.items.map((mod) => (
                  <Pressable
                    key={mod.key}
                    style={[styles.subItem, activeRoute === mod.key ? styles.itemActive : null]}
                    onPress={() => onSelect(mod.key)}
                  >
                    <Text style={styles.subLabel}>{t(mod.title)}</Text>
                  </Pressable>
                ))
              : null}
          </View>
        );
      })}

      {!filteredItems.length ? <Text style={styles.emptyText}>{t('No modules found for this search.')}</Text> : null}

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
  searchInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    color: '#18181b',
    fontSize: 14,
    marginBottom: 8,
  },
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
  emptyText: {
    textAlign: 'center',
    color: '#71717a',
    fontSize: 13,
    paddingVertical: 8,
  },
});