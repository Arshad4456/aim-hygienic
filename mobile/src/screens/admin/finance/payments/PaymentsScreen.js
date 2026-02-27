import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/finance/payments",
  "moduleKey": "admin:finance/payments",
  "title": "Payments",
  "endpoints": [
    {
      "method": "GET",
      "path": "/payments/masters"
    },
    {
      "method": "GET",
      "path": "/payments/primary"
    },
    {
      "method": "GET",
      "path": "/payments/secondary"
    },
    {
      "method": "POST",
      "path": "/payments/primary"
    },
    {
      "method": "POST",
      "path": "/payments/secondary"
    },
    {
      "method": "DELETE",
      "path": "/payments/primary/${id}"
    },
    {
      "method": "DELETE",
      "path": "/payments/secondary/${id}"
    },
    {
      "method": "GET",
      "path": "/payments/primary/${invoiceNo}"
    }
  ]
};

export default function PaymentsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}