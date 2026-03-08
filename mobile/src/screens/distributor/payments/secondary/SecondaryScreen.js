import React from 'react';
import { DistributorPaymentsModule } from '../PaymentsScreen';

export default function SecondaryScreen() {
  return (
    <DistributorPaymentsModule
      mode="secondary"
      title="Secondary Payments (Paid Back)"
      subtitle="Review all your settlement payments made against warehouse invoices."
    />
  );
}
