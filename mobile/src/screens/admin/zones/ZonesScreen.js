import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/zones",
  "moduleKey": "admin:zones",
  "title": "Zones",
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
      "method": "PUT",
      "path": "/zones/${edit._id}"
    },
    {
      "method": "DELETE",
      "path": "/zones/${id}"
    }
  ]
};

export default function ZonesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}