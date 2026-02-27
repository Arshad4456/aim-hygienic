import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/account/manage",
  "moduleKey": "admin:account/manage",
  "title": "Manage",
  "endpoints": [
    {
      "method": "GET",
      "path": "/accounts"
    },
    {
      "method": "GET",
      "path": "/accounts/${id}"
    },
    {
      "method": "GET",
      "path": "/accounts/${id}/transactions"
    },
    {
      "method": "POST",
      "path": "/accounts"
    },
    {
      "method": "PUT",
      "path": "/accounts/${editModal.data._id}"
    },
    {
      "method": "PATCH",
      "path": "/accounts/${id}/deactivate"
    },
    {
      "method": "DELETE",
      "path": "/accounts/${id}"
    },
    {
      "method": "POST",
      "path": "/accounts/${selectedAccountId}/transactions"
    }
  ]
};

export default function ManageScreen() {
  return <ModulePlaceholderScreen config={config} />;
}