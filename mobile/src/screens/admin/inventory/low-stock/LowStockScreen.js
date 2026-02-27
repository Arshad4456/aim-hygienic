import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/inventory/low-stock",
  "moduleKey": "admin:inventory/low-stock",
  "title": "Low Stock",
  "endpoints": [
    {
      "method": "GET",
      "path": "/inventory/low-stock"
    },
    {
      "method": "PUT",
      "path": "/products/${editId}"
    }
  ]
};

export default function LowStockScreen() {
  return <ModulePlaceholderScreen config={config} />;
}