import React from 'react';
import { DistributorPaymentsModule } from '../PaymentsScreen';

export default function PrimaryScreen() {
  return (
    <DistributorPaymentsModule
      mode="primary"
      title="Primary Payments (Received)"
      subtitle="View warehouse-to-distributor invoices, balances, and deadline alerts."
    />
  );
}