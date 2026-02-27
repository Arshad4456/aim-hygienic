import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/warehouse-inventory",
  "moduleKey": "admin:warehouse-inventory",
  "title": "Warehouse Inventory",
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
      "path": "/users"
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
      "path": "/fields?limit=500"
    },
    {
      "method": "GET",
      "path": "/inventory/transactions"
    },
    {
      "method": "GET",
      "path": "/inventory/transfers"
    },
    {
      "method": "GET",
      "path": "/inventory/movements"
    },
    {
      "method": "GET",
      "path": "/inventory/summary"
    },
    {
      "method": "GET",
      "path": "/inventory/low-stock"
    },
    {
      "method": "GET",
      "path": "/inventory/near-expiry-products"
    },
    {
      "method": "POST",
      "path": "/inventory/transactions"
    },
    {
      "method": "POST",
      "path": "/inventory/transfers"
    },
    {
      "method": "PUT",
      "path": "/inventory/transfers/${transferId}"
    },
    {
      "method": "DELETE",
      "path": "/inventory/transfers/${transferId}"
    },
    {
      "method": "PUT",
      "path": "/inventory/transactions/${id}/mark-read"
    },
    {
      "method": "PUT",
      "path": "/inventory/transactions/${id}/request-status"
    },
    {
      "method": "DELETE",
      "path": "/inventory/transactions/${id}"
    },
    {
      "method": "PUT",
      "path": "/products/${productDbId}"
    }
  ]
};

export default function WarehouseInventoryScreen() {
  return <ModulePlaceholderScreen config={config} />;
}