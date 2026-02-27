import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/quality/production",
  "moduleKey": "admin:quality/production",
  "title": "Production",
  "endpoints": []
};

export default function ProductionScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
