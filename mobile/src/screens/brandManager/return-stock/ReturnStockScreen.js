import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/brandManager/return-stock",
  "moduleKey": "brandManager:return-stock",
  "title": "Return Stock",
  "endpoints": []
};

export default function ReturnStockScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
