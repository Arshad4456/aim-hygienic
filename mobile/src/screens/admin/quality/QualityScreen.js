import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/quality",
  "moduleKey": "admin:quality",
  "title": "Quality",
  "endpoints": []
};

export default function QualityScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
