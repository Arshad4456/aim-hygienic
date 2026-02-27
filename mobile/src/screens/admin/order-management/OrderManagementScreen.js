import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/order-management",
  "moduleKey": "admin:order-management",
  "title": "Order Management",
  "endpoints": [
    {
      "method": "GET",
      "path": "/orders"
    },
    {
      "method": "GET",
      "path": "/inventory/transactions"
    },
    {
      "method": "GET",
      "path": "/warehouses"
    },
    {
      "method": "GET",
      "path": "/products"
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
      "path": "/users"
    },
    {
      "method": "GET",
      "path": "/fields?limit=500"
    },
    {
      "method": "POST",
      "path": "/inventory/transactions"
    },
    {
      "method": "POST",
      "path": "/orders"
    },
    {
      "method": "DELETE",
      "path": "/inventory/transactions/${orderId}"
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
      "method": "PATCH",
      "path": "/orders/${id}/mark-read"
    },
    {
      "method": "PATCH",
      "path": "/orders/${id}/status"
    },
    {
      "method": "PUT",
      "path": "/inventory/transactions/${row._id}"
    }
  ]
};

export default function OrderManagementScreen() {
  return <ModulePlaceholderScreen config={config} />;
}