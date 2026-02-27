import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/hr",
  "moduleKey": "admin:hr",
  "title": "Hr",
  "endpoints": []
};

export default function HrScreen() {
  return <ModulePlaceholderScreen config={config} />;
}