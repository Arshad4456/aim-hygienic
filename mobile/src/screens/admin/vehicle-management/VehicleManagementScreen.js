import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/vehicle-management",
  "moduleKey": "admin:vehicle-management",
  "title": "Vehicle Management",
  "endpoints": []
};

export default function VehicleManagementScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
