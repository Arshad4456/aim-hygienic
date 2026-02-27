import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/assets/vehicles",
  "moduleKey": "admin:assets/vehicles",
  "title": "Vehicles",
  "endpoints": []
};

export default function VehiclesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
