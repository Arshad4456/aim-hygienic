import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/warehouseManager/payments/secondary",
  "moduleKey": "warehouseManager:payments/secondary",
  "title": "Secondary",
  "endpoints": []
};

export default function SecondaryScreen() {
  return <ModulePlaceholderScreen config={config} />;
}