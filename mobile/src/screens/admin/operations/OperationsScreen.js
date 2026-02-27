import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/operations",
  "moduleKey": "admin:operations",
  "title": "Operations",
  "endpoints": [
    {
      "method": "GET",
      "path": "/dashboard/operations"
    }
  ]
};

export default function OperationsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}