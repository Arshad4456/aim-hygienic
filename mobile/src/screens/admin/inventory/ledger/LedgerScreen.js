import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/inventory/ledger",
  "moduleKey": "admin:inventory/ledger",
  "title": "Ledger",
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
      "path": "/regions"
    },
    {
      "method": "GET",
      "path": "/zones"
    },
    {
      "method": "GET",
      "path": "/areas"
    },
    {
      "method": "GET",
      "path": "/inventory/movements"
    },
    {
      "method": "POST",
      "path": "/inventory/movements"
    },
    {
      "method": "PUT",
      "path": "/inventory/movements/${editId}"
    },
    {
      "method": "DELETE",
      "path": "/inventory/movements/clear"
    }
  ]
};

export default function LedgerScreen() {
  return <ModulePlaceholderScreen config={config} />;
}