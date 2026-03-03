import React from 'react';
import { createDrawerNavigator, DrawerToggleButton } from '@react-navigation/drawer';
import { useAuth } from '../auth/useAuth';
import DashboardHome from '../screens/common/DashboardHome';
import SettingsScreen from '../screens/common/SettingsScreen';
import { getRoleModules } from './RoleMenuConfig';
import { screenRegistry } from './ScreenRegistry';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  const { roleKey, user } = useAuth();
  const modules = getRoleModules(roleKey);

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#18181b',
        drawerActiveTintColor: '#059669',
        headerLeft: (props) => <DrawerToggleButton {...props} tintColor="#18181b" />,
      }}
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
