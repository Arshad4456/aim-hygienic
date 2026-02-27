import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/distributor/payments/secondary",
  "moduleKey": "distributor:payments/secondary",
  "title": "Secondary",
  "endpoints": []
};

export default function SecondaryScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
