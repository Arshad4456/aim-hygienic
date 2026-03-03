import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import useAuth from '../auth/useAuth';
import AuthStack from './AuthStack';
import RoleDrawer from './RoleDrawer';
import Loading from '../shared/components/Loading';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthed, booting } = useAuth();
  if (booting) return <Loading />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthed ? <Stack.Screen name="App" component={RoleDrawer} /> : <Stack.Screen name="Auth" component={AuthStack} />}
    </Stack.Navigator>
  );
}
