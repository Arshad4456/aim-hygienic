import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/reports/logistics",
  "moduleKey": "admin:reports/logistics",
  "title": "Logistics",
  "endpoints": [
    {
      "method": "GET",
      "path": "/reports/logistics"
    }
  ]
};

export default function LogisticsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}