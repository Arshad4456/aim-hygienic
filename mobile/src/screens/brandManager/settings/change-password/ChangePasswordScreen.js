import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/brandManager/settings/change-password",
  "moduleKey": "brandManager:settings/change-password",
  "title": "Change Password",
  "endpoints": []
};

export default function ChangePasswordScreen() {
  return <ModulePlaceholderScreen config={config} />;
}