import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/fields",
  "moduleKey": "admin:fields",
  "title": "Fields",
  "endpoints": [
    {
      "method": "GET",
      "path": "/fields"
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
      "method": "PUT",
      "path": "/fields/:id"
    },
    {
      "method": "DELETE",
      "path": "/fields/:id"
    }
  ]
};

export default function FieldsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
