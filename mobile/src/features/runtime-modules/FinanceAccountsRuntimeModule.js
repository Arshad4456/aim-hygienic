import React from 'react';
import RuntimeDataModuleScreen from './_RuntimeDataModuleScreen';

export default function FinanceAccountsRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModuleScreen
      title="Finance & Accounts"
      moduleItem={moduleItem}
      endpointMap={{
        invoices: '/reports?type=invoices',
        receipts: '/receipts',
        aging: '/reports?type=aging',
        payments: '/payments',
      }}
    />
  );
}