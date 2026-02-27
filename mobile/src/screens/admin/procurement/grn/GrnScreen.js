import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/procurement/grn",
  "moduleKey": "admin:procurement/grn",
  "title": "Grn",
  "endpoints": [
    {
      "method": "GET",
      "path": "/inventory/movements?movementType=PURCHASE_IN"
    }
  ]
};

export default function GrnScreen() {
  return <ModulePlaceholderScreen config={config} />;
}