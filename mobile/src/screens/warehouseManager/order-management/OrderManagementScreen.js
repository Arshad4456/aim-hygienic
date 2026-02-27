import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/warehouseManager/order-management",
  "moduleKey": "warehouseManager:order-management",
  "title": "Order Management",
  "endpoints": []
};

export default function OrderManagementScreen() {
  return <ModulePlaceholderScreen config={config} />;
}