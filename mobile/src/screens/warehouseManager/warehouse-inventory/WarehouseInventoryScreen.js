import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/warehouseManager/warehouse-inventory",
  "moduleKey": "warehouseManager:warehouse-inventory",
  "title": "Warehouse Inventory",
  "endpoints": []
};

export default function WarehouseInventoryScreen() {
  return <ModulePlaceholderScreen config={config} />;
}