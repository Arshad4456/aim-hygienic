import apiClient from './apiClient';
const operationsService = { overview: () => apiClient('/operations/overview'), customerPortal: () => apiClient('/operations/customer-portal') };
export default operationsService;
