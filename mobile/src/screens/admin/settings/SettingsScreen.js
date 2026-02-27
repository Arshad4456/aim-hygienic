import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/settings",
  "moduleKey": "admin:settings",
  "title": "Settings",
  "endpoints": [
    {
      "method": "GET",
      "path": "/users/me"
    },
    {
      "method": "PUT",
      "path": "/users/me"
    }
  ]
};

export default function SettingsScreen() {
  return <ModulePlaceholderScreen config={config} />;
}