import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/order-management/sales-orders",
  "moduleKey": "admin:order-management/sales-orders",
  "title": "Sales Orders",
  "endpoints": []
};

export default function SalesOrdersScreen() {
  return <ModulePlaceholderScreen config={config} />;
}