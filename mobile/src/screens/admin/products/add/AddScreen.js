import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/products/add",
  "moduleKey": "admin:products/add",
  "title": "Add",
  "endpoints": [
    {
      "method": "GET",
      "path": "/companies"
    },
    {
      "method": "POST",
      "path": "/products"
    },
    {
      "method": "POST",
      "path": "/products/bulk-upsert"
    }
  ]
};

export default function AddScreen() {
  return <ModulePlaceholderScreen config={config} />;
}