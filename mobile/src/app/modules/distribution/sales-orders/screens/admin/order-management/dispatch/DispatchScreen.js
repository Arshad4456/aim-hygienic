import React from 'react';
import ModulePlaceholderScreen from '../../../../../../common/shell/screens/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/order-management/dispatch",
  "moduleKey": "admin:order-management/dispatch",
  "title": "Dispatch",
  "endpoints": [
    {
      "method": "GET",
      "path": "/orders/dispatch"
    },
    {
      "method": "GET",
      "path": "/vehicles"
    },
    {
      "method": "GET",
      "path": "/users"
    },
    {
      "method": "PATCH",
      "path": "/orders/${orderId}/status"
    }
  ]
};

export default function DispatchScreen() {
  return <ModulePlaceholderScreen config={config} />;
}