import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/reports/compliance",
  "moduleKey": "admin:reports/compliance",
  "title": "Compliance",
  "endpoints": [
    {
      "method": "GET",
      "path": "/reports/compliance"
    }
  ]
};

export default function ComplianceScreen() {
  return <ModulePlaceholderScreen config={config} />;
}