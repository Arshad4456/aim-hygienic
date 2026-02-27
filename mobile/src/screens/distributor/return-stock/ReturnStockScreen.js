import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/distributor/return-stock",
  "moduleKey": "distributor:return-stock",
  "title": "Return Stock",
  "endpoints": []
};

export default function ReturnStockScreen() {
  return <ModulePlaceholderScreen config={config} />;
}