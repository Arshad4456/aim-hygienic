import React from 'react';
import ModulePlaceholderScreen from '../../../../../../common/shell/screens/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/order-management/approvals",
  "moduleKey": "admin:order-management/approvals",
  "title": "Approvals",
  "endpoints": [
    {
      "method": "GET",
      "path": "/orders/approvals"
    },
    {
      "method": "PATCH",
      "path": "/orders/${orderId}/status"
    }
  ]
};

export default function ApprovalsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}   