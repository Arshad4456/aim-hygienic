import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/regions",
  "moduleKey": "admin:regions",
  "title": "Regions",
  "endpoints": [
    {
      "method": "GET",
      "path": "/warehouses"
    },
    {
      "method": "PUT",
      "path": "/regions/${edit._id}"
    },
    {
      "method": "DELETE",
      "path": "/regions/${id}"
    }
  ]
};

export default function RegionsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}