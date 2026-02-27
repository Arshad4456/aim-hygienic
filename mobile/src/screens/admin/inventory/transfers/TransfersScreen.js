import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/inventory/transfers",
  "moduleKey": "admin:inventory/transfers",
  "title": "Transfers",
  "endpoints": [
    {
      "method": "GET",
      "path": "/products"
    },
    {
      "method": "GET",
      "path": "/warehouses"
    },
    {
      "method": "GET",
      "path": "/inventory/transfers"
    },
    {
      "method": "POST",
      "path": "/inventory/transfers"
    },
    {
      "method": "PUT",
      "path": "/inventory/transfers/${editId}"
    }
  ]
};

export default function TransfersScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
