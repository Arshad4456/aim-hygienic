import apiClient from "./apiClient";

const logisticsService = {
  overview: () => apiClient("/logistics/overview"),
};

export default logisticsService;
