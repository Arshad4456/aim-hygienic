import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/procurement",
  "moduleKey": "admin:procurement",
  "title": "Procurement",
  "endpoints": [
    {
      "method": "GET",
      "path": "/reports/procurement"
    }
  ]
};

export default function ProcurementScreen() {
  return <ModulePlaceholderScreen config={config} />;
}