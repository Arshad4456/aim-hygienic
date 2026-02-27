import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/distributor/settings/change-password",
  "moduleKey": "distributor:settings/change-password",
  "title": "Change Password",
  "endpoints": []
};

export default function ChangePasswordScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
