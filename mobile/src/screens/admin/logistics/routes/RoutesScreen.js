import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/logistics/routes",
  "moduleKey": "admin:logistics/routes",
  "title": "Routes",
  "endpoints": [
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
      "path": "/vehicles"
    },
    {
      "method": "GET",
      "path": "/orders/dispatch"
    }
  ]
};

export default function RoutesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}