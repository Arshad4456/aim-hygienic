import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/admin/messages",
  "moduleKey": "admin:messages",
  "title": "Messages",
  "endpoints": [
    {
      "method": "GET",
      "path": "/messages"
    }
  ]
};

export default function MessagesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}
