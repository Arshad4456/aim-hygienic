import { apiClient } from './client';

export function callEndpoint(path, options) {
  return apiClient(path, options);
}
