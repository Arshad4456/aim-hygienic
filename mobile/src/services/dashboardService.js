import api from './api';

export async function getDashboardSummary(role) {
  const { data } = await api.get('/api/dashboard/mobile', {
    params: { role }
  });
  return data;
}

export async function getNotifications() {
  const { data } = await api.get('/api/messages/notifications');
  return data;
}
