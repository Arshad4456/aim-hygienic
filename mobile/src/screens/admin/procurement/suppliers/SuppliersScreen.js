import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/procurement/suppliers",
  "moduleKey": "admin:procurement/suppliers",
  "title": "Suppliers",
  "endpoints": [
    {
      "method": "GET",
      "path": "/users?role=Supplier"
    }
  ]
};

export default function SuppliersScreen() {
  return <ModulePlaceholderScreen config={config} />;
}