import React from 'react';
import RuntimeDataModuleScreen from './_RuntimeDataModuleScreen';

export default function ExpenseManagementRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModuleScreen
      title="Expense Management"
      moduleItem={moduleItem}
      endpointMap={{
        daily: '/expenses?type=daily',
        personal: '/expenses?type=personal',
        distributor: '/expenses?type=distributor',
        claims: '/expenses',
      }}
    />
  );
}
