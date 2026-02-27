import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/expense/distributor",
  "moduleKey": "admin:expense/distributor",
  "title": "Distributor",
  "endpoints": [
    {
      "method": "GET",
      "path": "/expenses?section=distributor"
    },
    {
      "method": "GET",
      "path": "/accounts"
    },
    {
      "method": "GET",
      "path": "/users"
    },
    {
      "method": "POST",
      "path": "/expenses"
    },
    {
      "method": "DELETE",
      "path": "/expenses/${id}"
    },
    {
      "method": "PUT",
      "path": "/expenses/${row._id}"
    }
  ]
};

export default function DistributorScreen() {
  return <ModulePlaceholderScreen config={config} />;
}