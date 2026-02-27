import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/products",
  "moduleKey": "admin:products",
  "title": "Products",
  "endpoints": [
    {
      "method": "GET",
      "path": "/companies"
    },
    {
      "method": "GET",
      "path": "/products"
    },
    {
      "method": "DELETE",
      "path": "/products/${id}"
    },
    {
      "method": "PUT",
      "path": "/products/${editId}"
    }
  ]
};

export default function ProductsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}