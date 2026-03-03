import React, { useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import DashboardHome from '../screens/common/DashboardHome';
import SettingsScreen from '../screens/common/SettingsScreen';
import { getRoleModules } from './RoleMenuConfig';
import { screenRegistry } from './ScreenRegistry';
import RoleDrawerContent from './RoleDrawerContent';

function Header({ title, onMenu, topInset }) {
  return (
    <View style={[styles.header, { paddingTop: topInset, height: 56 + topInset }] }>
      <Pressable onPress={onMenu} style={styles.menuButton}>
        <Text style={styles.menuIcon}>☰</Text>
      </Pressable>
      <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerRight} />
    </View>
  );
}

export default function DrawerNavigator() {
  const insets = useSafeAreaInsets();
  const { roleKey, user } = useAuth();
  const modules = getRoleModules(roleKey);
  const [activeRoute, setActiveRoute] = useState('Home');
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const Current = screens[activeRoute]?.component || DashboardHome;
  const title = screens[activeRoute]?.title || 'Dashboard';

  const nav = useMemo(() => ({
    navigate: (name) => {
      if (screens[name]) setActiveRoute(name);
    },
    jumpTo: (name) => {
      if (screens[name]) setActiveRoute(name);
    },
    goBack: () => setActiveRoute('Home'),
  }), [screens]);

  return (
    <SafeAreaView style={styles.container}>
      <Header title={title} onMenu={() => setDrawerOpen(true)} topInset={insets.top} />
      <View style={styles.body}>
        <Current navigation={nav} />
      </View>

      <Modal transparent animationType="fade" visible={drawerOpen} onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.drawerPanel, { paddingTop: insets.top }]}>
            <RoleDrawerContent
              modules={modules}
              activeRoute={activeRoute}
              onSelect={(routeName) => {
                setActiveRoute(routeName);
                setDrawerOpen(false);
              }}
            />
          </View>
          <Pressable style={styles.backdrop} onPress={() => setDrawerOpen(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  menuButton: { paddingHorizontal: 14, paddingVertical: 8 },
  menuIcon: { fontSize: 24, color: '#18181b', fontWeight: '700' },
  headerTitle: { flex: 1, textAlign: 'left', fontSize: 17, fontWeight: '700', color: '#18181b', paddingRight: 12 },
  headerRight: { width: 12 },
  body: { flex: 1 },
  overlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-start' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  drawerPanel: { width: '82%', maxWidth: 340, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e4e4e7' },
});