import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/distributor/primary-order-request",
  "moduleKey": "distributor:primary-order-request",
  "title": "Primary Order Request",
  "endpoints": []
};

export default function PrimaryOrderRequestScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
