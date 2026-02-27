import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/useAuth';
import AuthStack from './AuthStack';
import AppDrawer from './AppDrawer';
import Loader from '../ui/Loader';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <Loader />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? <Stack.Screen name="App" component={AppDrawer} /> : <Stack.Screen name="Auth" component={AuthStack} />}
    </Stack.Navigator>
  );
}
