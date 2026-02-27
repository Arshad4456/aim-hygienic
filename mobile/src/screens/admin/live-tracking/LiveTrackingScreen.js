import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/live-tracking",
  "moduleKey": "admin:live-tracking",
  "title": "Live Tracking",
  "endpoints": [
    {
      "method": "GET",
      "path": "/live-tracking/summary"
    },
    {
      "method": "GET",
      "path": "/live-tracking/users"
    },
    {
      "method": "GET",
      "path": "/live-tracking/vehicles"
    },
    {
      "method": "GET",
      "path": "/live-tracking/dispatches"
    }
  ]
};

export default function LiveTrackingScreen() {
  return <ModulePlaceholderScreen config={config} />;
}