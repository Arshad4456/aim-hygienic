import apiClient from "@/src/app/infrastructure/api/apiClient";

const logisticsService = {
  overview: () => apiClient("/logistics/overview"),
};

export default logisticsService;
