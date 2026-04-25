import apiClient from "./apiClient";

const inventoryService = {
  overview: () => apiClient("/inventory/overview"),
  stockSummary: () => apiClient("/inventory/stock-summary"),
  ledger: () => apiClient("/inventory/ledger"),
  warehouseOverview: () => apiClient("/warehouse/overview"),
};

export default inventoryService;
