import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/finance",
  "moduleKey": "admin:finance",
  "title": "Finance",
  "endpoints": [
    {
      "method": "GET",
      "path": "/reports/finance"
    }
  ]
};

export default function FinanceScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
