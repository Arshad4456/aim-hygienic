import React from 'react';
import ModulePlaceholderScreen from '../../common/ModulePlaceholderScreen';

const config = {
  "route": "/dashboards/distributor/messages",
  "moduleKey": "distributor:messages",
  "title": "Messages",
  "endpoints": []
};

export default function MessagesScreen() {
  return <ModulePlaceholderScreen config={config} />;
}