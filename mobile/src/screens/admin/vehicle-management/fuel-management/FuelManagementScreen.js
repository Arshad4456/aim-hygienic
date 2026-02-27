import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/vehicle-management/fuel-management",
  "moduleKey": "admin:vehicle-management/fuel-management",
  "title": "Fuel Management",
  "endpoints": [
    {
      "method": "POST",
      "path": "/uploads/vehicle-proof"
    },
    {
      "method": "GET",
      "path": "/vehicles"
    },
    {
      "method": "GET",
      "path": "/vehicle-management/trips"
    },
    {
      "method": "GET",
      "path": "/vehicle-management/refuels"
    },
    {
      "method": "POST",
      "path": "/vehicle-management/trips"
    },
    {
      "method": "POST",
      "path": "/vehicle-management/refuels"
    }
  ]
};

export default function FuelManagementScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
