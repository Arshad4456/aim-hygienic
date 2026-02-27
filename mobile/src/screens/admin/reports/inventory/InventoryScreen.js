import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/reports/inventory",
  "moduleKey": "admin:reports/inventory",
  "title": "Inventory",
  "endpoints": [
    {
      "method": "GET",
      "path": "/reports/inventory"
    }
  ]
};

export default function InventoryScreen() {
  return <ModulePlaceholderScreen config={config} />;
}