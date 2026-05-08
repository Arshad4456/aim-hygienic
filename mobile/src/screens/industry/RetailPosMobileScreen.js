import React from 'react';
import IndustryWorkspaceScreen from './IndustryWorkspaceScreen';

export default function RetailPosMobileScreen() {
  return (
    <IndustryWorkspaceScreen
      moduleKey="retailPos"
      title="Retail POS"
      subtitle="Cashier sessions, POS receipts, sales returns, and daily closing synced with Rawyan ERP."
      primaryLabel="Recent POS Sales"
      secondaryLabel="Cashier Sessions"
    />
  );
}
