import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/reports",
  "moduleKey": "admin:reports",
  "title": "Reports",
  "endpoints": [
    {
      "method": "GET",
      "path": "/reports/overview"
    },
    {
      "method": "GET",
      "path": "/reports/builder?${query}"
    }
  ]
};

export default function ReportsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}