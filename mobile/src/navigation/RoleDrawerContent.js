import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';

function buildGroups(modules) {
  const grouped = {};
  modules.forEach((mod) => {
    const segment = (mod.modulePath || 'other').split('/')[0] || 'other';
    if (!grouped[segment]) grouped[segment] = [];
    grouped[segment].push(mod);
  });
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
}

export default function RoleDrawerContent({ state, navigation, descriptors, modules }) {
  const groups = useMemo(() => buildGroups(modules), [modules]);
  const [expanded, setExpanded] = useState(() => Object.fromEntries(groups.map(([name], i) => [name, i < 3])));

  const activeRoute = state.routeNames[state.index];

  const toggleGroup = (name) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <DrawerContentScrollView>
      <DrawerItem
        label="Home"
        focused={activeRoute === 'Home'}
        onPress={() => navigation.navigate('Home')}
      />

      {groups.map(([groupName, items]) => (
        <View key={groupName}>
          <Pressable style={styles.groupHeader} onPress={() => toggleGroup(groupName)}>
            <Text style={styles.groupTitle}>{groupName.toUpperCase()}</Text>
            <Text style={styles.chevron}>{expanded[groupName] ? '−' : '+'}</Text>
          </Pressable>
          {expanded[groupName]
            ? items.map((mod) => (
                <DrawerItem
                  key={mod.key}
                  label={mod.title}
                  focused={activeRoute === mod.key}
                  onPress={() => navigation.navigate(mod.key)}
                  style={styles.subItem}
                  labelStyle={styles.subLabel}
                />
              ))
            : null}
        </View>
      ))}

      <DrawerItem
        label="Settings"
        focused={activeRoute === 'Settings'}
        onPress={() => navigation.navigate('Settings')}
      />

      {state.routes.map((route) => {
        if (route.name === 'Home' || route.name === 'Settings') return null;
        if (modules.some((mod) => mod.key === route.name)) return null;
        const label = descriptors[route.key]?.options?.title || route.name;
        return <DrawerItem key={route.key} label={label} onPress={() => navigation.navigate(route.name)} />;
      })}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 4,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#52525b',
  },
  chevron: {
    fontSize: 18,
    color: '#52525b',
    lineHeight: 18,
  },
  subItem: {
    marginVertical: 0,
    marginHorizontal: 4,
  },
  subLabel: {
    fontSize: 14,
  },
});
