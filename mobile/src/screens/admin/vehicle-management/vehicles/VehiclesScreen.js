import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/vehicle-management/vehicles",
  "moduleKey": "admin:vehicle-management/vehicles",
  "title": "Vehicles",
  "endpoints": [
    {
      "method": "GET",
      "path": "/users"
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
      "path": "/vehicles/${id}/detail"
    },
    {
      "method": "DELETE",
      "path": "/vehicles/${id}"
    },
    {
      "method": "PUT",
      "path": "/vehicles/${editModal._id}"
    }
  ]
};

export default function VehiclesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}