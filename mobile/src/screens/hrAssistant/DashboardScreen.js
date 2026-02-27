import React from 'react';
import ModulePlaceholderScreen from '../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/hrAssistant",
  "moduleKey": "hrAssistant:dashboard",
  "title": "Dashboard",
  "endpoints": []
};

export default function DashboardScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
