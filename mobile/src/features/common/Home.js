import React from 'react';
import { Text } from 'react-native';
import useAuth from '../../auth/useAuth';
import DashboardShell from '../../shared/dashboard/DashboardShell';

export default function Home() {
  const { user } = useAuth();
  return <DashboardShell title="Dashboard Home"><Text>Welcome {user?.fullName || user?.name || 'User'}</Text></DashboardShell>;
}
