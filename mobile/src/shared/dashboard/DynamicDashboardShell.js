import React, { useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import DynamicDashboardHome from './DynamicDashboardHome';
import { resolveRuntimeModuleRenderer } from '../../runtime/moduleRegistry';

function Header({ dashboard, onOpenDrawer, onBackHome }) {
  const company = dashboard?.company || {};
  const settings = dashboard?.settings || {};
  const role = dashboard?.role || {};
  const shell = dashboard?.shell || {};
  const appName = settings.appName || company.name || 'ERP';
  const subscription = company.subscription || null;
  const isTrial = String(company.lifecycleStatus || "").toLowerCase() === "trial";

  return (
    <View style={styles.headerWrap}>
      <Pressable onPress={onOpenDrawer} style={styles.menuButton}><Text style={styles.menuIcon}>☰</Text></Pressable>
      <View style={styles.headerBody}>
        <Text numberOfLines={1} style={styles.headerTitle}>{appName}</Text>
        <Text numberOfLines={1} style={styles.headerSubtitle}>{role.roleName || role.roleCode}</Text>
      </View>
      <View style={styles.headerActions}>
        {shell.shellConfig?.hasNotifications ? <Text style={styles.actionChip}>🔔</Text> : null}
        {shell.shellConfig?.hasSettingsShortcut ? <Text style={styles.actionChip}>⚙️</Text> : null}
        {subscription?.planName ? <Text style={styles.planChip}>{subscription.planName}</Text> : null}
        {isTrial ? <Text style={styles.trialChip}>TRIAL</Text> : null}
        <Pressable onPress={onBackHome}><Text style={styles.actionChip}>🏠</Text></Pressable>
      </View>
    </View>
  );
}

export default function DynamicDashboardShell({ dashboard }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeModuleCode, setActiveModuleCode] = useState(null);

  const modules = dashboard?.modules || [];
  const sidebarItems = useMemo(
    () => (dashboard?.shell?.sidebarItems || []).filter((item) => item?.isActive !== false).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [dashboard]
  );

  const activeModule = modules.find((moduleItem) => moduleItem.moduleCode === activeModuleCode) || null;
  const ActiveRenderer = resolveRuntimeModuleRenderer(activeModule?.moduleCode);
  const primaryColor = dashboard?.company?.primaryColor || '#059669';

  return (
    <SafeAreaView style={[styles.container, { borderTopColor: primaryColor }]}> 
      <Header
        dashboard={dashboard}
        onOpenDrawer={() => setDrawerOpen(true)}
        onBackHome={() => setActiveModuleCode(null)}
      />

      <View style={styles.body}>
        {activeModule ? (
          <ActiveRenderer moduleItem={activeModule} dashboard={dashboard} />
        ) : (
          <DynamicDashboardHome dashboard={dashboard} onOpenModule={(moduleCode) => setActiveModuleCode(moduleCode)} />
        )}
      </View>

      <Modal transparent animationType="fade" visible={drawerOpen} onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerPanel}>
            <Text style={styles.drawerTitle}>Modules</Text>
            <ScrollView>
              {sidebarItems.map((item) => (
                <Pressable
                  key={item.code}
                  style={styles.drawerItem}
                  onPress={() => {
                    setActiveModuleCode(item.code);
                    setDrawerOpen(false);
                  }}
                >
                  <Text style={styles.drawerItemText}>{item.label}</Text>
                </Pressable>
              ))}
              {sidebarItems.length === 0 ? <Text style={styles.emptyText}>No modules available.</Text> : null}
            </ScrollView>
          </View>
          <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8', borderTopWidth: 3 },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  menuButton: { paddingHorizontal: 8, paddingVertical: 6 },
  menuIcon: { fontSize: 22, color: '#111827', fontWeight: '700' },
  headerBody: { flex: 1, paddingHorizontal: 8 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionChip: { fontSize: 16 },
  planChip: { fontSize: 10, color: '#1f2937', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  trialChip: { fontSize: 10, color: '#92400e', backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  body: { flex: 1 },
  drawerOverlay: { flex: 1, flexDirection: 'row' },
  drawerPanel: { width: 270, backgroundColor: '#fff', paddingTop: 28, paddingHorizontal: 12 },
  drawerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#111827' },
  drawerItem: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, marginBottom: 8 },
  drawerItemText: { color: '#1f2937', fontSize: 14, fontWeight: '500' },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  emptyText: { color: '#6b7280', fontSize: 13, marginTop: 8 },
});
