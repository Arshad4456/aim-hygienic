import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/vehicle-management/maintenance",
  "moduleKey": "admin:vehicle-management/maintenance",
  "title": "Maintenance",
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
      "path": "/vehicle-management/maintenance"
    },
    {
      "method": "POST",
      "path": "/vehicle-management/maintenance"
    }
  ]
};

export default function MaintenanceScreen() {
  return <ModulePlaceholderScreen config={config} />;
}