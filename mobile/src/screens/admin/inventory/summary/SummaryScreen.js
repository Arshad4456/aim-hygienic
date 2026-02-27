import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/inventory/summary",
  "moduleKey": "admin:inventory/summary",
  "title": "Summary",
  "endpoints": [
    {
      "method": "GET",
      "path": "/inventory/summary${warehouseId ? "
    },
    {
      "method": "GET",
      "path": "/warehouses"
    },
    {
      "method": "GET",
      "path": "/products"
    }
  ]
};

export default function SummaryScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
