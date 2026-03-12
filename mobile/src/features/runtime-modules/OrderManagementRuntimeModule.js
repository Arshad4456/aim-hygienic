import React from 'react';
import RuntimeDataModuleScreen from './_RuntimeDataModuleScreen';

export default function OrderManagementRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModuleScreen
      title="Order Management"
      moduleItem={moduleItem}
      endpointMap={{
        primary_orders: '/orders',
        secondary_orders: '/orders',
        approvals: '/orders/pending',
        dispatch: '/orders/approved',
        returns: '/returns',
      }}
    />
  );
}
