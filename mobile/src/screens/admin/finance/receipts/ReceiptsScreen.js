import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/finance/receipts",
  "moduleKey": "admin:finance/receipts",
  "title": "Receipts",
  "endpoints": [
    {
      "method": "POST",
      "path": "/receipts/${id}/approve"
    },
    {
      "method": "POST",
      "path": "/receipts/${rejecting._id}/reject"
    }
  ]
};

export default function ReceiptsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
