import React from 'react';
import RuntimeDataModuleScreen from './_RuntimeDataModuleScreen';

export default function HRRoleManagementRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModuleScreen
      title="HR & Role Management"
      moduleItem={moduleItem}
      endpointMap={{
        users: '/users',
        roles: '/platform-admin/role-templates',
        attendance: '/reports',
        policies: '/companies',
      }}
    />
  );
}
