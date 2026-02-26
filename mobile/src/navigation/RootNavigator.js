import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RoleDashboardScreen from '../screens/common/RoleDashboardScreen';
import ModuleDetailsScreen from '../screens/common/ModuleDetailsScreen';
import { useAuth } from '../hooks/useAuth';
import { roleModules } from './roleModules';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function RoleDrawer({ role }) {
  const modules = roleModules[role] || [];

  return (
    <Drawer.Navigator>
      <Drawer.Screen
        name="Dashboard"
        component={RoleDashboardScreen}
        initialParams={{ role, modules }}
      />
      {modules.map((moduleName) => (
        <Drawer.Screen
          key={moduleName}
          name={moduleName}
          component={ModuleDetailsScreen}
          initialParams={{ moduleName, role }}
        />
      ))}
    </Drawer.Navigator>
  );
}

export default function RootNavigator() {
  const { user, initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="RoleHome" options={{ headerShown: false }}>
            {() => <RoleDrawer role={user?.role} />}
          </Stack.Screen>
          <Stack.Screen name="ModuleDetails" component={ModuleDetailsScreen} options={{ title: 'Module Details' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
