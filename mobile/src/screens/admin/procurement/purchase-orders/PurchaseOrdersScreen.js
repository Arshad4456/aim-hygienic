import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/procurement/purchase-orders",
  "moduleKey": "admin:procurement/purchase-orders",
  "title": "Purchase Orders",
  "endpoints": [
    {
      "method": "GET",
      "path": "/inventory/movements?movementType=PURCHASE_IN"
    },
    {
      "method": "GET",
      "path": "/warehouses"
    }
  ]
};

export default function PurchaseOrdersScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
