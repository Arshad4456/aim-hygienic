import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/brandManager/settings",
  "moduleKey": "brandManager:settings",
  "title": "Settings",
  "endpoints": []
};

export default function SettingsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}