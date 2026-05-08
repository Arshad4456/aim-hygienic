import React from 'react';
import IndustryWorkspaceScreen from '../industry/IndustryWorkspaceScreen';

export default function SystemAdminMobileScreen() {
  return (
    <IndustryWorkspaceScreen
      moduleKey="systemAdmin"
      title="SaaS System Admin"
      subtitle="Manage Rawyan ERP client companies, subscriptions, module controls, and platform readiness from mobile."
      primaryLabel="Client Companies"
      secondaryLabel="Module Controls"
    />
  );
}
