import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/areas",
  "moduleKey": "admin:areas",
  "title": "Areas",
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
      "method": "GET",
      "path": "/zones"
    },
    {
      "method": "PUT",
      "path": "/areas/${edit._id}"
    },
    {
      "method": "DELETE",
      "path": "/areas/${id}"
    }
  ]
};

export default function AreasScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
