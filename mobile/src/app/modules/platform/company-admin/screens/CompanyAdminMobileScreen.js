import React from 'react';
import IndustryWorkspaceScreen from './IndustryWorkspaceScreen';

export default function CompanyAdminMobileScreen() {
  return (
    <IndustryWorkspaceScreen
      moduleKey="companyAdmin"
      title="Company Control"
      subtitle="Company-scoped dashboard for users, products, customers, inventory, finance, and enabled ERP modules."
      primaryLabel="Products"
      secondaryLabel="Customers"
    />
  );
}
