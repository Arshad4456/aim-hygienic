import { useContext } from 'react';
import { RuntimeDashboardContext } from './RuntimeDashboardContext';

export function useRuntimeDashboard() {
  const context = useContext(RuntimeDashboardContext);
  if (!context) throw new Error('useRuntimeDashboard must be used inside RuntimeDashboardProvider');
  return context;
}