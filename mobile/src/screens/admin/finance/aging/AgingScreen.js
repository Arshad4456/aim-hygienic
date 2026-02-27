import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/finance/aging",
  "moduleKey": "admin:finance/aging",
  "title": "Aging",
  "endpoints": [
    {
      "method": "GET",
      "path": "/orders?limit=500"
    },
    {
      "method": "GET",
      "path": "/receipts?status=approved"
    }
  ]
};

export default function AgingScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
