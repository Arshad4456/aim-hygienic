import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/users",
  "moduleKey": "admin:users",
  "title": "Users",
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
      "method": "DELETE",
      "path": "/users/${id}"
    },
    {
      "method": "PUT",
      "path": "/users/${editUser._id}"
    }
  ]
};

export default function UsersScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
