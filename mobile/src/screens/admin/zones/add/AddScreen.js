import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/zones/add",
  "moduleKey": "admin:zones/add",
  "title": "Add",
  "endpoints": [
    {
      "method": "GET",
      "path": "/warehouses"
    },
    {
      "method": "GET",
      "path": "/regions"
    },
    {
      "method": "POST",
      "path": "/zones"
    }
  ]
};

export default function AddScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
