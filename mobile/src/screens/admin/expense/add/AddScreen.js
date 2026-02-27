import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/expense/add",
  "moduleKey": "admin:expense/add",
  "title": "Add",
  "endpoints": [
    {
      "method": "POST",
      "path": "/expenses"
    }
  ]
};

export default function AddScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
