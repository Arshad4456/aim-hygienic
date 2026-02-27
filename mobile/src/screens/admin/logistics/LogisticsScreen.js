import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/logistics",
  "moduleKey": "admin:logistics",
  "title": "Logistics",
  "endpoints": [
    {
      "method": "GET",
      "path": "/reports/logistics"
    },
    {
      "method": "GET",
      "path": "/orders/dispatch"
    }
  ]
};

export default function LogisticsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
