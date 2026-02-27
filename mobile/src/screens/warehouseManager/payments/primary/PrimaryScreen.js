import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/warehouseManager/payments/primary",
  "moduleKey": "warehouseManager:payments/primary",
  "title": "Primary",
  "endpoints": []
};

export default function PrimaryScreen() {
  return <ModulePlaceholderScreen config={config} />;
}