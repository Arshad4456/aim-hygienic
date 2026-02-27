import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/finance/invoices",
  "moduleKey": "admin:finance/invoices",
  "title": "Invoices",
  "endpoints": [
    {
      "method": "GET",
      "path": "/orders?limit=200"
    }
  ]
};

export default function InvoicesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
