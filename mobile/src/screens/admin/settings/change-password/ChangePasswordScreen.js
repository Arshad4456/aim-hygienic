import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/settings/change-password",
  "moduleKey": "admin:settings/change-password",
  "title": "Change Password",
  "endpoints": [
    {
      "method": "PUT",
      "path": "/users/change-password"
    }
  ]
};

export default function ChangePasswordScreen() {
  return <ModulePlaceholderScreen config={config} />;
}