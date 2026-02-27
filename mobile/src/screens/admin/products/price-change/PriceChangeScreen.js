import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/products/price-change",
  "moduleKey": "admin:products/price-change",
  "title": "Price Change",
  "endpoints": [
    {
      "method": "GET",
      "path": "/products"
    },
    {
      "method": "PUT",
      "path": "/products/${editId}"
    }
  ]
};

export default function PriceChangeScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
