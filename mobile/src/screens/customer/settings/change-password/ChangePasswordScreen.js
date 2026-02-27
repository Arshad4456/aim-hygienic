import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/customer/settings/change-password",
  "moduleKey": "customer:settings/change-password",
  "title": "Change Password",
  "endpoints": []
};

export default function ChangePasswordScreen() {
  return <ModulePlaceholderScreen config={config} />;
}