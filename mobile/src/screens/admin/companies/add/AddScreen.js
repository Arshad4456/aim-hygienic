import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/companies/add",
  "moduleKey": "admin:companies/add",
  "title": "Add",
  "endpoints": [
    {
      "method": "POST",
      "path": "/companies"
    }
  ]
};

export default function AddScreen() {
  return <ModulePlaceholderScreen config={config} />;
}