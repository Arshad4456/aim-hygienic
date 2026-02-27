import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/warehouses",
  "moduleKey": "admin:warehouses",
  "title": "Warehouses",
  "endpoints": [
    {
      "method": "GET",
      "path": "/warehouses"
    },
    {
      "method": "DELETE",
      "path": "/warehouses/${id}"
    },
    {
      "method": "PUT",
      "path": "/warehouses/${edit._id}"
    }
  ]
};

export default function WarehousesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
