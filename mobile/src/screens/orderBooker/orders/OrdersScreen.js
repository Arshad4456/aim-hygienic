import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/orderBooker/orders",
  "moduleKey": "orderBooker:orders",
  "title": "Orders",
  "endpoints": []
};

export default function OrdersScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
