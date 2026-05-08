import React from 'react';
import IndustryWorkspaceScreen from './IndustryWorkspaceScreen';

export default function ManufacturingMobileScreen() {
  return (
    <IndustryWorkspaceScreen
      moduleKey="manufacturing"
      title="Manufacturing"
      subtitle="BOM, production orders, raw material issue, finished goods receiving, quality checks, and maintenance visibility."
      primaryLabel="Production Orders"
      secondaryLabel="Bill of Materials"
    />
  );
}
