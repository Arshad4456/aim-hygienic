import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/distributor/payments",
  "moduleKey": "distributor:payments",
  "title": "Payments",
  "endpoints": []
};

export default function PaymentsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}