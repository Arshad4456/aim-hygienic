import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/products/barcodes",
  "moduleKey": "admin:products/barcodes",
  "title": "Barcodes",
  "endpoints": [
    {
      "method": "GET",
      "path": "/products/barcodes"
    }
  ]
};

export default function BarcodesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
