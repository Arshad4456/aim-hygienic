import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/order-management/returns",
  "moduleKey": "admin:order-management/returns",
  "title": "Returns",
  "endpoints": [
    {
      "method": "GET",
      "path": "/inventory/transactions?transactionType=RETURN_STOCK"
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
      "method": "POST",
      "path": "/inventory/transactions"
    }
  ]
};

export default function ReturnsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
