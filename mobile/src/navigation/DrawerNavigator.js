import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import DashboardHome from '../screens/common/DashboardHome';
import SettingsScreen from '../screens/common/SettingsScreen';
import { getRoleModules } from './RoleMenuConfig';
import { screenRegistry } from './ScreenRegistry';
import RoleDrawerContent from './RoleDrawerContent';

function Header({
  title,
  subtitle,
  user,
  searchQuery,
  onSearchChange,
  searchResults,
  onSearchSelect,
  onMenu,
  onAccount,
  topInset,
}) {
  const userInitials = useMemo(() => {
    const source = user?.fullName || user?.role || 'User';
    const [first, second] = String(source).trim().split(/\s+/);
    return `${(first?.[0] || 'U')}${(second?.[0] || 'R')}`.toUpperCase();
  }, [user]);

  return (
    <View style={[styles.headerWrap, { paddingTop: topInset }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={onMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>

        <View style={styles.headerIdentity}>
          <Text numberOfLines={1} style={styles.companyText}>AIM HYGIENICS (PVT) LIMITED</Text>
          <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>

        <Pressable onPress={onAccount} style={styles.avatarButton}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search this dashboard..."
          placeholderTextColor="#71717a"
          style={styles.searchInput}
        />

        {searchQuery.trim() ? (
          <View style={styles.searchResults}>
            <ScrollView nestedScrollEnabled style={styles.searchScroll}>
              {searchResults.length ? (
                searchResults.map((item) => (
                  <Pressable key={item.key} onPress={() => onSearchSelect(item.key)} style={styles.searchItem}>
                    <Text numberOfLines={1} style={styles.searchItemText}>{item.title}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.searchEmpty}>No match found.</Text>
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function DrawerNavigator() {
  const insets = useSafeAreaInsets();
  const { roleKey, user, logout } = useAuth();
  const modules = getRoleModules(roleKey);

  const screens = useMemo(() => {
    const base = {
      Home: { component: DashboardHome, title: `${user?.fullName || 'ERP'} Dashboard` },
      Settings: { component: SettingsScreen, title: 'Settings' },
    };

    modules.forEach((mod) => {
      const Component = screenRegistry[mod.key];
      if (Component) base[mod.key] = { component: Component, title: mod.title };
    });

    return base;
  }, [modules, user?.fullName]);

  const availableModules = useMemo(() => modules.filter((mod) => Boolean(screens[mod.key])), [modules, screens]);

  const defaultRoute = useMemo(() => {
    const dashboardModule = availableModules.find((mod) => !mod.modulePath);
    return dashboardModule?.key || availableModules[0]?.key || 'Home';
  }, [availableModules]);

  const [activeRoute, setActiveRoute] = useState(defaultRoute);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveRoute(defaultRoute);
  }, [defaultRoute]);

  const Current = screens[activeRoute]?.component || screens[defaultRoute]?.component || DashboardHome;
  const title = screens[activeRoute]?.title || screens[defaultRoute]?.title || 'Dashboard';

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableModules;
    return availableModules.filter((mod) => mod.title.toLowerCase().includes(query));
  }, [availableModules, searchQuery]);

  const settingsRoute = useMemo(() => {
    const matched = availableModules.find((mod) => (mod.modulePath || '').toLowerCase() === 'settings');
    return matched?.key || 'Settings';
  }, [availableModules]);

  const changePasswordRoute = useMemo(() => {
    const matched = availableModules.find((mod) => (mod.modulePath || '').toLowerCase().includes('change-password'));
    return matched?.key || null;
  }, [availableModules]);

  const goToRoute = (name) => {
    if (!screens[name]) return;
    setActiveRoute(name);
    setSearchQuery('');
    setAccountOpen(false);
  };

  const nav = useMemo(
    () => ({
      navigate: (name) => goToRoute(name),
      jumpTo: (name) => goToRoute(name),
      goBack: () => setActiveRoute(defaultRoute),
    }),
    [defaultRoute, screens]
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={title}
        subtitle={user?.role || roleKey}
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResults={filteredModules}
        onSearchSelect={goToRoute}
        onMenu={() => setDrawerOpen(true)}
        onAccount={() => setAccountOpen(true)}
        topInset={insets.top}
      />
      <View style={styles.body}>
        <Current navigation={nav} />
      </View>

      <Modal transparent animationType="fade" visible={drawerOpen} onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.drawerPanel, { paddingTop: insets.top }]}>
            <RoleDrawerContent
              roleKey={roleKey}
              userRole={user?.role}
              modules={availableModules}
              activeRoute={activeRoute}
              onSelect={(routeName) => {
                goToRoute(routeName);
                setDrawerOpen(false);
              }}
            />
          </View>
          <Pressable style={styles.backdrop} onPress={() => setDrawerOpen(false)} />
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={accountOpen} onRequestClose={() => setAccountOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setAccountOpen(false)}>
          <View style={[styles.accountMenu, { marginTop: insets.top + 74 }]}>
            <Text style={styles.accountName}>{user?.fullName || 'User'}</Text>
            <Text style={styles.accountRole}>{user?.role || roleKey}</Text>

            <Pressable style={styles.accountItem} onPress={() => goToRoute(settingsRoute)}>
              <Text style={styles.accountItemText}>Account Settings</Text>
            </Pressable>
            {changePasswordRoute ? (
              <Pressable style={styles.accountItem} onPress={() => goToRoute(changePasswordRoute)}>
                <Text style={styles.accountItemText}>Change Password</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.accountItem}
              onPress={async () => {
                setAccountOpen(false);
                await logout();
              }}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  headerWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    backgroundColor: '#fff',
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: { paddingHorizontal: 14, paddingVertical: 8 },
  menuIcon: { fontSize: 24, color: '#18181b', fontWeight: '700' },
  headerIdentity: { flex: 1, paddingRight: 8 },
  companyText: { fontSize: 10, color: '#71717a', fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#18181b', marginTop: 2 },
  headerSubtitle: { fontSize: 12, color: '#52525b', marginTop: 1 },
  avatarButton: {
    height: 38,
    width: 38,
    borderRadius: 19,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#065f46', fontWeight: '700' },
  searchWrap: { paddingHorizontal: 12, marginTop: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#18181b',
  },
  searchResults: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    backgroundColor: '#fff',
    maxHeight: 240,
    overflow: 'hidden',
  },
  searchScroll: { maxHeight: 240 },
  searchItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  searchItemText: { fontSize: 14, color: '#27272a' },
  searchEmpty: { padding: 12, color: '#71717a', fontSize: 13 },
  body: { flex: 1 },
  overlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-start' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  drawerPanel: { width: '82%', maxWidth: 340, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e4e4e7' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'flex-end', paddingRight: 10 },
  accountMenu: {
    width: 220,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 10,
  },
  accountName: { fontSize: 15, fontWeight: '700', color: '#18181b' },
  accountRole: { fontSize: 12, color: '#71717a', marginBottom: 8 },
  accountItem: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10 },
  accountItemText: { fontSize: 14, color: '#27272a' },
  logoutText: { fontSize: 14, color: '#dc2626', fontWeight: '600' },
});