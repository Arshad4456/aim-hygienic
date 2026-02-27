import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/quality/raw-material",
  "moduleKey": "admin:quality/raw-material",
  "title": "Raw Material",
  "endpoints": []
};

export default function RawMaterialScreen() {
  return <ModulePlaceholderScreen config={config} />;
}