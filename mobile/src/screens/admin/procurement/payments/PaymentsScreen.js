import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/procurement/payments",
  "moduleKey": "admin:procurement/payments",
  "title": "Payments",
  "endpoints": [
    {
      "method": "GET",
      "path": "/expenses"
    }
  ]
};

export default function PaymentsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
