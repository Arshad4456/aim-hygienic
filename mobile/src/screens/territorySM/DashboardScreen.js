import React from 'react';
import ModulePlaceholderScreen from '../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/territorySM",
  "moduleKey": "territorySM:dashboard",
  "title": "Dashboard",
  "endpoints": []
};

export default function DashboardScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
