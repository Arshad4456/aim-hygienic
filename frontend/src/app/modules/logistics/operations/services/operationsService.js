import apiClient from '@/src/app/infrastructure/api/apiClient';
const operationsService = { overview: () => apiClient('/operations/overview'), customerPortal: () => apiClient('/operations/customer-portal') };
export default operationsService;
