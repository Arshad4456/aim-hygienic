import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import useAuth from '../auth/useAuth';
import { ROLE_MENU } from './RoleMenu.generated';
import { SCREEN_COMPONENTS } from './ScreenRegistry.generated';

const Drawer = createDrawerNavigator();

export default function RoleDrawer() {
  const { user } = useAuth();
  const role = user?.roleKey || user?.role || 'admin';
  const modules = ROLE_MENU[role] || ROLE_MENU.admin || [];

  return (
    <Drawer.Navigator>
      {modules.map((m) => (
        <Drawer.Screen
          key={m.routeName}
          name={m.routeName}
          component={SCREEN_COMPONENTS[m.routeName]}
          initialParams={{ meta: m }}
          options={{ title: m.title }}
        />
      ))}
    </Drawer.Navigator>
  );
}
