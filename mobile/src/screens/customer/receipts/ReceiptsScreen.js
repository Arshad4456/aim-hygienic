import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/customer/receipts",
  "moduleKey": "customer:receipts",
  "title": "Receipts",
  "endpoints": []
};

export default function ReceiptsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}