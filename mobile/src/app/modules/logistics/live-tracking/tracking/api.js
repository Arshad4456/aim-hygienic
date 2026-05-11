import apiClient from '../../../../infrastructure/api/client';

export async function postStartDuty(payload) {
  const { data } = await apiClient.post('/location/start-duty', payload);
  return data;
}

export async function postLocationUpdate(points) {
  const { data } = await apiClient.post('/location/update', { points });
  return data;
}

export async function postEndDuty(payload) {
  const { data } = await apiClient.post('/location/end-duty', payload);
  return data;
}

export async function getDutySummary(userId) {
  const { data } = await apiClient.get(`/location/summary/${encodeURIComponent(String(userId || '').trim())}`);
  return data;
}
