import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/distributor/expense",
  "moduleKey": "distributor:expense",
  "title": "Expense",
  "endpoints": [
    {
      "method": "GET",
      "path": "/users/me"
    },
    {
      "method": "GET",
      "path": "/expenses?section=distributor"
    },
    {
      "method": "POST",
      "path": "/expenses"
    }
  ]
};

export default function ExpenseScreen() {
  return <ModulePlaceholderScreen config={config} />;
}