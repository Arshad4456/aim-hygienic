import React from 'react';
import ModulePlaceholderScreen from '../../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/assets/vehicles/add",
  "moduleKey": "admin:assets/vehicles/add",
  "title": "Add",
  "endpoints": []
};

export default function AddScreen() {
  return <ModulePlaceholderScreen config={config} />;
}