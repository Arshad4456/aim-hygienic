import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/expense",
  "moduleKey": "admin:expense",
  "title": "Expense",
  "endpoints": [
    {
      "method": "GET",
      "path": "/expenses"
    }
  ]
};

export default function ExpenseScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
