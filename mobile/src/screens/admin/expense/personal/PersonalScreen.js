import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/expense/personal",
  "moduleKey": "admin:expense/personal",
  "title": "Personal",
  "endpoints": [
    {
      "method": "GET",
      "path": "/expenses?section=personal"
    },
    {
      "method": "GET",
      "path": "/accounts"
    },
    {
      "method": "POST",
      "path": "/expenses"
    },
    {
      "method": "DELETE",
      "path": "/expenses/${id}"
    }
  ]
};

export default function PersonalScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
