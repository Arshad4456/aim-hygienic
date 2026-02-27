import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/expense/daily",
  "moduleKey": "admin:expense/daily",
  "title": "Daily",
  "endpoints": [
    {
      "method": "GET",
      "path": "/expenses?section=daily"
    },
    {
      "method": "GET",
      "path": "/users"
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

export default function DailyScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
