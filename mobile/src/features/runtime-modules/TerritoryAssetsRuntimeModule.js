import React from 'react';
import RuntimeDataModuleScreen from './_RuntimeDataModuleScreen';

export default function TerritoryAssetsRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModuleScreen
      title="Territory & Assets"
      moduleItem={moduleItem}
      endpointMap={{
        regions: '/regions',
        zones: '/zones',
        territories: '/areas',
        fields: '/fields',
        vehicles: '/vehicles',
        assets: '/vehicles',
      }}
    />
  );
}