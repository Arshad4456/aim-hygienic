import React from 'react';
import IndustryWorkspaceScreen from './IndustryWorkspaceScreen';

export default function ServiceMobileScreen() {
  return (
    <IndustryWorkspaceScreen
      moduleKey="service"
      title="Service ERP"
      subtitle="Tickets, technician assignments, service orders, AMC contracts, spare parts, and service proof."
      primaryLabel="Service Tickets"
      secondaryLabel="Service Orders"
    />
  );
}
