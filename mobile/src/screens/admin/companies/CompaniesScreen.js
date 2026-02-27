import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/companies",
  "moduleKey": "admin:companies",
  "title": "Companies",
  "endpoints": [
    {
      "method": "GET",
      "path": "/companies"
    },
    {
      "method": "GET",
      "path": "/companies/${id}"
    },
    {
      "method": "PUT",
      "path": "/companies/${id}"
    }
  ]
};

export default function CompaniesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}