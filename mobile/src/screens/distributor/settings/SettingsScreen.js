import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/distributor/settings",
  "moduleKey": "distributor:settings",
  "title": "Settings",
  "endpoints": []
};

export default function SettingsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
