import React from 'react';
import { Pressable, Text } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { useAuth } from '../auth/useAuth';
import DashboardHome from '../screens/common/DashboardHome';
import SettingsScreen from '../screens/common/SettingsScreen';
import { getRoleModules } from './RoleMenuConfig';
import { screenRegistry } from './ScreenRegistry';
import RoleDrawerContent from './RoleDrawerContent';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  const { roleKey, user } = useAuth();
  const modules = getRoleModules(roleKey);

  return (
    <Drawer.Navigator
      useLegacyImplementation={false}
      drawerContent={(props) => <RoleDrawerContent {...props} modules={modules} />}
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#18181b',
        drawerActiveTintColor: '#059669',
        headerBackVisible: false,
        headerLeft: () => (
          <Pressable onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontSize: 24, color: '#18181b', fontWeight: '700' }}>☰</Text>
          </Pressable>
        ),
      })}
    >
      <Drawer.Screen name="Home" component={DashboardHome} options={{ title: `${user?.fullName || 'ERP'} Dashboard` }} />
      {modules.map((mod) => {
        const Component = screenRegistry[mod.key];
        if (!Component) return null;
        return <Drawer.Screen key={mod.key} name={mod.key} component={Component} options={{ title: mod.title }} />;
      })}
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
