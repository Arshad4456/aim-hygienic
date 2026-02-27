import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/distributor/receipts",
  "moduleKey": "distributor:receipts",
  "title": "Receipts",
  "endpoints": []
};

export default function ReceiptsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
