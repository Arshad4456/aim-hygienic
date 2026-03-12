import apiClient from '../api/client';

export async function fetchRuntimeDashboard() {
  const { data } = await apiClient.get('/runtime/dashboard');
  if (!data?.dashboard) throw new Error('Invalid runtime dashboard response');
  return data.dashboard;
}