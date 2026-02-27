import React from 'react';
import ModulePlaceholderScreen from '../../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/quality/final-release",
  "moduleKey": "admin:quality/final-release",
  "title": "Final Release",
  "endpoints": []
};

export default function FinalReleaseScreen() {
  return <ModulePlaceholderScreen config={config} />;
}