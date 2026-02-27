import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/distributor/payments/primary",
  "moduleKey": "distributor:payments/primary",
  "title": "Primary",
  "endpoints": []
};

export default function PrimaryScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
