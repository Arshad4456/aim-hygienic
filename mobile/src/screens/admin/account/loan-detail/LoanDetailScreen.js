import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/account/loan-detail",
  "moduleKey": "admin:account/loan-detail",
  "title": "Loan Detail",
  "endpoints": [
    {
      "method": "GET",
      "path": "/accounts"
    },
    {
      "method": "GET",
      "path": "/loans?loanType=${tab}"
    },
    {
      "method": "GET",
      "path": "/loans/summary"
    },
    {
      "method": "GET",
      "path": "/loans/${id}"
    },
    {
      "method": "POST",
      "path": "/loans"
    },
    {
      "method": "POST",
      "path": "/loans/${returnForm.loanId}/payments"
    }
  ]
};

export default function LoanDetailScreen() {
  return <ModulePlaceholderScreen config={config} />;
}