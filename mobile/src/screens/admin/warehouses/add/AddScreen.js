import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/warehouses/add",
  "moduleKey": "admin:warehouses/add",
  "title": "Add",
  "endpoints": [
    {
      "method": "GET",
      "path": "/companies"
    },
    {
      "method": "POST",
      "path": "/warehouses"
    }
  ]
};

export default function AddScreen() {
  return <ModulePlaceholderScreen config={config} />;
}