import React from 'react';
import ModulePlaceholderScreen from '../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin",
  "moduleKey": "admin:dashboard",
  "title": "Dashboard",
  "endpoints": [
    {
      "method": "GET",
      "path": "/dashboard/overview"
    }
  ]
};

export default function DashboardScreen() {
  return <ModulePlaceholderScreen config={config} />;
}