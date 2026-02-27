import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/regions/add",
  "moduleKey": "admin:regions/add",
  "title": "Add",
  "endpoints": [
    {
      "method": "GET",
      "path": "/warehouses"
    },
    {
      "method": "POST",
      "path": "/regions"
    }
  ]
};

export default function AddScreen() {
  return <ModulePlaceholderScreen config={config} />;
}