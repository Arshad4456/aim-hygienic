import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/quality/finished-goods",
  "moduleKey": "admin:quality/finished-goods",
  "title": "Finished Goods",
  "endpoints": []
};

export default function FinishedGoodsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}