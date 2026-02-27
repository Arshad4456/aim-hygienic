import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/orderBooker/receipts",
  "moduleKey": "orderBooker:receipts",
  "title": "Receipts",
  "endpoints": []
};

export default function ReceiptsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
