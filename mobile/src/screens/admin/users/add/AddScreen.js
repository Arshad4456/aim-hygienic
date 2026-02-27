import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/users/add",
  "moduleKey": "admin:users/add",
  "title": "Add",
  "endpoints": [
    {
      "method": "GET",
      "path": "/users"
    },
    {
      "method": "GET",
      "path": "/warehouses"
    },
    {
      "method": "GET",
      "path": "/regions"
    },
    {
      "method": "GET",
      "path": "/zones"
    },
    {
      "method": "GET",
      "path": "/areas"
    },
    {
      "method": "GET",
      "path": "/fields"
    },
    {
      "method": "POST",
      "path": "/users"
    }
  ]
};

export default function AddScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
