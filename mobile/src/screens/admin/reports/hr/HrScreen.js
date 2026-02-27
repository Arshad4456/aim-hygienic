import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/reports/hr",
  "moduleKey": "admin:reports/hr",
  "title": "Hr",
  "endpoints": [
    {
      "method": "GET",
      "path": "/reports/hr"
    }
  ]
};

export default function HrScreen() {
  return <ModulePlaceholderScreen config={config} />;
}