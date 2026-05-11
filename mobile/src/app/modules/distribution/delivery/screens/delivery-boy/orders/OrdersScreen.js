import React from 'react';
import ModulePlaceholderScreen from '../../../../../common/shell/screens/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/deliveryBoy/orders",
  "moduleKey": "deliveryBoy:orders",
  "title": "Orders",
  "endpoints": []
};

export default function OrdersScreen() {
  return <ModulePlaceholderScreen config={config} />;
}