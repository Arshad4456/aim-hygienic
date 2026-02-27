import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/inventory/warehouses",
  "moduleKey": "admin:inventory/warehouses",
  "title": "Warehouses",
  "endpoints": [
    {
      "method": "GET",
      "path": "/warehouses"
    }
  ]
};

export default function WarehousesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}