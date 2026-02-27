import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/sales-kpi",
  "moduleKey": "admin:sales-kpi",
  "title": "Sales Kpi",
  "endpoints": [
    {
      "method": "GET",
      "path": "/sales-kpi/summary"
    }
  ]
};

export default function SalesKpiScreen() {
  return <ModulePlaceholderScreen config={config} />;
}