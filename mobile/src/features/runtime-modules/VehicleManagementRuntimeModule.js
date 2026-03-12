import React from 'react';
import RuntimeDataModuleScreen from './_RuntimeDataModuleScreen';

export default function VehicleManagementRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModuleScreen
      title="Vehicle Management"
      moduleItem={moduleItem}
      endpointMap={{
        fleet: '/vehicles',
        trips: '/vehicle-management/trips',
        maintenance: '/vehicle-management/maintenance',
      }}
    />
  );
}