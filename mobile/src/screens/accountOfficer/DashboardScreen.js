import React from 'react';
import ModulePlaceholderScreen from '../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/accountOfficer",
  "moduleKey": "accountOfficer:dashboard",
  "title": "Dashboard",
  "endpoints": []
};

export default function DashboardScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
