import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/salesman/orders",
  "moduleKey": "salesman:orders",
  "title": "Orders",
  "endpoints": []
};

export default function OrdersScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
