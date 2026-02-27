import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/reports/sales",
  "moduleKey": "admin:reports/sales",
  "title": "Sales",
  "endpoints": [
    {
      "method": "GET",
      "path": "/reports/sales"
    }
  ]
};

export default function SalesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
