import React from 'react';
import RuntimeDataModuleScreen from './_RuntimeDataModuleScreen';

export default function PaymentManagementRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModuleScreen
      title="Payment Management"
      moduleItem={moduleItem}
      endpointMap={{
        primary: '/payments/primary',
        secondary: '/payments/secondary',
        payments: '/payments',
      }}
    />
  );
}
