import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/vehicle-management/add",
  "moduleKey": "admin:vehicle-management/add",
  "title": "Add",
  "endpoints": []
};

export default function AddScreen() {
  return <ModulePlaceholderScreen config={config} />;
}