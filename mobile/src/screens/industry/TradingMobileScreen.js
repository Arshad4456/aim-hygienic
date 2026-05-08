import React from 'react';
import IndustryWorkspaceScreen from './IndustryWorkspaceScreen';

export default function TradingMobileScreen() {
  return (
    <IndustryWorkspaceScreen
      moduleKey="trading"
      title="Trading / Import"
      subtitle="Shipments, containers, LC records, landed costs, stock receiving, and import/export status."
      primaryLabel="Shipments"
      secondaryLabel="Letters of Credit"
    />
  );
}
